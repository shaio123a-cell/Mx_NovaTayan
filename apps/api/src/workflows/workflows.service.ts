import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkflowDto, UpdateWorkflowDto, CreateFolderDto, UpdateFolderDto } from './dto/workflow.dto';
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

    async findAll(ownerId?: string, folderId?: string) {
        return this.prisma.workflow.findMany({
            where: {
                ...(ownerId ? { ownerId } : {}),
                ...(folderId ? { folderId } : {}),
            },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'desc' }
            ],
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

        // Automatically increment version whenever the workflow is updated
        updateData.version = { increment: 1 };

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
            select: { id: true, name: true, nodes: true, notifications: true }
        });

        const activeInputKeys = new Set<string>();
        const activeOutputKeys = new Set<string>();

        const dependents = workflows.filter(wf => {
            // Robust parsing for nodes
            let nodes: any[] = [];
            try {
                nodes = (typeof wf.nodes === 'string' ? JSON.parse(wf.nodes) : wf.nodes) || [];
            } catch (e) {}

            // 1. Check if used as a Child Workflow (CWF) node
            const matchingNodes = nodes.filter(n => n.taskType === 'WORKFLOW' && n.taskId === id);
            
            if (matchingNodes?.length > 0) {
                matchingNodes.forEach(node => {
                    // Check inputs (parameters passed TO the child)
                    if (node.inputMapping) {
                        try {
                            const mapping = typeof node.inputMapping === 'string' ? JSON.parse(node.inputMapping) : node.inputMapping;
                            Object.keys(mapping).forEach(key => activeInputKeys.add(key));
                        } catch (e) {}
                    }
                });
                return true;
            }

            // Robust parsing for notifications
            let notifications: any[] = [];
            try {
                notifications = (typeof wf.notifications === 'string' ? JSON.parse(wf.notifications) : wf.notifications) || [];
            } catch (e) {}

            // 2. Check if used as an Event Trigger (notification)
            const matchingTrigger = notifications.find(n => n.workflowId === id);
            if (matchingTrigger) {
                if (matchingTrigger.inputs) {
                    Object.keys(matchingTrigger.inputs).forEach(key => activeInputKeys.add(key));
                }
                return true;
            }

            return false;
        }).map(wf => ({ id: wf.id, name: wf.name }));

        return {
            usageCount: dependents.length,
            dependents,
            activeInputKeys: Array.from(activeInputKeys),
            activeOutputKeys: Array.from(activeOutputKeys) // Placeholder for now
        };
    }

    async remove(id: string) {
        await this.findOne(id);

        const usage = await this.getUsageStatus(id);
        if (usage.usageCount > 0) {
            const names = usage.dependents.map(d => d.name).slice(0, 3).join(', ');
            const suffix = usage.usageCount > 3 ? ` and ${usage.usageCount - 3} more` : '';
            throw new Error(`Cannot delete workflow: It is used as a Child Workflow or Event Trigger by: ${names}${suffix}`);
        }

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

    async reorder(id: string, newOrder: number) {
        return this.prisma.workflow.update({
            where: { id },
            data: { order: newOrder }
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
                } else if (isUtility) {
                    // Start VMA execution (handled by same logic as in Orchestration)
                    await this.workerService.executeUtilityNode(taskExec);
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

    async getSystemStats(folderId?: string) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        let workflowIds: string[] | undefined;
        let folderIds: string[] | undefined;

        if (folderId) {
            // Find all descendant folders recursively
            const allFolders = await this.prisma.workflowGroup.findMany();
            folderIds = this.getAllDescendantFolderIds(folderId, allFolders);
            folderIds.push(folderId);

            // Get all workflows in these folders
            const workflows = await this.prisma.workflow.findMany({
                where: { folderId: { in: folderIds } },
                select: { id: true }
            });
            workflowIds = workflows.map(w => w.id);
        }

        const [workflowsCount, tasksCount, failures24h] = await Promise.all([
            // Total Workflows in this folder branch
            folderId 
              ? this.prisma.workflow.count({ where: { folderId: { in: folderIds } } })
              : this.prisma.workflow.count(),
            
            // Total Tasks 
            // If scoped: Count RUNNING task executions belonging to these workflows
            // If global: Count total task templates
            folderId
              ? this.prisma.taskExecution.count({ 
                  where: { 
                    workflowExecution: { workflowId: { in: workflowIds } },
                    status: 'RUNNING'
                  } 
                })
              : this.prisma.task.count(),

            // Failures in last 24h
            this.prisma.workflowExecution.count({
                where: {
                    status: 'FAILED',
                    startedAt: { gte: yesterday },
                    ...(workflowIds ? { workflowId: { in: workflowIds } } : {})
                }
            })
        ]);

        return {
            totalWorkflows: workflowsCount,
            totalTasks: tasksCount,
            failures24h
        };
    }

    private getAllDescendantFolderIds(parentId: string, allFolders: any[]): string[] {
        const children = allFolders.filter(f => f.parentId === parentId);
        let result: string[] = children.map(f => f.id);
        for (const child of children) {
            result = result.concat(this.getAllDescendantFolderIds(child.id, allFolders));
        }
        return result;
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

        // --- Listen Mode: capture sample if someone is watching ---
        const activeSample = await this.prisma.webhookSample.findUnique({
            where: { tokenId: tokenRecord.id }
        });
        if (activeSample && activeSample.expiresAt > new Date()) {
            // Refresh/update the sample with the real incoming payload
            await this.prisma.webhookSample.update({
                where: { tokenId: tokenRecord.id },
                data: {
                    body: payload.body || {},
                    headers: payload.headers || {},
                    query: payload.query || {},
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // reset TTL to 5 min
                }
            });
            this.logger.log(`[Listen Mode] Captured sample payload for token ${token.substring(0, 8)}...`);
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

    // --- Webhook Listen Mode ---

    async startListening(tokenId: string) {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL
        await this.prisma.webhookSample.upsert({
            where: { tokenId },
            create: { tokenId, body: {}, expiresAt },
            update: { body: {}, expiresAt } // reset any old sample and TTL
        });
        this.logger.log(`[Listen Mode] Started listening for token ${tokenId}`);
        return { listening: true, expiresAt };
    }

    async getSample(tokenId: string) {
        const sample = await this.prisma.webhookSample.findUnique({
            where: { tokenId }
        });

        if (!sample) return { ready: false };
        if (sample.expiresAt < new Date()) {
            // Expired — clean it up
            await this.prisma.webhookSample.delete({ where: { tokenId } }).catch(() => {});
            return { ready: false, expired: true };
        }

        // Has a real payload been received? Check if body is non-empty
        const hasPayload = sample.body && Object.keys(sample.body as object).length > 0;
        if (!hasPayload) return { ready: false };

        // Return it and immediately delete (read-once)
        await this.prisma.webhookSample.delete({ where: { tokenId } }).catch(() => {});
        return {
            ready: true,
            body: sample.body,
            headers: sample.headers,
            query: sample.query
        };
    }

    async stopListening(tokenId: string) {
        await this.prisma.webhookSample.deleteMany({ where: { tokenId } }).catch(() => {});
        return { listening: false };
    }

    async getFolderTree() {
        const allFolders = await this.prisma.workflowGroup.findMany({
            orderBy: { name: 'asc' }
        });

        const buildTree = (parentId: string | null = null): any[] => {
            return allFolders
                .filter(f => f.parentId === parentId)
                .map(f => ({
                    ...f,
                    children: buildTree(f.id)
                }));
        };

        return buildTree(null);
    }

    async createFolder(dto: CreateFolderDto) {
        return this.prisma.workflowGroup.create({
            data: {
                name: dto.name,
                description: dto.description,
                parentId: dto.parentId || null
            }
        });
    }

    async updateFolder(id: string, dto: UpdateFolderDto) {
        return this.prisma.workflowGroup.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                parentId: dto.parentId
            }
        });
    }

    async deleteFolder(id: string) {
        // Move all workflows in this folder to root
        await this.prisma.workflow.updateMany({
            where: { folderId: id },
            data: { folderId: null }
        });

        // Also move sub-folders to root (simple approach) or delete them
        // For now, let's just delete the folder. Recursive delete is complex without cascading.
        return this.prisma.workflowGroup.delete({
            where: { id }
        });
    }
}
