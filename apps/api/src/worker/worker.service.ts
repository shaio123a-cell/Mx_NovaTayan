import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class WorkerService {
    private readonly logger = new LoggerService(WorkerService.name);

    constructor(private prisma: PrismaService) { }

    async getNextPendingTask(hostname: string, tags: string[] = []) {
        // Fetch worker fresh from DB to get authoritative tags
        const worker = await this.prisma.worker.findUnique({ where: { hostname } });
        if (!worker || worker.status === 'DISABLED') return null;

        // DEBUG: Trace polling logic
        this.logger.debug(`Hostname: ${hostname} DB Tags: ${worker?.tags} Arg Tags: ${tags} Polling...`);

        // 1. Priority: Find a task targeted specifically to this worker or its tags
        try {
            let task = await this.prisma.taskExecution.findFirst({
                where: {
                    status: 'PENDING',
                    OR: [
                        { targetWorkerId: worker.id },
                        { targetTags: { hasSome: worker.tags } }
                    ]
                },
                include: { task: true },
                orderBy: { startedAt: 'asc' }, // FIFO
            });


            // 2. Fallback: Find a global task (no specific target) if no targeted task found
            if (!task) {
                const totalPending = await this.prisma.taskExecution.count({ where: { status: 'PENDING' } });
                this.logger.log(`[Debug] Checking global tasks. Total Pending in DB: ${totalPending}`);

                // Relaxed Query: Fetch ANY pending task without a worker ID, check tags in code
                const potentialTasks = await this.prisma.taskExecution.findMany({
                    where: {
                        status: 'PENDING',
                        targetWorkerId: null,
                    },
                    take: 5,
                    include: { task: true },
                    orderBy: { startedAt: 'asc' },
                });

                // Find first one with empty tags
                task = potentialTasks.find(t => !t.targetTags || t.targetTags.length === 0);

                if (task) {
                    this.logger.log(`[Debug] Found global task via code filtering: ${task.id}`);
                } else if (potentialTasks.length > 0) {
                    this.logger.warn(`[Debug] Found ${potentialTasks.length} unassigned tasks but they all have tags: ${potentialTasks.map(t => t.targetTags)}`);
                } else {
                    this.logger.warn(`[Debug] No unassigned tasks found.`);
                }
            }

            if (task) {
                this.logger.log(`Worker ${hostname} picked up execution ${task.id} (Target: ${task.targetWorkerId || 'Global'}, Tags: ${task.targetTags})`);
            }

            return task;
        } catch (e) {
            this.logger.error(`Failed to poll for tasks: ${e.message}`, e.stack);
            throw e;
        }
    }

    async register(data: { hostname: string; ipAddress?: string; name?: string; tags?: string[] }) {
        return this.prisma.worker.upsert({
            where: { hostname: data.hostname },
            update: {
                ipAddress: data.ipAddress,
                status: 'ONLINE',
                lastSeen: new Date(),
                tags: data.tags || [],
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

    async completeExecution(executionId: string, result: any, error?: string) {
        const status = error ? 'FAILED' : 'COMPLETED';
        const execution = await this.prisma.taskExecution.findUnique({ where: { id: executionId } });
        const duration = execution ? new Date().getTime() - execution.startedAt.getTime() : 0;

        const updated = await this.prisma.taskExecution.update({
            where: { id: executionId },
            data: {
                status,
                result: result || {},
                error: error || null,
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

    private async handleWorkflowOrchestration(completedTask: any) {
        const { workflowExecutionId, nodeId, status } = completedTask;

        // 1. Get workflow definition
        const workflowExecution = await this.prisma.workflowExecution.findUnique({
            where: { id: workflowExecutionId },
            include: { workflow: true }
        });

        if (!workflowExecution || !workflowExecution.workflow) return;

        const workflow = workflowExecution.workflow;
        const edges = workflow.edges as any[];

        // 2. Find next nodes to trigger
        // For now, simplicity: satisfy 'ON_SUCCESS' if status is COMPLETED, 
        // satisfay 'ON_FAILURE' if status is FAILED, satisfy 'ALWAYS' regardless.
        const nextNodes = edges
            .filter(edge => edge.source === nodeId)
            .filter(edge => {
                if (edge.condition === 'ALWAYS') return true;
                if (edge.condition === 'ON_SUCCESS' && status === 'COMPLETED') return true;
                if (edge.condition === 'ON_FAILURE' && status === 'FAILED') return true;
                return false;
            });

        // 3. Trigger next tasks
        const nodes = workflow.nodes as any[];
        for (const edge of nextNodes) {
            const nextNode = nodes.find(n => n.id === edge.target);
            if (nextNode) {
                // Determine targeting for the next task
                // 1. If the node has explicit targeting, use it.
                // 2. If not, AND the workflow execution is pinned (Fan-out child), use the pinned worker.
                let targetWorkerId = nextNode.targetWorkerId;
                let targetTags = nextNode.targetTags || [];

                if (!targetWorkerId && workflowExecution.targetWorkerId) {
                    targetWorkerId = workflowExecution.targetWorkerId;
                }

                await this.prisma.taskExecution.create({
                    data: {
                        taskId: nextNode.taskId,
                        nodeId: nextNode.id,
                        workflowExecutionId,
                        status: 'PENDING',
                        targetWorkerId,
                        targetTags,
                    },
                });
            }
        }

        // 4. Update workflow execution status if finished
        await this.checkWorkflowCompletion(workflowExecutionId);
    }

    private async checkWorkflowCompletion(workflowExecutionId: string) {
        const activeTasks = await this.prisma.taskExecution.count({
            where: {
                workflowExecutionId,
                status: { in: ['PENDING', 'RUNNING'] }
            }
        });

        if (activeTasks === 0) {
            // Check if any failed
            const failedTasks = await this.prisma.taskExecution.count({
                where: {
                    workflowExecutionId,
                    status: 'FAILED'
                }
            });

            await this.prisma.workflowExecution.update({
                where: { id: workflowExecutionId },
                data: {
                    status: failedTasks > 0 ? 'FAILED' : 'SUCCESS',
                    completedAt: new Date(),
                }
            });
        }
    }
}
