import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { LoggerService } from '../common/logger/logger.service';
import { GlobalVarsService } from '../global-vars/global-vars.service';
import { VariableEngine } from '../../../../packages/shared-xform/variable_engine';

@Injectable()
export class WorkerService {
    constructor(
        private prisma: PrismaService,
        private logger: LoggerService,
        private globalVarsService: GlobalVarsService
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
        // 1. Fetch the execution and its base workflow definition for initial variable state
        const execution = await this.prisma.workflowExecution.findUnique({
            where: { id: workflowExecutionId },
            include: { workflow: true }
        });

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

            // 2. Resolve Input variables provided by parent if this is a sub-workflow
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

            // 4. HTTP Shortcuts (macros)
            if (['SUCCESS', 'COMPLETED', 'FAILED'].includes(record.status)) {
                const shortcut = {
                    status: result.status,
                    body: result.data,
                    headers: result.headers
                };
                const cleanName = String(taskName).replace(/\s+/g, '_');
                macros[`HTTP.${cleanName}`] = shortcut;
                macros[`HTTP.${taskName}`] = shortcut;
                macros[`HTTP.last`] = shortcut;
            }
        }

        if (execution) {
            macros['workflow.executionId'] = workflowExecutionId;
            macros['workflow.name'] = execution.workflowName;

            const workflowId = execution.workflowId;
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
            if (typeof value === 'string') {
                // If the value is a single template like "{{var}}", we try to get the raw object
                // instead of a stringified version (to preserve JSON/Arrays).
                const match = (value as string).match(/^\{\{\s*(.*?)\s*\}\}$/);
                if (match) {
                    const expr = match[1].trim();
                    const evalResult = engine.evaluateExpression(expr);
                    resolvedInput[key] = evalResult !== undefined ? evalResult : value;
                } else {
                    resolvedInput[key] = engine.resolve(value as string);
                }
            } else {
                resolvedInput[key] = value;
            }
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
        const { workflowVars: subWorkflowStartContext } = await this.gatherWorkflowContext(subExec.id);

        for (const node of startNodes) {
            const isUtility = (node as any).taskType === 'VARIABLE' || 
                              (node as any).taskId === '00000000-0000-0000-0000-000000000001' || 
                              (node as any).taskId === 'util-vars';
            const isNested = (node as any).taskType === 'WORKFLOW';
            
            const childExec = await this.prisma.taskExecution.create({
                data: {
                    taskId: (isUtility || isNested) ? null : node.taskId,
                    nodeId: node.id,
                    workflowExecutionId: subExec.id,
                    status: 'PENDING',
                    targetTags: node.targetTags || (workflow.tags || []),
                    startedAt: new Date(),
                    input: {
                        utility: isUtility,
                        nested: isNested,
                        taskType: (node as any).taskType || (isUtility ? 'VARIABLE' : (isNested ? 'WORKFLOW' : 'HTTP')),
                        subWorkflowId: isNested ? node.taskId : undefined,
                        variableExtraction: node.variableExtraction || { vars: {} },
                        sanityChecks: node.sanityChecks || [],
                        authorization: node.authorization,
                        inputMapping: node.inputMapping,
                        workflowVars: subWorkflowStartContext // Context snapshot
                    }
                }
            });

            // If the start node is ALSO a sub-workflow, trigger it recursively
            if (isNested) {
                await this.prisma.taskExecution.update({
                    where: { id: childExec.id },
                    data: { status: 'RUNNING', startedAt: new Date() }
                });
                await this.triggerSubWorkflow(childExec);
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
        const nodes = workflow.nodes as any[];
        const edges = workflow.edges as any[];
        const taskRecords = workflowExecution.taskExecutionRecords;

        // 2. Find ALL next candidate nodes (downstream from the completed task)
        const outgoingEdges = edges.filter(edge => edge.source === nodeId);
        
        for (const edge of outgoingEdges) {
            const nextNodeId = edge.target;
            const nextNode = nodes.find(n => n.id === nextNodeId);
            if (!nextNode) continue;

            // 3. Fan-in logic: Check if ALL predecessors for 'nextNode' are finished
            const incomingEdges = edges.filter(e => e.target === nextNodeId);
            const predecessorNodeIds = incomingEdges.map(e => e.source);
            
            const predecessorRecords = taskRecords.filter(r => predecessorNodeIds.includes(r.nodeId));
            
            // Check if all predecessors have an execution record and are finished
            const allFinished = predecessorNodeIds.every(pid => {
                const record = taskRecords.find(r => r.nodeId === pid);
                return record && ['SUCCESS', 'FAILED', 'TIMEOUT', 'NO_WORKER_FOUND', 'MAJOR', 'MINOR', 'WARNING', 'INFORMATION'].includes(record.status);
            });

            if (!allFinished) {
                this.logger.debug(`[Orchestration] Node ${nextNodeId} waiting for other predecessors. Finished: ${predecessorRecords.length}/${predecessorNodeIds.length}`);
                continue; // Wait for other branches
            }

            // 4. Check Failure Strategies & Edge Conditions: Should we actually trigger this node?
            const strategy = nodes.find(n => n.id === nodeId)?.failureStrategy || 'SUCCESS_REQUIRED';

            // Check if the specific edge that leads to this trigger matches the current status
            const condition = edge.condition || 'ALWAYS';
            const statusMatch = condition === 'ALWAYS' || 
                                (condition === 'ON_SUCCESS' && status === 'SUCCESS') ||
                                (condition === 'ON_FAILURE' && status !== 'SUCCESS');

            if (!statusMatch) {
                this.logger.debug(`[Orchestration] Edge ${edge.id} skipped - status ${status} does not match condition ${condition}`);
                continue;
            }

            // If task failed and strategy is SUCCESS_REQUIRED, we don't proceed even if edge is ON_FAILURE / ALWAYS
            if (status !== 'SUCCESS' && strategy === 'SUCCESS_REQUIRED') {
                this.logger.warn(`[Orchestration] Node ${nextNodeId} BLOCKED because predecessor ${nodeId} failed with SUCCESS_REQUIRED`);
                continue;
            }

            const blocker = predecessorRecords.find(r => {
                const nodeDef = nodes.find(n => n.id === r.nodeId);
                const strat = nodeDef?.failureStrategy || 'SUCCESS_REQUIRED';
                return r.status !== 'SUCCESS' && strat === 'SUCCESS_REQUIRED';
            });

            if (blocker) {
                this.logger.warn(`[Orchestration] Node ${nextNodeId} BLOCKED because some predecessor failed with SUCCESS_REQUIRED`);
                continue;
            }



            // 5. Trigger the task
            // Determine targeting
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
                    this.logger.warn(`[Orchestration] NO VALID WORKER FOUND for next node ${nextNode.id}`);
                    initialStatus = 'NO_WORKER_FOUND';
                }
            }

            // Ensure we don't create duplicate executions for the same node in this run
            const existing = await this.prisma.taskExecution.findFirst({
                where: { workflowExecutionId, nodeId: nextNode.id }
            });

            // Pre-gather workflow context to store in the task input. 
            // This ensures the worker has everything it needs and the UI can inspect the EXACT state at trigger time.
            const { workflowVars } = await this.gatherWorkflowContext(workflowExecutionId);

            if (!existing) {
                const isUtility = (nextNode as any).taskType === 'VARIABLE' || 
                                  (nextNode as any).taskId === '00000000-0000-0000-0000-000000000001' || 
                                  (nextNode as any).taskId === 'util-vars';
                const isNested = (nextNode as any).taskType === 'WORKFLOW';
                const SYSTEM_VAR_ID = '00000000-0000-0000-0000-000000000001';

                const nextTaskExec = await this.prisma.taskExecution.create({
                    data: {
                        taskId: (isUtility || isNested) ? null : nextNode.taskId,
                        nodeId: nextNode.id,
                        workflowExecutionId,
                        status: isNested ? 'RUNNING' : initialStatus,
                        targetWorkerId,
                        targetTags,
                        startedAt: new Date(), // Initialize for FIFO sorting
                        input: { 
                            utility: isUtility,
                            nested: isNested,
                            workflowVars, // Crucial for PWF VMA inspection
                            subWorkflowId: isNested ? nextNode.taskId : undefined,
                            taskType: (nextNode as any).taskType || (isUtility ? 'VARIABLE' : (isNested ? 'WORKFLOW' : 'HTTP')),
                            variableExtraction: nextNode.variableExtraction || { vars: {} },
                            sanityChecks: nextNode.sanityChecks || [],
                            authorization: nextNode.authorization,
                            inputMapping: nextNode.inputMapping // Important for WORKFLOW
                        }
                    },
                });
                this.logger.log(`[Orchestration] Triggered next node: ${nextNode.id} (${nextNode.label}) type=${(nextNode as any).taskType}`);
                
                if (isNested) {
                    await this.triggerSubWorkflow(nextTaskExec);
                }
                // Utility tasks (VARIABLE) are created as PENDING (initialStatus) 
                // and will be picked up by workers. No special case needed here.
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
        }

        // 4. Update WorkflowExecution with final status and results
        await this.prisma.workflowExecution.update({
            where: { id: workflowExecutionId },
            data: {
                status: finalStatus,
                completedAt: isFullyDone ? now : null,
                duration: duration,
                // taskExecutions is a JSON column — store the final context snapshot there
                ...(isFullyDone ? {
                    taskExecutions: {
                        finalVariables: filteredVars,
                        summary: `Workflow finished with ${Object.keys(filteredVars || {}).length} variables context.`
                    }
                } : {})
            }
        });

        // 5. If this was a sub-workflow, resume the parent task
        const exec = execution as any;
        if (isFullyDone && exec.parentTaskExecutionId) {
            this.logger.log(`[Orchestration] Sub-workflow ${workflowExecutionId} finished. Resuming parent task ${exec.parentTaskExecutionId} with ${Object.keys(filteredVars || {}).length} variables.`);
            
            await this.completeExecution(exec.parentTaskExecutionId, { 
                status: finalStatus === 'SUCCESS' ? 200 : 500,
                data: `Sub-workflow ${execution.workflowName} finished with status ${finalStatus}`,
                subWorkflowId: workflowExecutionId,
                childExecutionId: workflowExecutionId, // For UI direct navigation
                variables: filteredVars // Propagate only filtered variables to parent task context
            });
        }
    }
}
