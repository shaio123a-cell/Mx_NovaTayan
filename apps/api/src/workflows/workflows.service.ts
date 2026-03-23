import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';
import { CreateBindingDto, UpdateBindingDto } from './dto/binding.dto';
import { LoggerService } from '../common/logger/logger.service';
import { suggestIcon } from '../tasks/utils/icon-mapper';
import { WorkerService } from '../worker/worker.service';
import { VariableEngine } from '../../../../packages/shared-xform/variable_engine';

@Injectable()
export class WorkflowsService {
    constructor(
        private prisma: PrismaService,
        private logger: LoggerService,
        @Inject(forwardRef(() => WorkerService))
        private workerService: WorkerService
    ) {
        this.logger.setContext(WorkflowsService.name);
    }

    async create(createWorkflowDto: CreateWorkflowDto, ownerId: string) {
        const data = createWorkflowDto as any;
        
        // Map the legacy 'workerGroup' string to the 'tags' array if tags aren't provided
        const workflowTags = data.tags || (data.workerGroup ? [data.workerGroup] : []);

        // Auto-suggest icon if not provided
        const finalIcon = data.icon || suggestIcon(data.name);

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
                icon: finalIcon,
                tags: workflowTags,
                enabled: data.enabled ?? false,
                inputVariables: data.inputVariables || {},
                outputVariables: data.outputVariables || {},
                scheduling: data.scheduling,
                notifications: data.notifications || [],
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
        const existing = await this.findOne(id);
        const data = updateWorkflowDto as any;

        // Map tags/nodes if they exist in the update
        const updateData: any = { ...data };

        if (data.workerGroup !== undefined || data.tags !== undefined) {
            updateData.tags = data.tags || (data.workerGroup ? [data.workerGroup] : []);
        }

        // Auto-suggest icon on rename if not provided
        if (data.name && !data.icon) {
            updateData.icon = suggestIcon(data.name);
        }

        if (data.nodes) {
            updateData.nodes = data.nodes.map((node: any) => ({
                ...node,
                targetTags: node.targetTags || (node.workerGroup ? [node.workerGroup] : []),
            }));
            
            // Circular Dependency Detection
            await this.validateCircularDependencies(id, updateData.nodes);
        }

        return this.prisma.workflow.update({
            where: { id },
            data: updateData,
        });
    }

    private async validateCircularDependencies(workflowId: string, nodes: any[]) {
        const visited = new Set<string>();
        const recStack = new Set<string>();

        const checkUsage = async (currentId: string, currentNodes: any[]) => {
            if (recStack.has(currentId)) {
                throw new Error(`Circular dependency detected: Workflow ${currentId} calls itself via sub-workflows.`);
            }
            if (visited.has(currentId)) return;

            visited.add(currentId);
            recStack.add(currentId);

            const subWorkflowIds = currentNodes
                .filter((n: any) => n.taskType === 'WORKFLOW')
                .map((n: any) => n.taskId)
                .filter((id: any) => !!id);

            for (const subId of subWorkflowIds) {
                if (subId === currentId) {
                    throw new Error(`Direct recursive call detected in workflow ${currentId}.`);
                }
                const subWorkflow = await this.prisma.workflow.findUnique({ where: { id: subId } });
                if (subWorkflow) {
                    await checkUsage(subId, subWorkflow.nodes as any[]);
                }
            }

            recStack.delete(currentId);
        };

        await checkUsage(workflowId, nodes);
    }

    async getUsageStatus(id: string) {
        const workflows = await this.prisma.workflow.findMany({
            select: { id: true, name: true, nodes: true }
        });

        const dependents = workflows.filter(wf => {
            const nodes = wf.nodes as any[];
            return nodes?.some(n => n.taskType === 'WORKFLOW' && n.taskId === id);
        }).map(wf => ({ id: wf.id, name: wf.name }));

        return {
            usageCount: dependents.length,
            dependents
        };
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

    async enqueueExecution(
        workflowId: string, 
        triggeredBy: 'MANUAL' | 'SCHEDULE' | 'SIGNAL' = 'MANUAL', 
        userId?: string, 
        initialVariables: Record<string, any> = {}, 
        sourceExecutionId?: string,
        bindingId?: string
    ) {
        const workflow = await this.findOne(workflowId);
        this.logger.log(`[Trace] Enqueuing execution for workflow: ${workflow.name} (${workflowId})`);
        
        // We store initial variables in taskExecutions JSON field as temporary metadata if needed for traceability
        const execution = await this.prisma.workflowExecution.create({
            data: {
                workflowId,
                workflowName: workflow.name,
                workflowVersion: workflow.version,
                status: 'RUNNING',
                triggeredBy,
                triggeredByUser: userId || 'system',
                startedAt: new Date(),
                taskExecutions: initialVariables ? { initialVariables } : [], // Historical compatibility or metadata
                sourceExecutionId,
                bindingId,
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
                        const isUtility = (node as any).taskType === 'VARIABLE' || 
                                          (node as any).taskId === '00000000-0000-0000-0000-000000000001' || 
                                          (node as any).taskId === 'util-vars';
                        const isNested = (node as any).taskType === 'WORKFLOW';

                        const { workflowVars } = await this.workerService.gatherWorkflowContext(childExecution.id);

                        const taskExec = await this.prisma.taskExecution.create({
                            data: {
                                taskId: (isUtility || isNested) ? null : node.taskId,
                                nodeId: node.id,
                                workflowExecutionId: childExecution.id,
                                status: isNested ? 'RUNNING' : 'PENDING',
                                targetWorkerId: worker.id, // Explicitly target this worker
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
                                    workflowVars
                                }
                            },
                        });
                        if (isNested) {
                            await this.workerService.triggerSubWorkflow(taskExec);
                        }
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

        const { workflowVars } = await this.workerService.gatherWorkflowContext(execution.id);

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

                this.logger.log(`[DEBUG] Evaluating node ${node.id} for VMA: taskType=${(node as any).taskType}, taskId=${node.taskId}`);
                const isUtility = (node as any).taskType === 'VARIABLE' || 
                                  (node as any).taskId === '00000000-0000-0000-0000-000000000001' || 
                                  (node as any).taskId === 'util-vars';
                const isNested = (node as any).taskType === 'WORKFLOW';

                const taskExec = await this.prisma.taskExecution.create({
                    data: {
                        taskId: (isUtility || isNested) ? null : node.taskId,
                        nodeId: node.id,
                        workflowExecutionId: execution.id,
                        status: isNested ? 'RUNNING' : initialStatus,
                        targetWorkerId: node.targetWorkerId,
                        targetTags: nodeTags,
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
                            workflowVars
                        }
                    },
                });
                
                this.logger.log(`[Trace] Created TaskExecution successfully: ${taskExec.id}`);
                
                if (isNested) {
                    await this.workerService.triggerSubWorkflow(taskExec);
                }
                
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
            include: { taskExecutionRecords: true },
            orderBy: { startedAt: 'desc' },
            take: 20,
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
                parentTaskExecution: {
                    include: {
                        workflowExecution: {
                            select: {
                                id: true,
                                workflowName: true
                            }
                        }
                    }
                },
                taskExecutionRecords: {
                    include: { 
                        task: true,
                        subWorkflows: {
                            select: { id: true }
                        }
                    },
                    orderBy: { startedAt: 'asc' }
                },
                triggeredExecutions: {
                    select: {
                        id: true,
                        workflowName: true,
                        status: true,
                        taskExecutions: true, // Holds metadata about trigger criteria
                        startedAt: true
                    }
                },
                sourceExecution: {
                    select: {
                        id: true,
                        workflowName: true
                    }
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

    // --- Bindings & Triggers (Scheduling System) ---

    async createBinding(workflowId: string, dto: CreateBindingDto) {
        await this.findOne(workflowId);
        return this.prisma.workflowScheduleBinding.create({
            data: {
                ...dto,
                workflowId,
                state: dto.state || 'ACTIVE'
            },
            include: { schedule: true, calendar: true }
        });
    }

    async getBindings(workflowId: string) {
        return this.prisma.workflowScheduleBinding.findMany({
            where: { workflowId },
            include: { schedule: true, calendar: true }
        });
    }

    async deleteBinding(id: string) {
        return this.prisma.workflowScheduleBinding.delete({
            where: { id }
        });
    }

    async patchBinding(id: string, dto: UpdateBindingDto) {
        return this.prisma.workflowScheduleBinding.update({
            where: { id },
            data: dto,
            include: { schedule: true, calendar: true }
        });
    }

    async triggerByEvent(workflowId: string, payload: any, idempotencyKey?: string) {
        // Here we would eventually check HMAC signatures and idempotency
        // For now, it's a wrapper around enqueueExecution
        return this.enqueueExecution(workflowId, 'SIGNAL', 'event-trigger', payload);
    }

    async triggerByToken(token: string, payload: { body: any, query: any, headers: any }) {
        const tokenRecord = await this.prisma.triggerToken.findUnique({
            where: { token, enabled: true },
            include: { workflow: true }
        });

        if (!tokenRecord) {
            throw new NotFoundException(`Invalid or disabled trigger token: ${token}`);
        }

        if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
            throw new Error(`Trigger token has expired`);
        }

        // --- Variable Mapping Logic ---
        const mapping = (tokenRecord.mapping || {}) as Record<string, string>;
        const initialVariables: Record<string, any> = {};

        if (Object.keys(mapping).length > 0) {
            this.logger.debug(`[Webhook] Applying mapping for token ${token.substring(0, 8)}...`);
            
            // Build the source context for the VariableEngine
            // We put everything under 'request' namespace to avoid collisions with workflow/global
            const engine = new VariableEngine({
                request: {
                    body: payload.body || {},
                    query: payload.query || {},
                    headers: payload.headers || {}
                },
                // Fallback support: handle direct 'body.x' in addition to 'request.body.x'
                body: payload.body || {},
                query: payload.query || {},
                headers: payload.headers || {}
            });

            for (const [workflowVarId, sourceTemplate] of Object.entries(mapping)) {
                try {
                    // Normalize: If it's a string without {{ }}, treat it as a path/expression by wrapping it
                    let templateToResolve = sourceTemplate;
                    if (typeof sourceTemplate === 'string' && !sourceTemplate.includes('{{')) {
                        templateToResolve = `{{ ${sourceTemplate} }}`;
                    }
                    
                    const resolvedValue = engine.resolveValue(templateToResolve);
                    initialVariables[workflowVarId] = resolvedValue;
                } catch (err) {
                    this.logger.error(`[Webhook] Mapping failed for variable ${workflowVarId}: ${err.message}`);
                }
            }
        } else {
            // Default behavior: if no mapping, just pass the body as the initial context if it's an object
            if (payload.body && typeof payload.body === 'object') {
                Object.assign(initialVariables, payload.body);
            }
        }

        return this.enqueueExecution(
            tokenRecord.workflowId, 
            'SIGNAL', 
            'token-trigger', 
            initialVariables
        );
    }

    // --- Trigger Token Management ---

    async getTriggerTokens(workflowId: string) {
        return this.prisma.triggerToken.findMany({
            where: { workflowId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async createTriggerToken(workflowId: string, description?: string, mapping: any = {}) {
        const { v4: uuidv4 } = require('uuid');
        const token = `whk_${uuidv4().replace(/-/g, '')}`;
        
        return this.prisma.triggerToken.create({
            data: {
                workflowId,
                token,
                description,
                mapping: mapping || {}
            }
        });
    }

    async deleteTriggerToken(id: string) {
        return this.prisma.triggerToken.delete({
            where: { id }
        });
    }

    async updateTriggerToken(id: string, data: any) {
        return this.prisma.triggerToken.update({
            where: { id },
            data
        });
    }
}
