import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class WorkflowsService {
    constructor(
        private prisma: PrismaService,
        private logger: LoggerService
    ) {
        this.logger.setContext(WorkflowsService.name);
    }

    async create(createWorkflowDto: CreateWorkflowDto, ownerId: string) {
        const data = createWorkflowDto as any;
        
        // Map the legacy 'workerGroup' string to the 'tags' array if tags aren't provided
        const workflowTags = data.tags || (data.workerGroup ? [data.workerGroup] : []);

        // Sanitize nodes to ensure they use targetTags/targetWorkerId correctly
        const processedNodes = (data.nodes || []).map((node: any) => {
            return {
                ...node,
                // Ensure targetTags is an array from potential workerGroup string
                targetTags: node.targetTags || (node.workerGroup ? [node.workerGroup] : []),
            };
        });

        return this.prisma.workflow.create({
            data: {
                name: data.name,
                description: data.description,
                scope: data.scope || 'GLOBAL',
                ownerId,
                nodes: processedNodes,
                edges: data.edges || [],
                tags: workflowTags,
                enabled: data.enabled ?? false,
            },
        });
    }

    async findAll(ownerId?: string) {
        return this.prisma.workflow.findMany({
            where: ownerId ? { ownerId } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                executions: {
                    orderBy: { startedAt: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        status: true,
                        duration: true,
                        startedAt: true,
                        taskExecutionRecords: {
                            select: {
                                status: true
                            }
                        }
                    }
                }
            }
        });
    }

    async findOne(id: string) {
        const workflow = await this.prisma.workflow.findUnique({
            where: { id },
        });

        if (!workflow) {
            throw new NotFoundException(`Workflow with ID ${id} not found`);
        }

        return workflow;
    }

    async update(id: string, updateWorkflowDto: UpdateWorkflowDto) {
        await this.findOne(id);
        const data = updateWorkflowDto as any;

        // Map tags/nodes if they exist in the update
        const updateData: any = { ...data };

        if (data.workerGroup !== undefined || data.tags !== undefined) {
            updateData.tags = data.tags || (data.workerGroup ? [data.workerGroup] : []);
        }

        if (data.nodes) {
            updateData.nodes = data.nodes.map((node: any) => ({
                ...node,
                targetTags: node.targetTags || (node.workerGroup ? [node.workerGroup] : []),
            }));
        }

        return this.prisma.workflow.update({
            where: { id },
            data: updateData,
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        // Manual cascading delete (safer if DB constraints aren't perfect)
        // 1. Find all executions
        const executions = await this.prisma.workflowExecution.findMany({ where: { workflowId: id } });
        const executionIds = executions.map(e => e.id);

        // 2. Delete all tasks for these executions
        if (executionIds.length > 0) {
            await this.prisma.taskExecution.deleteMany({
                where: { workflowExecutionId: { in: executionIds } }
            });

            // 3. Delete executions
            await this.prisma.workflowExecution.deleteMany({
                where: { id: { in: executionIds } }
            });
        }

        return this.prisma.workflow.delete({
            where: { id },
        });
    }

    async removeExecution(id: string) {
        const execution = await this.prisma.workflowExecution.findUnique({ where: { id } });
        if (!execution) {
            throw new NotFoundException(`Workflow Execution ${id} not found`);
        }

        // 1. Delete associated task executions
        await this.prisma.taskExecution.deleteMany({
            where: { workflowExecutionId: id }
        });

        // 2. Delete the execution itself
        return this.prisma.workflowExecution.delete({
            where: { id }
        });
    }

    async enqueueExecution(workflowId: string, triggeredBy: 'MANUAL' | 'SCHEDULE' | 'SIGNAL' = 'MANUAL', userId?: string) {
        const workflow = await this.findOne(workflowId);
        this.logger.log(`[Trace] Enqueuing execution for workflow: ${workflow.name} (${workflowId})`);
        const execution = await this.prisma.workflowExecution.create({
            data: {
                workflowId,
                workflowName: workflow.name,
                workflowVersion: workflow.version,
                status: 'RUNNING',
                triggeredBy,
                triggeredByUser: userId || 'system',
                startedAt: new Date(),
                taskExecutions: [], // Historical compatibility or metadata
            },
        });

        // 2. Identify start nodes (nodes with no incoming edges)
        let nodes = workflow.nodes as any;
        let edges = workflow.edges as any;

        // Ensure nodes and edges are arrays (sometimes JSON might be stringified twice or stored as object)
        if (typeof nodes === 'string') nodes = JSON.parse(nodes);
        if (typeof edges === 'string') edges = JSON.parse(edges);
        if (!Array.isArray(nodes)) nodes = Object.values(nodes || {});
        this.logger.log(`[Trace] Raw Nodes Data: ${JSON.stringify(nodes)}`);
        this.logger.log(`[Trace] Raw Edges Data: ${JSON.stringify(edges)}`);
        this.logger.log(`[Trace] Workflow nodes length: ${nodes.length}, edges length: ${edges.length}`);

        const targetNodeIds = new Set(edges.map((e: any) => e.target));
        const startNodes = nodes.filter((n: any) => !targetNodeIds.has(n.id));
        
        this.logger.log(`[Trace] Identified ${startNodes.length} start nodes: ${startNodes.map(n => n.id).join(', ')}`);

        // 3. Fan-out / Broadcast Logic
        // Check if the workflow itself is targeted or if we proceed with single execution
        // For simpler fan-out, we check if the FIRST node targets a tag? 
        // OR: We accept an override here.
        // CURRENT PLAN: If `workflow.tags` has content, we fan-out to all workers matching those tags.
        // OTHERWISE: Single execution.

        const targetTags = workflow.tags || [];

        if (targetTags.length > 0) {
            // Fan-out Mode
            const workers = await this.prisma.worker.findMany({
                where: {
                    status: 'ONLINE',
                    tags: { hasSome: targetTags }
                }
            });

            if (workers.length > 1) {
                // Create N executions, one per worker (Broadcast)
                const executions = [];
                for (const worker of workers) {
                    const childExecution = await this.prisma.workflowExecution.create({
                        data: {
                            workflowId,
                            workflowName: workflow.name,
                            workflowVersion: workflow.version,
                            status: 'RUNNING',
                            triggeredBy,
                            triggeredByUser: userId || 'system',
                            startedAt: new Date(),
                            parentExecutionId: execution.id, // Link to the 'master' request
                            targetWorkerId: worker.id,       // Pin to this worker
                            taskExecutions: [],
                        },
                    });

                    // Create start tasks for this child execution
                    for (const node of startNodes) {
                        await this.prisma.taskExecution.create({
                            data: {
                                taskId: node.taskId,
                                nodeId: node.id,
                                workflowExecutionId: childExecution.id,
                                status: 'PENDING',
                                targetWorkerId: worker.id, // Explicitly target this worker
                            },
                        });
                    }
                    executions.push(childExecution);
                }

                // Mark the "Parent" execution as SUCCESS (it was just a router)
                await this.prisma.workflowExecution.update({
                    where: { id: execution.id },
                    data: { status: 'SUCCESS', completedAt: new Date() }
                });

                return {
                    parent: execution,
                    children: executions
                };
            } else if (workers.length === 1) {
                // Only one worker found - pin the PARENT execution to it instead of fanning out.
                // This prevents redundant "Master + Child" entries in progress history.
                await this.prisma.workflowExecution.update({
                    where: { id: execution.id },
                    data: { targetWorkerId: workers[0].id }
                });
                
                this.logger.log(`[Trace] Single worker found for tags [${targetTags.join(', ')}]. Pinning execution ${execution.id} to worker ${workers[0].id}`);
            }
        }

        // Standard Single Execution (No Workflow-level Fan-out)
        this.logger.log(`[Trace] Processing ${startNodes.length} start nodes for execution ${execution.id}`);
        let startedCount = 0;

        for (const node of startNodes) {
            try {
                // Resolution Logic: Explicit Node Tags > Workflow Default Tags
                const nodeTags = (node.targetTags && node.targetTags.length > 0) 
                    ? node.targetTags 
                    : (workflow.tags || []);

                this.logger.log(`[Trace] Resolving tags for node ${node.id}: [${nodeTags.join(', ')}]`);

                // Strict Worker Check:
                let initialStatus = 'PENDING';
                if (nodeTags.length > 0) {
                    const matchingWorkerCount = await this.prisma.worker.count({
                        where: {
                            status: 'ONLINE',
                            tags: { hasSome: nodeTags }
                        }
                    });
                    
                    if (matchingWorkerCount === 0) {
                        this.logger.warn(`[Trace] NO WORKER FOUND for node ${node.id} with tags [${nodeTags.join(', ')}]`);
                        initialStatus = 'NO_WORKER_FOUND';
                    }
                }

                const taskExec = await this.prisma.taskExecution.create({
                    data: {
                        taskId: node.taskId,
                        nodeId: node.id,
                        workflowExecutionId: execution.id,
                        status: initialStatus,
                        targetWorkerId: node.targetWorkerId,
                        targetTags: nodeTags,
                    },
                });
                
                this.logger.log(`[Trace] Created TaskExecution successfully: ${taskExec.id}`);
                startedCount++;
            } catch (err: any) {
                this.logger.error(`[Trace] CRITICAL: Failed to create TaskExecution for node ${node.id}: ${err.message}`, err.stack);
            }
        }

        this.logger.log(`[Trace] Workflow execution ${execution.id} started with ${startedCount} tasks.`);
        return execution;
    }

    async getExecutions(workflowId: string) {
        return this.prisma.workflowExecution.findMany({
            where: { workflowId },
            orderBy: { startedAt: 'desc' },
            take: 10,
        });
    }

    async getAllExecutions() {
        return this.prisma.workflowExecution.findMany({
            orderBy: { startedAt: 'desc' },
            take: 50,
        });
    }

    async getExecutionDetail(id: string) {
        return this.prisma.workflowExecution.findUnique({
            where: { id },
            include: {
                workflow: true,
                taskExecutionRecords: {
                    include: { task: true },
                    orderBy: { startedAt: 'asc' }
                }
            }
        });
    }

    async getSystemStats() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const [workflowsCount, tasksCount, failures24h] = await Promise.all([
            this.prisma.workflow.count(),
            this.prisma.task.count(),
            this.prisma.workflowExecution.count({
                where: {
                    status: 'FAILED',
                    startedAt: { gte: yesterday }
                }
            })
        ]);

        return {
            totalWorkflows: workflowsCount,
            totalTasks: tasksCount,
            failures24h
        };
    }
    async terminateExecution(id: string) {
        const execution = await this.prisma.workflowExecution.findUnique({
            where: { id },
            include: { taskExecutionRecords: true }
        });

        if (!execution) throw new NotFoundException('Execution not found');

        // Mark execution as FAILED
        await this.prisma.workflowExecution.update({
            where: { id },
            data: { 
                status: 'FAILED',
                completedAt: new Date()
            }
        });

        // Mark all PENDING/RUNNING tasks as FAILED
        await this.prisma.taskExecution.updateMany({
            where: { 
                workflowExecutionId: id,
                status: { in: ['PENDING', 'RUNNING'] }
            },
            data: { 
                status: 'FAILED',
                completedAt: new Date(),
                error: 'Terminated by user'
            }
        });

        return { success: true };
    }
}
