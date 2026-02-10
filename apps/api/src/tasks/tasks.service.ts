import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class TasksService implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        private logger: LoggerService
    ) {
        this.logger.setContext(TasksService.name);
    }

    async onModuleInit() {
        // Automatically create 'Global' group if it doesn't exist
        const globalGroup = await (this.prisma as any).taskGroup.findUnique({
            where: { name: 'Global' }
        });

        if (!globalGroup) {
            this.logger.log('Creating default Global task group...');
            await (this.prisma as any).taskGroup.create({
                data: { name: 'Global', description: 'Default global group' }
            });
        }

        // Cleanup: Remove legacy System Variables Utility Task if it exists
        const SYSTEM_VAR_ID = '00000000-0000-0000-0000-000000000001';
        try {
            await this.prisma.task.delete({ where: { id: SYSTEM_VAR_ID } });
            this.logger.log('Removed legacy System Variables Utility Task.');
        } catch (e) {
            // Ignore if already gone
        }
    }

    async create(createTaskDto: CreateTaskDto, ownerId: string) {
        const { method, url, headers, body, timeout, scope, tags, groupIds, authorization, ...rest } = createTaskDto;
        const cleanRest = { ...rest };
        if ('workerGroup' in cleanRest) delete (cleanRest as any).workerGroup;

        // Determine group connections
        const connections = groupIds && groupIds.length > 0
            ? groupIds.map(id => ({ id }))
            : [{ name: 'Global' }]; // Default to Global if none selected

        const command = {
            method,
            url,
            headers: headers || {},
            body: body || undefined,
            timeout: timeout || 30000,
            authorization: authorization || undefined
        };

        return this.prisma.task.create({
            data: {
                ...cleanRest,
                scope: scope || 'GLOBAL',
                ownerId,
                command,
                tags: tags || [],
                groups: {
                    connect: connections.map(c => c.id ? { id: c.id } : { name: 'Global' })
                }
            },
            include: { groups: true }
        });
    }

    async findAll(ownerId?: string) {
        return this.prisma.task.findMany({
            where: ownerId ? { ownerId } : undefined,
            orderBy: { createdAt: 'desc' },
            include: { groups: true }
        });
    }

    async findAllGroups() {
        return (this.prisma as any).taskGroup.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { tasks: true } } }
        });
    }

    async createGroup(name: string, description?: string) {
        return (this.prisma as any).taskGroup.create({
            data: { name, description }
        });
    }

    async findOne(id: string) {
        const task = await this.prisma.task.findUnique({
            where: { id },
            include: { groups: true }
        });

        if (!task) {
            throw new NotFoundException(`Task with ID ${id} not found`);
        }

        return task;
    }

    async update(id: string, updateTaskDto: UpdateTaskDto) {
        const existing = await this.findOne(id);

        const { method, url, headers, body, timeout, groupIds, authorization, ...rest } = updateTaskDto;
        const commandUpdate: any = {};
        if (method) commandUpdate.method = method;
        if (url) commandUpdate.url = url;
        if (headers !== undefined) commandUpdate.headers = headers;
        if (body !== undefined) commandUpdate.body = body;
        if (timeout !== undefined) commandUpdate.timeout = timeout;
        if (authorization !== undefined) commandUpdate.authorization = authorization;

        const updateData: any = { ...rest };
        if ('workerGroup' in updateData) delete updateData.workerGroup;

        if (Object.keys(commandUpdate).length > 0) {
            updateData.command = {
                ...(existing.command as any),
                ...commandUpdate,
            };
        }

        if (groupIds !== undefined) {
            updateData.groups = {
                set: groupIds.map(gid => ({ id: gid }))
            };
        }

        const updatedTask = await this.prisma.task.update({
            where: { id },
            data: updateData,
            include: { groups: true }
        });

        // Propagation logic: Update labels in all workflows if name changed
        if (rest.name && rest.name !== existing.name) {
            this.logger.log(`Propagating name change for task ${id}: ${existing.name} -> ${rest.name}`);
            const allWorkflows = await this.prisma.workflow.findMany();
            for (const wf of allWorkflows) {
                let nodes = wf.nodes as any[];
                if (typeof nodes === 'string') nodes = JSON.parse(nodes);
                
                let changed = false;
                const updatedNodes = nodes.map(node => {
                    if (node.taskId === id) {
                        changed = true;
                        return { ...node, label: rest.name };
                    }
                    return node;
                });

                if (changed) {
                    await this.prisma.workflow.update({
                        where: { id: wf.id },
                        data: { nodes: updatedNodes }
                    });
                }
            }
        }

        return updatedTask;
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.task.delete({
            where: { id },
        });
    }

    async deleteGroup(id: string) {
        const group = await (this.prisma as any).taskGroup.findUnique({ where: { id } });
        if (!group) throw new NotFoundException('Group not found');
        if (group.name === 'Global') throw new Error('Cannot delete Global group');

        return (this.prisma as any).taskGroup.delete({ where: { id } });
    }

    async enqueueExecution(taskId: string) {
        await this.findOne(taskId);
        return this.prisma.taskExecution.create({
            data: {
                taskId,
                status: 'PENDING',
            },
        });
    }

    async getExecutions(taskId: string) {
        return this.prisma.taskExecution.findMany({
            where: { taskId },
            orderBy: { startedAt: 'desc' },
            take: 10,
        });
    }

    async getImpact(taskId: string) {
        const workflows = await this.prisma.workflow.findMany();
        const impactedWorkflows = workflows.filter((wf: any) => {
            let nodes = wf.nodes as any[];
            if (typeof nodes === 'string') nodes = JSON.parse(nodes);
            return Array.isArray(nodes) && nodes.some(n => n.taskId === taskId);
        });

        return {
            count: impactedWorkflows.length,
            workflows: impactedWorkflows.map(wf => ({
                id: wf.id,
                name: wf.name
            })).slice(0, 50) // Increased limit for better visibility
        };
    }
}
