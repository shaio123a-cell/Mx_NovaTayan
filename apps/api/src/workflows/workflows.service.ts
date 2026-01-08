import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';

@Injectable()
export class WorkflowsService {
    constructor(private prisma: PrismaService) { }

    async create(createWorkflowDto: CreateWorkflowDto, ownerId: string) {
        // Sanitize input to remove legacy 'workerGroup'
        const { workerGroup, ...rest } = createWorkflowDto as any;

        // Also strip 'workerGroup' from nodes if present
        const sanitizedNodes = (rest.nodes || []).map((node: any) => {
            const { workerGroup, ...nodeRest } = node;
            return nodeRest;
        });

        return this.prisma.workflow.create({
            data: {
                ...rest,
                ownerId,
                nodes: sanitizedNodes,
                edges: rest.edges || [],
                scope: rest.scope || 'GLOBAL',
            },
        });
    }

    async findAll(ownerId?: string) {
        return this.prisma.workflow.findMany({
            where: ownerId ? { ownerId } : undefined,
            orderBy: { createdAt: 'desc' },
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
        return this.prisma.workflow.update({
            where: { id },
            data: updateWorkflowDto,
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

        // 1. Create WorkflowExecution
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
        const nodes = workflow.nodes as any[];
        const edges = workflow.edges as any[];

        const targetNodeIds = new Set(edges.map(e => e.target));
        const startNodes = nodes.filter(n => !targetNodeIds.has(n.id));

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

            if (workers.length === 0) {
                // Fallback: Just one pending execution that might wait for a worker?
                // Or failing immediately? Let's just create one standard execution.
            } else {
                // Create N executions, one per worker
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
                    // They will inherit the childExecution.targetWorkerId
                    for (const node of startNodes) {
                        await this.prisma.taskExecution.create({
                            data: {
                                taskId: node.taskId,
                                nodeId: node.id,
                                workflowExecutionId: childExecution.id,
                                status: 'PENDING',
                                targetWorkerId: worker.id, // Explicitly target this worker
                                targetTags: [],
                            },
                        });
                    }
                    executions.push(childExecution);
                }

                // Mark the "Parent" execution as COMPLETED (it was just a router)
                await this.prisma.workflowExecution.update({
                    where: { id: execution.id },
                    data: { status: 'COMPLETED', completedAt: new Date() }
                });

                return {
                    parent: execution,
                    children: executions
                };
            }
        }

        // Standard Single Execution (No Workflow-level Fan-out)
        for (const node of startNodes) {
            await this.prisma.taskExecution.create({
                data: {
                    taskId: node.taskId,
                    nodeId: node.id,
                    workflowExecutionId: execution.id,
                    status: 'PENDING',
                    targetWorkerId: node.targetWorkerId,
                    targetTags: node.targetTags || [],
                },
            });
        }

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
                taskExecutionRecords: {
                    include: { task: true },
                    orderBy: { startedAt: 'asc' }
                }
            }
        });
    }
}
