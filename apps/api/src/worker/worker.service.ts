import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { LoggerService } from '../common/logger/logger.service';
import { GlobalVarsService } from '../global-vars/global-vars.service';

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
                    const ctx = await this.gatherWorkflowContext(task.workflowExecutionId);
                    workflowVars = ctx.workflowVars;
                    macros = ctx.macros;
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

    private async gatherWorkflowContext(workflowExecutionId: string) {
        const records = await this.prisma.taskExecution.findMany({
            where: { workflowExecutionId },
            include: { task: true }
        });

        const workflowVars: Record<string, any> = {};
        const macros: Record<string, any> = {};

        for (const record of records) {
            const taskName = record.task.name;
            const result = record.result as any;
            if (!result) continue;

            // 1. Resolve variables
            // Task variables are saved in result.variables
            if (result.variables) {
                Object.assign(workflowVars, result.variables);
            }

            // 2. HTTP Shortcuts (macros)
            // HTTP.<taskName>.status, HTTP.<taskName>.body
            if (['SUCCESS', 'COMPLETED', 'FAILED'].includes(record.status)) {
                const shortcut = {
                    status: result.status,
                    body: result.data,
                    headers: result.headers
                };
                // Helper: key without spaces for easy dot access
                const cleanName = taskName.replace(/\s+/g, '_');
                macros[`HTTP.${cleanName}`] = shortcut;
                // Also store raw name if possible (though pathing with spaces is harder)
                macros[`HTTP.${taskName}`] = shortcut;
                
                // Save last shortcut too
                macros[`HTTP.last`] = shortcut;
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
                    ...(result || {}),
                    sanityResults: sanityResults || []
                },
                error: status === 'SUCCESS' ? null : (reason || error || null),
                input: input || null,
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

    private async evaluateStatus(execution: any, result: any, error?: string): Promise<{ status: string; reason?: string; sanityResults?: any[] }> {
        if (error) return { status: 'FAILED' };
        if (!result || result.status === undefined) return { status: 'FAILED', reason: 'Response missing status code' };

        const httpStatus = result.status;
        const task = execution.task;
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

        // 3. Regex Sanity Checks
        if (task.sanityChecks && Array.isArray(task.sanityChecks)) {
            const body = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
            for (const check of task.sanityChecks) {
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
                        this.logger.warn(`[SanityCheck] Task ${task.name} Status: ${check.severity === 'ERROR' ? 'FAILED' : 'WARNING'} - ${failureMsg}`);
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

            if (!existing) {
                const isUtility = (nextNode as any).taskType === 'VARIABLE';
                const SYSTEM_VAR_ID = '00000000-0000-0000-0000-000000000001';

                await this.prisma.taskExecution.create({
                    data: {
                        taskId: isUtility ? SYSTEM_VAR_ID : nextNode.taskId,
                        nodeId: nextNode.id,
                        workflowExecutionId,
                        status: initialStatus,
                        targetWorkerId,
                        targetTags,
                        startedAt: new Date(), // Initialize for FIFO sorting
                        input: isUtility ? { 
                            utility: true, 
                            taskType: 'VARIABLE',
                            variableExtraction: nextNode.variableExtraction || { vars: {} }
                        } : undefined
                    },
                });
                this.logger.log(`[Orchestration] Triggered next node: ${nextNode.id} (${nextNode.label})`);
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

        await this.prisma.workflowExecution.update({
            where: { id: workflowExecutionId },
            data: {
                status: finalStatus,
                completedAt: isFullyDone ? now : null,
                duration: duration
            }
        });
    }
}
