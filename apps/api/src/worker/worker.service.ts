import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { LoggerService } from '../common/logger/logger.service';
import { GlobalVarsService } from '../global-vars/global-vars.service';
import { ConditionEvaluator } from './condition-evaluator';
import { VariableEngine } from '../../../../packages/shared-xform/variable_engine';
import { WorkflowsService } from '../workflows/workflows.service';

@Injectable()
export class WorkerService {
    constructor(
        private prisma: PrismaService,
        private logger: LoggerService,
        private globalVarsService: GlobalVarsService,
        private conditionEvaluator: ConditionEvaluator,
        @Inject(forwardRef(() => WorkflowsService))
        private workflowsService: WorkflowsService
    ) {
        this.logger.setContext(WorkerService.name);
    }

    async getNextPendingTask(hostname: string, tags: string[] = []) {
        // Fetch worker fresh from DB to get authoritative tags
        const worker = await this.prisma.worker.findUnique({ where: { hostname } });
        if (!worker || worker.status === 'DISABLED') return null;

        // DEBUG: Trace polling logic
        this.logger.debug(`Hostname: ${hostname} DB Tags: ${worker?.tags} Arg Tags: ${tags} Polling...`);

        // 1. Priority: Find a task targeted specifically to this worker or its tags
        try {
            // Find PENDING tasks that EITHER:
            // - Targeted to this specific worker ID
            // - Targeted to tags that this worker HAS
            // - Targeted to NO worker and NO tags (Global)
            const potentialTasks = await this.prisma.taskExecution.findMany({
                where: {
                    status: 'PENDING',
                    OR: [
                        { targetWorkerId: worker.id },
                        { targetWorkerId: null, targetTags: { isEmpty: true } },
                        { targetTags: { hasSome: worker.tags } }
                    ]
                },
                include: { task: true },
                orderBy: { startedAt: 'asc' }, // FIFO
                take: 5
            });

            // Filtering for safety: Even if targetWorkerId matches, if it has targetTags, the worker MUST satisfy those tags.
            const task = potentialTasks.find(t => {
                // If the task has no tags, it's a match (if it passed the OR filter)
                if (!t.targetTags || t.targetTags.length === 0) return true;
                
                // If the task HAS tags, this worker MUST have at least one of them
                return t.targetTags.some(tag => worker.tags.includes(tag));
            });

            if (task) {
                this.logger.log(`Worker ${hostname} picked up execution ${task.id} (Target: ${task.targetWorkerId || 'Global'}, Tags: ${task.targetTags})`);
                
                // Fetch context variables
                const globalVars = await this.globalVarsService.findAllResolved();
                
                let workflowVars = {};
                let macros = {};

                if (task.workflowExecutionId) {
                    // Optimized: check if orchestration already stored vars in the input
                    const input = (task.input as any) || {};
                    if (input.workflowVars) {
                        workflowVars = input.workflowVars;
                        const ctx = await this.gatherWorkflowContext(task.workflowExecutionId);
                        macros = ctx.macros; // Still need macro resolution
                    } else {
                        const ctx = await this.gatherWorkflowContext(task.workflowExecutionId);
                        workflowVars = ctx.workflowVars;
                        macros = ctx.macros;
                    }
                }

                // Return enriched object
                return {
                    execution: task,
                    globalVars,
                    workflowVars,
                    macros
                };
            } else {
                this.logger.debug(`[Debug] Worker ${hostname} checked ${potentialTasks.length} potential tasks but none matched strictly.`);
                return null;
            }
        } catch (e) {
            this.logger.error(`Failed to poll for tasks: ${e.message}`, e.stack);
            throw e;
        }
    }

    async register(data: { hostname: string; ipAddress?: string; name?: string; tags?: string[] }) {
        const existing = await this.prisma.worker.findUnique({ where: { hostname: data.hostname } });
        
        return this.prisma.worker.upsert({
            where: { hostname: data.hostname },
            update: {
                ipAddress: data.ipAddress,
                status: 'ONLINE',
                lastSeen: new Date(),
                // DO NOT update tags here if they already exist, to preserve Admin UI settings
                tags: existing ? existing.tags : (data.tags || []),
            },
            create: {
                hostname: data.hostname,
                ipAddress: data.ipAddress,
                name: data.name || data.hostname,
                status: 'ONLINE',
                tags: data.tags || [],
            },
        });
    }

    async heartbeat(hostname: string) {
        return this.prisma.worker.upsert({
            where: { hostname },
            update: {
                lastSeen: new Date(),
                status: 'ONLINE'
            },
            create: {
                hostname,
                status: 'ONLINE',
                lastSeen: new Date(),
                tags: [], // Assume no tags until full registration
            }
        });
    }

    async gatherWorkflowContext(workflowExecutionId: string) {
        this.logger.debug(`[Context] Gathering context for execution ${workflowExecutionId}`);
        // 1. Fetch the execution and its base workflow definition for initial variable state
        const execution = await this.prisma.workflowExecution.findUnique({
            where: { id: workflowExecutionId },
            include: { workflow: true }
        });

        if (!execution) {
            this.logger.warn(`[Context] WorkflowExecution ${workflowExecutionId} not found`);
            return { workflowVars: {}, macros: {} };
        }

        const records = await this.prisma.taskExecution.findMany({
            where: { workflowExecutionId },
            include: { task: true },
            orderBy: { startedAt: 'asc' }
        });

        const workflowVars: Record<string, any> = {};
        const macros: Record<string, any> = {};

        if (execution?.workflow) {
            const wf = execution.workflow;
            const inputDefs = (typeof wf.inputVariables === 'string' ? JSON.parse(wf.inputVariables) : wf.inputVariables) || {};
            const outputDefs = (typeof wf.outputVariables === 'string' ? JSON.parse(wf.outputVariables) : wf.outputVariables) || {};
            
            // 1. Initialize with Admin defaults (both inputs and outputs)
            const allDefs = { ...inputDefs, ...outputDefs };
            Object.entries(allDefs).forEach(([k, v]: [string, any]) => {
                if (!k.startsWith('__')) {
                    if (v && typeof v === 'object') {
                        if (v.hasOwnProperty('value')) {
                            workflowVars[k] = v.value;
                        } else if (v.valueMode) {
                            // It's a configuration definition, not a literal JSON object value
                            workflowVars[k] = '';
                        } else {
                            // Literal JSON object
                            workflowVars[k] = v;
                        }
                    } else {
                        workflowVars[k] = v;
                    }
                }
            });
            this.logger.debug(`[Context] Initialized ${Object.keys(workflowVars).length} baseline variables from CWF '${wf.name}' definition`);

            // 2. Resolve Input variables provided by initial metadata (for triggered workflows)
            const taskExecData = execution.taskExecutions as any;
            if (taskExecData && taskExecData.initialVariables) {
                const engine = new VariableEngine({
                    global: {}, // Will be resolved if needed recursively
                    workflow: workflowVars,
                    macros: {}
                });
                Object.entries(taskExecData.initialVariables).forEach(([k, v]: [string, any]) => {
                    workflowVars[k] = engine.resolveValue(v, k);
                });
                this.logger.log(`[Context] Overlaid and resolved ${Object.keys(taskExecData.initialVariables).length} variables from initial execution metadata`);
            }

            // 3. Resolve Input variables provided by parent if this is a sub-workflow
            if ((execution as any).parentTaskExecutionId) {
                const parentExec = await this.prisma.taskExecution.findUnique({
                    where: { id: (execution as any).parentTaskExecutionId }
                });
                if (parentExec?.input) {
                    const input = typeof parentExec.input === 'string' ? JSON.parse(parentExec.input) : parentExec.input;
                    const resolvedInput = input.resolvedInput || input.inputMapping;
                    if (resolvedInput) {
                        const resolvedObj = typeof resolvedInput === 'string' ? JSON.parse(resolvedInput) : resolvedInput;
                        Object.assign(workflowVars, resolvedObj);
                        this.logger.debug(`[Context] Overlaid ${Object.keys(resolvedObj).length} resolved inputs from parent task`);
                    }
                }
            }
        }

        for (const record of records) {
            const taskName = record.task?.name || record.nodeId || 'task';
            let result = record.result as any;
            if (!result) continue;

            // Robust JSON parsing for result
            if (typeof result === 'string') {
                try {
                    result = JSON.parse(result);
                } catch (e) {
                    this.logger.debug(`[Context] Failed to parse result for task ${taskName}`);
                    continue;
                }
            }

            // 3. Resolve variables from task completions in this execution
            if (result.variables) {
                const vars = (typeof result.variables === 'string') ? JSON.parse(result.variables) : result.variables;
                Object.assign(workflowVars, vars);
                this.logger.debug(`[Context] Merged ${Object.keys(vars).length} variables from task ${taskName}`);
            }

            // 4. HTTP / Task Shortcuts (macros)
            if (['SUCCESS', 'COMPLETED', 'FAILED', 'MAJOR', 'MINOR', 'WARNING', 'INFORMATION', 'TIMEOUT', 'NO_WORKER_FOUND', 'BRANCHED'].includes(record.status)) {
                const shortcut = {
                    ...(result.variables || {}), // Extract computed variables directly
                    ...(result.data || {}),      // Extract raw data if it already exists (HTTP body)
                    id: record.nodeId,
                    name: taskName,
                    status: result.status ?? record.status, // HTTP status (e.g. 200) or Execution status (e.g. SUCCESS)
                    executionStatus: record.status, 
                    duration: record.duration,
                    error: record.error,
                    body: result.data,
                    headers: result.headers
                };
                
                const cleanName = String(taskName).replace(/\s+/g, '_');

                // Add httpStatus specifically to avoid ambiguity
                if (result.status !== undefined) {
                    (shortcut as any).httpStatus = result.status;
                }
                
                // Populate macros
                macros[cleanName] = shortcut;
                macros[taskName] = shortcut;
                
                // HTTP.<name> for backward compatibility
                macros[`HTTP.${cleanName}`] = shortcut;
                macros[`HTTP.${taskName}`] = shortcut;
                macros[`HTTP.last`] = shortcut;

                // Explicit Task Namespace (Task.Task_A.status)
                macros[`Task.${cleanName}.status`] = record.status;
                macros[`Task.${taskName}.status`] = record.status;
                macros[`Task.${cleanName}.executionStatus`] = record.status;
                macros[`Task.${cleanName}.duration`] = record.duration;
                
                if (result.workflowStatus) {
                    macros[`Task.${cleanName}.workflowStatus`] = result.workflowStatus;
                }
            }
        }

        if (execution) {
            macros['workflow.executionId'] = workflowExecutionId;
            macros['workflow.name'] = execution.workflowName || execution.workflow?.name || 'Unknown Workflow';
            macros['workflow.id'] = execution.workflowId;

            const workflowId = execution.workflowId;
            this.logger.debug(`[Context] Fetching workflow history for macro resolution (workflowId: ${workflowId})`);
            const [lastExec, lastSuccess, lastFailed, lastCancelled] = await Promise.all([
                this.prisma.workflowExecution.findFirst({
                    where: { workflowId, id: { not: workflowExecutionId } },
                    orderBy: { startedAt: 'desc' }
                }),
                this.prisma.workflowExecution.findFirst({
                    where: { workflowId, status: 'SUCCESS' },
                    orderBy: { startedAt: 'desc' }
                }),
                this.prisma.workflowExecution.findFirst({
                    where: { workflowId, status: 'FAILED' },
                    orderBy: { startedAt: 'desc' }
                }),
                this.prisma.workflowExecution.findFirst({
                    where: { workflowId, status: 'CANCELLED' },
                    orderBy: { startedAt: 'desc' }
                })
            ]);

            macros['workflow.lastExecutionEpoch'] = lastExec?.startedAt ? Math.floor(lastExec.startedAt.getTime() / 1000) : 0;
            macros['workflow.lastSuccessEpoch'] = lastSuccess?.startedAt ? Math.floor(lastSuccess.startedAt.getTime() / 1000) : 0;
            macros['workflow.lastFailedEpoch'] = lastFailed?.startedAt ? Math.floor(lastFailed.startedAt.getTime() / 1000) : 0;
            macros['workflow.lastCancelledEpoch'] = lastCancelled?.startedAt ? Math.floor(lastCancelled.startedAt.getTime() / 1000) : 0;
            macros['workflow.lastSuccessDuration'] = lastSuccess?.duration || 0;

            // Per-task last success duration
            const nodeIds = records.map(r => r.nodeId).filter(Boolean) as string[];
            if (nodeIds.length > 0) {
                const taskLastSuccesses = await this.prisma.taskExecution.findMany({
                    where: {
                        nodeId: { in: nodeIds },
                        status: 'SUCCESS',
                        workflowExecutionId: { not: workflowExecutionId } // Previous runs
                    },
                    orderBy: { completedAt: 'desc' },
                    select: { nodeId: true, duration: true, task: { select: { name: true } } }
                });

                const seenNodes = new Set();
                for (const tls of taskLastSuccesses) {
                    if (seenNodes.has(tls.nodeId)) continue;
                    seenNodes.add(tls.nodeId);
                    
                    const tName = tls.task?.name || tls.nodeId;
                    const cName = String(tName).replace(/\s+/g, '_');
                    macros[`Task.${tName}.lastSuccessDuration`] = tls.duration;
                    macros[`Task.${cName}.lastSuccessDuration`] = tls.duration;
                }
            }
        }

        return { workflowVars, macros };
    }

    async findAll() {
        return this.prisma.worker.findMany({
            orderBy: { lastSeen: 'desc' },
        });
    }

    async updateWorker(id: string, data: any) {
        return this.prisma.worker.update({
            where: { id },
            data,
        });
    }

    async startExecution(executionId: string, hostname?: string) {
        let workerId = null;
        if (hostname) {
            const worker = await this.prisma.worker.findUnique({ where: { hostname } });
            workerId = worker?.id;
        }

        return this.prisma.taskExecution.update({
            where: { id: executionId },
            data: {
                status: 'RUNNING',
                startedAt: new Date(),
                workerId,
            },
        });
    }

    async completeExecution(executionId: string, result: any, error?: string, input?: any) {
        const execution = await this.prisma.taskExecution.findUnique({
            where: { id: executionId },
            include: { task: true }
        });

        if (!execution) throw new Error('Execution not found');

        // DEBUG: Log incoming result keys for VMA troubleshooting
        if (result?.variables) {
            const varKeys = Object.keys(result.variables);
            const scopeKeys = Object.keys(result.variableScopes || {});
            this.logger.log(`[Trace] Incoming execution ${executionId} variables: ${varKeys.length} keys: [${varKeys.join(', ')}]`);
            this.logger.log(`[Trace] Incoming execution ${executionId} internal snippet: ${JSON.stringify(result.variables).slice(0, 500)}`);
            this.logger.log(`[Trace] Incoming execution ${executionId} scopes: ${scopeKeys.length} keys: [${scopeKeys.join(', ')}]`);
        }

        let { status, reason, sanityResults } = await this.evaluateStatus(execution, result, error);

        // Apply failureStatusOverride if this is part of a workflow and failed
        if (status === 'FAILED' && execution.workflowExecutionId && execution.nodeId) {
            try {
                const wfEx = await this.prisma.workflowExecution.findUnique({
                    where: { id: execution.workflowExecutionId },
                    include: { workflow: true }
                });
                if (wfEx?.workflow?.nodes) {
                    const nodes = wfEx.workflow.nodes as any[];
                    const node = nodes.find(n => n.id === execution.nodeId);
                    if (node?.failureStatusOverride && node.failureStatusOverride !== 'FAILED') {
                        this.logger.log(`[Trace] Applying status override: FAILED -> ${node.failureStatusOverride} for node ${execution.nodeId}`);
                        status = node.failureStatusOverride;
                    }
                }
            } catch (err) {
                this.logger.error(`[Trace] Failed to fetch status override: ${err.message}`);
            }
        }

        const duration = new Date().getTime() - execution.startedAt.getTime();

        const updated = await this.prisma.taskExecution.update({
            where: { id: executionId },
            data: {
                status,
                result: {
                    ...(execution.result as any || {}),
                    ...(result || {}),
                    sanityResults: sanityResults || []
                },
                error: status === 'SUCCESS' ? null : (reason || error || null),
                ...(input ? { input } : {}),
                completedAt: new Date(),
                duration,
            },
        });

        // Orchestrate next steps if part of a workflow
        if (updated.workflowExecutionId && updated.nodeId) {
            await this.handleWorkflowOrchestration(updated);
        }

        return updated;
    }


    async triggerSubWorkflow(taskExec: any) {
        const workflowId = (taskExec.input as any)?.subWorkflowId || taskExec.taskId;
        const workflow = await this.prisma.workflow.findUnique({ where: { id: workflowId } });
        if (!workflow) {
            await this.completeExecution(taskExec.id, {}, 'Sub-workflow not found');
            return;
        }

        this.logger.log(`[Trace] Triggering sub-workflow: ${workflow.name} for parent task: ${taskExec.id}`);
        
        // Resolve input mapping from parent context
        const { workflowVars, macros } = await this.gatherWorkflowContext(taskExec.workflowExecutionId);
        const globalVars = await this.globalVarsService.findAllResolved();
        const inputMapping = taskExec.input?.inputMapping || {};

        const engine = new VariableEngine({
            global: globalVars || {},
            workflow: workflowVars,
            macros
        });

        const resolvedInput: Record<string, any> = {};
        
        // Resolve input mapping from parent context using VariableEngine
        for (const [key, value] of Object.entries(inputMapping)) {
            resolvedInput[key] = engine.resolveValue(value, key);
        }

        // Store resolved input in taskExec for persistence
        await this.prisma.taskExecution.update({
            where: { id: taskExec.id },
            data: { 
                input: { 
                    ...(taskExec.input as any), 
                    resolvedInput 
                } 
            }
        });

        // 1. Create sub-workflow execution
        const subExec = await this.prisma.workflowExecution.create({
            data: {
                workflowId,
                workflowName: workflow.name,
                workflowVersion: workflow.version,
                status: 'RUNNING',
                triggeredBy: 'SIGNAL',
                triggeredByUser: 'system',
                startedAt: new Date(),
                parentTaskExecutionId: taskExec.id,
                taskExecutions: [], // Legacy
            } as any
        });

        // Link child execution back to parent task for UI navigation
        await this.prisma.taskExecution.update({
            where: { id: taskExec.id },
            data: {
                result: {
                    ...(taskExec.result as any || {}),
                    childExecutionId: subExec.id
                }
            }
        });

        // 2. Start sub-workflow nodes
        let nodes = workflow.nodes as any[];
        let edges = workflow.edges as any[];
        if (typeof nodes === 'string') nodes = JSON.parse(nodes);
        if (typeof edges === 'string') edges = JSON.parse(edges);
        if (!Array.isArray(nodes)) nodes = Object.values(nodes || {});

        const targetNodeIds = new Set(edges.map((e: any) => e.target));
        const startNodes = nodes.filter((n: any) => !targetNodeIds.has(n.id));

        // Pre-gather sub-workflow start context (baseline + resolved inputs)
        const { workflowVars: subWorkflowStartContext, macros: subWorkflowMacros } = await this.gatherWorkflowContext(subExec.id);

        for (const node of startNodes) {
            const isUtility = (node as any).taskType === 'VARIABLE' || 
                              (node as any).taskId === '00000000-0000-0000-0000-000000000001' || 
                              (node as any).taskId === 'util-vars';
            const isNested = (node as any).taskType === 'WORKFLOW';
            const isIfNode = (node as any).taskType === 'IF';
            
            const childExec = await this.prisma.taskExecution.create({
                data: {
                    taskId: (isUtility || isNested || isIfNode) ? null : node.taskId,
                    nodeId: node.id,
                    workflowExecutionId: subExec.id,
                    status: (isNested || isIfNode) ? 'RUNNING' : 'PENDING',
                    targetTags: node.targetTags || (workflow.tags || []),
                    startedAt: new Date(),
                    input: {
                        utility: isUtility,
                        nested: isNested,
                        ifNode: isIfNode,
                        taskType: (node as any).taskType || (isUtility ? 'VARIABLE' : (isNested ? 'WORKFLOW' : (isIfNode ? 'IF' : 'HTTP'))),
                        subWorkflowId: isNested ? node.taskId : undefined,
                        variableExtraction: node.variableExtraction || { vars: {} },
                        sanityChecks: node.sanityChecks || [],
                        authorization: node.authorization,
                        inputMapping: node.inputMapping,
                        workflowVars: subWorkflowStartContext, // Context snapshot
                        macros: subWorkflowMacros
                    }
                }
            });

            // If the start node is ALSO a sub-workflow or IF node, trigger it recursively
            if (isNested) {
                await this.prisma.taskExecution.update({
                    where: { id: childExec.id },
                    data: { status: 'RUNNING', startedAt: new Date() }
                });
                await this.triggerSubWorkflow(childExec);
            } else if (isIfNode) {
                this.logger.log(`[Orchestration] Executing IF node as sub-workflow start: ${node.id}`);
                try {
                    const { result: branchResult, trace } = this.conditionEvaluator.evaluate(
                        (node as any).conditionGroups || [],
                        { ...subWorkflowStartContext, macros: subWorkflowMacros }
                    );
                    
                    const completedIf = await this.prisma.taskExecution.update({
                        where: { id: childExec.id },
                        data: {
                            status: 'BRANCHED',
                            completedAt: new Date(),
                            result: {
                                branchResult: branchResult ? 'THEN' : 'ELSE',
                                trace
                            }
                        }
                    });
                    
                    // Trigger next steps from the IF node recursively
                    await this.handleWorkflowOrchestration(completedIf);
                } catch (err) {
                    this.logger.error(`[Orchestration] Sub-workflow IF node ${node.id} evaluation failed: ${err.message}`);
                    await this.prisma.taskExecution.update({
                        where: { id: childExec.id },
                        data: {
                            status: 'FAILED',
                            completedAt: new Date(),
                            error: `Conditional evaluation failed: ${err.message}`
                        }
                    });
                }
            } else if (isUtility) {
                await this.executeUtilityNode(childExec);
            }
        }
    }

    private async evaluateStatus(execution: any, result: any, error?: string): Promise<{ status: string; reason?: string; sanityResults?: any[] }> {
        if (error) return { status: 'FAILED' };
        if (!result || result.status === undefined) return { status: 'FAILED', reason: 'Response missing status code' };

        const httpStatus = result.status;
        const task = execution.task || {};
        const sanityResults: any[] = [];

        // 1. Task Level Status Mappings
        if (task.statusMappings && Array.isArray(task.statusMappings)) {
            const mapping = task.statusMappings.find((m: any) => this.isStatusCodeMatch(httpStatus, m.pattern));
            if (mapping) return { status: mapping.status, reason: `Status code ${httpStatus} matched pattern ${mapping.pattern}`, sanityResults: [] };
        }

        // 2. Global Defaults
        const globalSuccess = await this.prisma.systemSetting.findUnique({ where: { key: 'SUCCESS_CODES_DEFAULT' } });
        const globalFailure = await this.prisma.systemSetting.findUnique({ where: { key: 'FAILURE_CODES_DEFAULT' } });

        const successPattern = globalSuccess?.value || '200-299';
        const failurePattern = globalFailure?.value || '400-599';

        let status = 'SUCCESS';
        let reason = `HTTP ${httpStatus}`;

        if (this.isStatusCodeMatch(httpStatus, failurePattern)) {
            status = 'FAILED';
            reason = `HTTP ${httpStatus} matched failure pattern ${failurePattern}`;
        } else if (!this.isStatusCodeMatch(httpStatus, successPattern)) {
            status = 'FAILED';
            reason = `HTTP ${httpStatus} did not match success pattern ${successPattern}`;
        }

        // 3. Regex Sanity Checks (Merge Library + Instance Overlay)
        const libChecks = (task.sanityChecks && Array.isArray(task.sanityChecks)) ? task.sanityChecks : [];
        const instChecks = (execution.input?.sanityChecks && Array.isArray(execution.input.sanityChecks)) ? execution.input.sanityChecks : [];
        const allSanityChecks = [...libChecks, ...instChecks];

        if (allSanityChecks.length > 0) {
            const body = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
            for (const check of allSanityChecks) {
                try {
                    const regex = new RegExp(check.regex);
                    const matches = regex.test(body);

                    const failed = (check.condition === 'MUST_CONTAIN' && !matches) ||
                        (check.condition === 'MUST_NOT_CONTAIN' && matches);

                    sanityResults.push({
                        ...check,
                        passed: !failed
                    });

                    if (failed) {
                        const failureMsg = `Sanity Check Failed: Body ${check.condition === 'MUST_CONTAIN' ? 'missing' : 'contains'} "${check.regex}"`;
                        this.logger.warn(`[SanityCheck] Task ${task?.name || execution.nodeId} Status: ${check.severity === 'ERROR' ? 'FAILED' : 'WARNING'} - ${failureMsg}`);
                        if (check.severity === 'ERROR') {
                            status = 'FAILED';
                            reason = failureMsg;
                        }
                    }
                } catch (e) {
                    this.logger.error(`[SanityCheck] Invalid regex: ${check.regex}`);
                    sanityResults.push({ ...check, passed: false, error: 'Invalid Regex' });
                }
            }
        }

        return { status, reason, sanityResults };
    }

    private isStatusCodeMatch(code: number, pattern: string): boolean {
        if (!pattern) return false;
        const parts = pattern.split(',').map(p => p.trim());
        for (const part of parts) {
            if (part.includes('-')) {
                const [min, max] = part.split('-').map(Number);
                if (code >= min && code <= max) return true;
            } else if (!isNaN(Number(part)) && Number(part) === code) {
                return true;
            }
        }
        return false;
    }

    private async handleWorkflowOrchestration(completedTask: any) {
        const { workflowExecutionId, nodeId, status } = completedTask;

        // 1. Get workflow definition and all current task executions
        const workflowExecution = await this.prisma.workflowExecution.findUnique({
            where: { id: workflowExecutionId },
            include: { 
                workflow: true,
                taskExecutionRecords: true
            }
        });

        if (!workflowExecution || !workflowExecution.workflow) return;

        const workflow = workflowExecution.workflow;
        let nodes = workflow.nodes as any[];
        let edges = workflow.edges as any[];
        if (typeof nodes === 'string') nodes = JSON.parse(nodes);
        if (typeof edges === 'string') edges = JSON.parse(edges);
        if (!Array.isArray(nodes)) nodes = Object.values(nodes || {});
        if (!Array.isArray(edges)) edges = Object.values(edges || {});
        
        // Re-fetch records to get the most up-to-date status (crucial for recursive utility node calls)
        const taskRecords = await this.prisma.taskExecution.findMany({
            where: { workflowExecutionId }
        });

        // 2. Find ALL next candidate nodes (downstream from the completed task)
        const outgoingEdges = edges.filter(edge => edge.source === nodeId);
        
        for (const edge of outgoingEdges) {
            const nextNodeId = edge.target;
            this.logger.debug(`[Orchestration] Checking candidate node: ${nextNodeId}`);

            // 3. Fan-in logic: Check if ALL predecessors for 'nextNode' are finished
            const incomingEdges = edges.filter(e => e.target === nextNodeId);
            const predecessorNodeIds = incomingEdges.map(e => e.source);
            
            this.logger.debug(`[Orchestration] Node ${nextNodeId} has predecessors: ${predecessorNodeIds.join(', ')}`);

            const predecessorRecords = taskRecords.filter(r => predecessorNodeIds.includes(r.nodeId));
            
            // Check if all predecessors have an execution record and are finished
            const allFinished = predecessorNodeIds.every(pid => {
                const record = taskRecords.find(r => r.nodeId === pid);
                const finished = record && ['SUCCESS', 'FAILED', 'TIMEOUT', 'NO_WORKER_FOUND', 'MAJOR', 'MINOR', 'WARNING', 'INFORMATION', 'BRANCHED'].includes(record.status);
                if (!finished) {
                    this.logger.debug(`[Orchestration] Node ${nextNodeId} waiting for predecessor ${pid} (Current Status: ${record?.status || 'NOT_STARTED'})`);
                }
                return finished;
            });

            if (!allFinished) {
                this.logger.debug(`[Orchestration] Node ${nextNodeId} waiting for other predecessors. Finished: ${predecessorRecords.length}/${predecessorNodeIds.length}`);
                continue; // Wait for other branches
            }

            // 4. Check Failure Strategies & Edge Conditions: Should we actually trigger this node?
            const strategy = nodes.find(n => n.id === nodeId)?.failureStrategy || 'SUCCESS_REQUIRED';

            // Check if the specific edge that leads to this trigger matches the current status
            const condition = (edge as any).condition || 'ALWAYS';

            let result = (completedTask as any).result || {};
            if (typeof result === 'string') {
                try { result = JSON.parse(result); } catch (e) { result = {}; }
            }
            const branchResult = (result as any).branchResult;
            
            const statusMatch = condition === 'ALWAYS' || 
                                (condition === 'ON_SUCCESS' && (status === 'SUCCESS' || status === 'BRANCHED')) ||
                                (condition === 'ON_FAILURE' && status !== 'SUCCESS' && status !== 'BRANCHED') ||
                                (condition === 'ON_THEN' && branchResult === 'THEN') ||
                                (condition === 'ON_ELSE' && branchResult === 'ELSE');

            if (!statusMatch) {
                this.logger.debug(`[Orchestration] Skipping edge ${edge.id} to ${nextNodeId} (Condition: ${condition}, Node Status: ${status}, Branch Result: ${branchResult}) - Reason: Condition mismatch`);
                continue;
            }

            this.logger.log(`[Orchestration] PASSED Fan-in and Edge Condition. Triggering node: ${nextNodeId} (Type: ${nodes.find(n => n.id === nextNodeId)?.taskType || 'HTTP'})`);

            // If task failed and strategy is SUCCESS_REQUIRED, we don't proceed even if edge is ON_FAILURE / ALWAYS
            if (status !== 'SUCCESS' && status !== 'BRANCHED' && strategy === 'SUCCESS_REQUIRED') {
                this.logger.debug(`[Orchestration] Node ${nextNodeId} skipped because predecessor ${nodeId} status is ${status} and strategy is SUCCESS_REQUIRED`);
                continue;
            }

            const blocker = predecessorRecords.find(r => {
                const nodeDef = nodes.find(n => n.id === r.nodeId);
                const strat = nodeDef?.failureStrategy || 'SUCCESS_REQUIRED';
                return r.status !== 'SUCCESS' && r.status !== 'BRANCHED' && strat === 'SUCCESS_REQUIRED';
            });

            if (blocker) {
                this.logger.warn(`[Orchestration] Node ${nextNodeId} BLOCKED because some predecessor failed with SUCCESS_REQUIRED`);
                continue;
            }

            // 5. Trigger the task
            // Determine targeting
            const nextNode = nodes.find(n => n.id === nextNodeId);
            let targetWorkerId = nextNode.targetWorkerId;
            let targetTags = (nextNode.targetTags && nextNode.targetTags.length > 0)
                ? nextNode.targetTags
                : (workflow.tags || []);

            if (!targetWorkerId && workflowExecution.targetWorkerId) {
                targetWorkerId = workflowExecution.targetWorkerId;
            }

            // Strict Worker Check
            let initialStatus = 'PENDING';
            if (targetTags.length > 0) {
                const matchingWorkerCount = await this.prisma.worker.count({
                    where: {
                        status: 'ONLINE',
                        tags: { hasSome: targetTags }
                    }
                });
                
                let isPinnedWorkerValid = true;
                if (targetWorkerId) {
                    const pinnedWorker = await this.prisma.worker.findUnique({ where: { id: targetWorkerId } });
                    if (!pinnedWorker || (targetTags.length > 0 && !targetTags.some(tag => pinnedWorker.tags.includes(tag)))) {
                        isPinnedWorkerValid = false;
                    }
                }

                if (matchingWorkerCount === 0 || !isPinnedWorkerValid) {
                    this.logger.warn(`[Orchestration] NO VALID WORKER FOUND for next node ${nextNode.id} (Tags: ${targetTags.join(',')})`);
                    initialStatus = 'NO_WORKER_FOUND';
                }
            }

            // Determine node type for server-side processing
            const isUtility = (nextNode as any).taskType === 'VARIABLE' || 
                              (nextNode as any).taskId === '00000000-0000-0000-0000-000000000001' || 
                              (nextNode as any).taskId === 'util-vars';
            const isNested = (nextNode as any).taskType === 'WORKFLOW';
            const isIfNode = (nextNode as any).taskType === 'IF';

            // Ensure we don't create duplicate executions for the same node in this run
            let nextTaskExec = await this.prisma.taskExecution.findFirst({
                where: { workflowExecutionId, nodeId: nextNode.id }
            });

            // Pre-gather workflow context to store in the task input. 
            const { workflowVars, macros: orchestrationMacros } = await this.gatherWorkflowContext(workflowExecutionId);

            if (!nextTaskExec) {
                this.logger.log(`[Orchestration] Creating new record for node ${nextNode.id} (Type: ${nextNode.taskType || (isUtility ? 'VARIABLE' : (isNested ? 'WORKFLOW' : (isIfNode ? 'IF' : 'HTTP')))})`);
                nextTaskExec = await this.prisma.taskExecution.create({
                    data: {
                        taskId: (isUtility || isNested || isIfNode) ? null : nextNode.taskId,
                        nodeId: nextNode.id,
                        workflowExecutionId,
                        status: (isNested || isIfNode) ? 'RUNNING' : initialStatus,
                        targetWorkerId,
                        targetTags,
                        startedAt: new Date(),
                        input: { 
                            utility: isUtility,
                            nested: isNested,
                            ifNode: isIfNode,
                            workflowVars, 
                            macros: orchestrationMacros,
                            subWorkflowId: isNested ? nextNode.taskId : undefined,
                            taskType: (nextNode as any).taskType || (isUtility ? 'VARIABLE' : (isNested ? 'WORKFLOW' : (isIfNode ? 'IF' : 'HTTP'))),
                            variableExtraction: nextNode.variableExtraction || { vars: {} },
                            sanityChecks: nextNode.sanityChecks || [],
                            authorization: nextNode.authorization,
                            inputMapping: nextNode.inputMapping 
                        }
                    },
                });
            } else if (['PENDING', 'RUNNING'].includes(nextTaskExec.status)) {
                this.logger.log(`[Orchestration] Resuming/Triggering existing record for node ${nextNode.id} (Status: ${nextTaskExec.status})`);
            } else if (['NO_WORKER_FOUND'].includes(nextTaskExec.status)) {
                this.logger.warn(`[Orchestration] Node ${nextNode.id} is already in NO_WORKER_FOUND status. Retrying...`);
            } else {
                this.logger.debug(`[Orchestration] Node ${nextNode.id} already has terminal record with status ${nextTaskExec.status}. Skipping.`);
                continue;
            }
            
            // Trigger Server-Side Execution Logic
            if (isIfNode) {
                this.logger.log(`[Orchestration] EVALUATING IF node: ${nextNode.id}`);
                try {
                    const evaluation = this.conditionEvaluator.evaluate(
                        nextNode.conditionGroups || [],
                        { ...workflowVars, macros: orchestrationMacros }
                    );
                    
                    this.logger.log(`[Orchestration] IF node ${nextNode.id} EVALUATION RESULT: ${evaluation.result ? 'THEN' : 'ELSE'}`);
                    this.logger.debug(`[Orchestration] IF node trace: ${JSON.stringify(evaluation.trace)}`);

                    const completedIf = await this.prisma.taskExecution.update({
                        where: { id: nextTaskExec.id },
                        data: {
                            status: 'BRANCHED',
                            completedAt: new Date(),
                            result: {
                                branchResult: evaluation.result ? 'THEN' : 'ELSE',
                                trace: evaluation.trace
                            }
                        }
                    });
                    
                    await this.handleWorkflowOrchestration(completedIf);
                } catch (err) {
                    this.logger.error(`[Orchestration] IF node ${nextNode.id} evaluation CRASHED: ${err.message}`);
                    await this.prisma.taskExecution.update({
                        where: { id: nextTaskExec.id },
                        data: {
                            status: 'FAILED',
                            completedAt: new Date(),
                            error: `Conditional evaluation failed: ${err.message}`
                        }
                    });
                }
            } else if (isNested) {
                this.logger.log(`[Orchestration] Launching Nested Workflow: ${nextNode.id}`);
                await this.triggerSubWorkflow(nextTaskExec);
            } else if (isUtility) {
                this.logger.log(`[Orchestration] Launching Utility Node: ${nextNode.id}`);
                await this.executeUtilityNode(nextTaskExec);
            }
        }

        // 6. Update workflow execution overall status
        await this.checkWorkflowCompletion(workflowExecutionId);
    }

    private async checkWorkflowCompletion(workflowExecutionId: string) {
        const execution = await this.prisma.workflowExecution.findUnique({
            where: { id: workflowExecutionId },
            include: { taskExecutionRecords: true }
        });

        if (!execution || execution.taskExecutionRecords.length === 0) return;

        const tasks = execution.taskExecutionRecords;

        // Priority-based status: FAILED > MAJOR > MINOR > TIMEOUT > WARNING > INFORMATION > NO_WORKER_FOUND > RUNNING > PENDING > SUCCESS
        let finalStatus = 'SUCCESS';
        
        const hasFailed = tasks.some(t => t.status === 'FAILED');
        const hasMajor = tasks.some(t => t.status === 'MAJOR');
        const hasMinor = tasks.some(t => t.status === 'MINOR');
        const hasTimeout = tasks.some(t => t.status === 'TIMEOUT');
        const hasWarning = tasks.some(t => t.status === 'WARNING');
        const hasInformation = tasks.some(t => t.status === 'INFORMATION');
        const hasNoWorker = tasks.some(t => t.status === 'NO_WORKER_FOUND');
        const hasRunning = tasks.some(t => t.status === 'RUNNING');
        const hasPending = tasks.some(t => t.status === 'PENDING');

        if (hasFailed) finalStatus = 'FAILED';
        else if (hasMajor) finalStatus = 'MAJOR';
        else if (hasMinor) finalStatus = 'MINOR';
        else if (hasTimeout) finalStatus = 'TIMEOUT';
        else if (hasWarning) finalStatus = 'WARNING';
        else if (hasInformation) finalStatus = 'INFORMATION';
        else if (hasNoWorker) finalStatus = 'NO_WORKER_FOUND';
        else if (hasRunning) finalStatus = 'RUNNING';
        else if (hasPending) finalStatus = 'PENDING';

        const isFullyDone = !hasRunning && !hasPending;
        const now = new Date();
        const startedAt = execution.startedAt ? new Date(execution.startedAt) : now;
        const duration = isFullyDone ? Math.max(0, now.getTime() - startedAt.getTime()) : null;

        let filteredVars = {};
        if (isFullyDone) {
            // Gather sub-workflow variables to pass back to parent or save as result
            const { workflowVars, macros } = await this.gatherWorkflowContext(workflowExecutionId);
            filteredVars = workflowVars;

            try {
                const wf = await this.prisma.workflow.findUnique({
                    where: { id: execution.workflowId },
                    select: { outputVariables: true }
                });
                if (wf?.outputVariables) {
                    const outputDefs = typeof wf.outputVariables === 'string' ? JSON.parse(wf.outputVariables) : wf.outputVariables;
                    if (outputDefs && typeof outputDefs === 'object') {
                        const declaredKeys = Object.keys(outputDefs).filter(k => !k.startsWith('__'));
                        if (declaredKeys.length > 0) {
                            const globalVars = await this.globalVarsService.findAllResolved();
                            const engine = new VariableEngine({
                                global: globalVars || {},
                                workflow: workflowVars,
                                macros
                            });

                            const newFiltered: Record<string, any> = {};
                            for (const key of declaredKeys) {
                                const def = outputDefs[key];
                                let value = workflowVars[key];

                                // Resolve if transformer or template string
                                if (def && typeof def === 'object' && def.valueMode === 'transformer') {
                                    const t = def.transformer || {};
                                    if (t.type === 'constant') {
                                        const val = t.hasOwnProperty('value') ? t.value : (t.hasOwnProperty('spec') ? t.spec : t.specYaml);
                                        value = typeof val === 'string' ? engine.resolve(val) : val;
                                    } else if (t.type === 'none' || t.type === 'NONE' || t.inputSource === 'variable') {
                                        if (t.inputVariable) {
                                            value = engine.resolve(t.inputVariable);
                                        }
                                    }
                                } else if (typeof value === 'string') {
                                    value = engine.resolve(value);
                                }
                                
                                newFiltered[key] = value !== undefined ? value : null;
                            }
                            filteredVars = newFiltered;
                            this.logger.debug(`[Orchestration] Resolved & Filtered ${Object.keys(filteredVars).length} output variables for CWF final state`);
                        }
                    }
                }
            } catch (err) {
                this.logger.error(`[Orchestration] Failed to filter variables: ${err.message}`);
            }

            // 4. Update WorkflowExecution with final status and results
            // Preserve initialVariables if they exist in the current metadata
            const currentMetadata = execution.taskExecutions as any || {};
            const initialVars = currentMetadata.initialVariables || null;

            await this.prisma.workflowExecution.update({
                where: { id: workflowExecutionId },
                data: {
                    status: finalStatus,
                    completedAt: now,
                    duration: duration,
                    taskExecutions: {
                        ...(initialVars ? { initialVariables: initialVars } : {}),
                        finalVariables: filteredVars,
                        summary: `Workflow finished with ${Object.keys(filteredVars || {}).length} variables context.`
                    }
                }
            });

            // 5. If this was a sub-workflow, resume the parent task
            const exec = execution as any;
            if (exec.parentTaskExecutionId) {
                this.logger.log(`[Orchestration] Sub-workflow ${workflowExecutionId} finished. Resuming parent task ${exec.parentTaskExecutionId} with ${Object.keys(filteredVars || {}).length} variables.`);
                
                await this.completeExecution(exec.parentTaskExecutionId, { 
                    status: finalStatus === 'SUCCESS' ? 200 : 500,
                    data: `Sub-workflow ${execution.workflowName} finished with status ${finalStatus}`,
                    subWorkflowId: workflowExecutionId,
                    childExecutionId: workflowExecutionId, // For UI direct navigation
                    variables: filteredVars, // Propagate only filtered variables to parent task context
                    duration: duration,
                    workflowStatus: finalStatus
                });
            }

            // 6. Process End-of-Workflow Notifications (Event Triggers)
            try {
                const wfForNotifs = await this.prisma.workflow.findUnique({
                    where: { id: execution.workflowId },
                    select: { notifications: true }
                });
                
                const notifs = (wfForNotifs?.notifications as any[]) || [];
                if (notifs.length > 0) {
                    this.logger.log(`[Analytics] Processing ${notifs.length} event triggers for execution ${workflowExecutionId}`);
                    
                    for (const notif of notifs) {
                        let shouldTrigger = false;
                        if (notif.event === 'COMPLETED') shouldTrigger = true;
                        else if (notif.event === 'ON_SUCCESS' && finalStatus === 'SUCCESS') shouldTrigger = true;
                        else if (notif.event === 'ON_FAILURE' && finalStatus !== 'SUCCESS') shouldTrigger = true;
                        
                        if (shouldTrigger && notif.workflowId) {
                            this.logger.log(`[Analytics] Triggering notification workflow ${notif.workflowId} on event ${notif.event}`);
                            
                            // Resolve notification inputs if any were mapped in UI
                            const resolvedNotifInputs: any = {};
                            if (notif.inputs && typeof notif.inputs === 'object') {
                                try {
                                    const engine = new VariableEngine({
                                        global: await this.globalVarsService.findAllResolved(),
                                        workflow: workflowVars,
                                        macros: {
                                            ...macros,
                                            // Superior naming convention for event triggers
                                            'workflow.executionStatus': finalStatus,
                                            'workflow.executionDuration': duration,
                                            'workflow.status': finalStatus, 
                                            'workflow.lastStatus': finalStatus, // Alias for compatibility
                                            'workflow.duration': duration,
                                            'workflow.lastSuccessDuration': finalStatus === 'SUCCESS' ? duration : (macros['workflow.lastSuccessDuration'] || 0)
                                        }
                                    });
                                    
                                    for (const [k, v] of Object.entries(notif.inputs)) {
                                        resolvedNotifInputs[k] = engine.resolveValue(v, k);
                                    }
                                } catch (e) {
                                    this.logger.warn(`[Analytics] Failed to resolve notification inputs for ${notif.workflowId}: ${e.message}`);
                                }
                            }

                            // Pass metadata and resolved initial variables to the triggered workflow
                            await this.workflowsService.enqueueExecution(notif.workflowId, 'SIGNAL', 'system', {
                                ...resolvedNotifInputs,
                                __source_execution_id: workflowExecutionId,
                                __source_status: finalStatus,
                                __source_event: notif.event, // Pass trigger criteria metadata
                                __source_variables: filteredVars
                            }, workflowExecutionId);
                        }
                    }
                }
            } catch (err) {
                this.logger.error(`[Analytics] Failed to process notification triggers: ${err.message}`);
            }
        } else {
            // Partial update for in-progress workflows
            await this.prisma.workflowExecution.update({
                where: { id: workflowExecutionId },
                data: {
                    status: finalStatus,
                    duration: duration
                }
            });
        }
    }

    async executeUtilityNode(taskExec: any) {
        this.logger.log(`[Orchestration] Executing Utility Node server-side: ${taskExec.nodeId}`);
        
        const execution = await this.prisma.workflowExecution.findUnique({
            where: { id: taskExec.workflowExecutionId },
            include: { workflow: true }
        });
        if (!execution) return;

        const { workflowVars, macros } = await this.gatherWorkflowContext(taskExec.workflowExecutionId);
        const workflow = execution.workflow as any;
        let nodes = workflow.nodes as any;
        if (typeof nodes === 'string') nodes = JSON.parse(nodes);
        if (!Array.isArray(nodes)) nodes = Object.values(nodes || {});
        
        const node = nodes.find((n: any) => n.id === taskExec.nodeId);
        
        if (!node) {
            this.logger.error(`[Orchestration] Node definition not found for ${taskExec.nodeId}`);
            return;
        }

        try {
            const { transform } = await import('../../../../packages/shared-xform/xform_engine');
            const { validateSpecYaml } = await import('../../../../packages/shared-xform/xform_validation');
            
            const results: Record<string, any> = {};
            const variableInputs: Record<string, any> = {};
            const extraction = node.variableExtraction || { vars: {} };
            const varDefs = extraction.vars || {};
            
            const globalVars = await this.globalVarsService.findAllResolved();
            const varContext = {
                global: globalVars || {},
                workflow: workflowVars,
                macros: {
                    ...macros,
                    "task.name": node.name || node.id,
                    "task.id": node.id
                },
                task: results // Allow variables to reference each other
            };

            const engine = new VariableEngine(varContext);
            const varNames = varDefs.__order || Object.keys(varDefs).filter(k => !k.startsWith('__'));

            for (const key of varNames) {
                const def = varDefs[key];
                if (!def) continue;

                this.logger.log(`[VMA API] Processing '${key}'...`);

                if (def.valueMode === 'transformer') {
                    const t = def.transformer || {};
                    const type = (t.type || '').toLowerCase();

                    if (type === 'constant') {
                        const val = t.hasOwnProperty('value') ? t.value : (t.hasOwnProperty('spec') ? t.spec : t.specYaml);
                        const resolved = typeof val === 'string' ? engine.resolve(val) : val;
                        this.logger.log(`[VMA API] Constant resolution for '${key}': '${val}' -> '${resolved}'`);
                        results[key] = resolved;
                    } else if (type === 'none' || t.inputSource === 'variable') {
                        const inputVal = t.inputVariable ? engine.resolve(t.inputVariable) : '';
                        this.logger.log(`[VMA API] Variable resolution for '${key}': '${t.inputVariable}' -> '${inputVal}'`);
                        results[key] = inputVal;
                    } else {
                        // Fallback to transform engine for complex types (JMESPath, etc)
                        const spec = t.specYaml || t.spec || '';
                        if (spec) {
                            const validation = validateSpecYaml(spec);
                            if (validation.ok) {
                                let inputText = '';
                                if (t.inputSource === 'variable' && t.inputVariable) {
                                    const resolvedInput = engine.resolve(t.inputVariable);
                                    inputText = typeof resolvedInput === 'object' ? JSON.stringify(resolvedInput) : String(resolvedInput || '');
                                }
                                results[key] = await transform(validation.spec, inputText, varContext);
                                this.logger.log(`[VMA API] Transform resolution for '${key}' (type: ${type}) completed.`);
                            }
                        }
                    }
                } else if (def.valueMode === 'parent') {
                    const parentVal = workflowVars[key];
                    results[key] = parentVal !== undefined ? parentVal : (def.defaultValue || null);
                    this.logger.log(`[VMA API] Parent resolution for '${key}': ${JSON.stringify(results[key])}`);
                } else {
                    const val = typeof def === 'string' ? def : (def.value !== undefined ? def.value : def);
                    const resolved = typeof val === 'string' ? engine.resolve(val) : val;
                    this.logger.log(`[VMA API] Direct resolution for '${key}': '${val}' -> '${resolved}'`);
                    results[key] = resolved;
                }
            }

            const updated = await this.prisma.taskExecution.update({
                where: { id: taskExec.id },
                data: {
                    status: 'SUCCESS',
                    completedAt: new Date(),
                    result: { variables: results, variableInputs }
                }
            });

            await this.handleWorkflowOrchestration(updated);
        } catch (err) {
            this.logger.error(`[Orchestration] Utility node execution failed: ${err.message}`);
            await this.prisma.taskExecution.update({
                where: { id: taskExec.id },
                data: {
                    status: 'FAILED',
                    completedAt: new Date(),
                    error: err.message
                }
            });
        }
    }
}
