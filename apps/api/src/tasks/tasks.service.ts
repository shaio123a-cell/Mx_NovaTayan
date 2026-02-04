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

        // Ensure System Variables Utility Task exists
        const SYSTEM_VAR_ID = '00000000-0000-0000-0000-000000000001';
        const varTask = await this.prisma.task.findUnique({ where: { id: SYSTEM_VAR_ID } });
        if (!varTask) {
            this.logger.log('Creating System Variables Utility Task...');
            // Need a system owner ID. We'll try to find any admin or just use a fixed ID if we can't.
            // For now, we'll use a placeholder owner or find the first user.
            const firstUser = await this.prisma.user.findFirst();
            if (firstUser) {
                await this.prisma.task.create({
                    data: {
                        id: SYSTEM_VAR_ID,
                        name: 'VARIABLE_UTILITY',
                        description: 'System task for variable manipulation and transformation',
                        scope: 'GLOBAL',
                        ownerId: firstUser.id,
                        command: { method: 'VAR' } as any,
                        tags: ['system', 'utility']
                    }
                });
            }
        }
    }

    async create(createTaskDto: CreateTaskDto, ownerId: string) {
        const { method, url, headers, body, timeout, scope, tags, groupIds, ...rest } = createTaskDto;
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
        await this.findOne(id);

        const { method, url, headers, body, timeout, groupIds, ...rest } = updateTaskDto;
        const commandUpdate: any = {};
        if (method) commandUpdate.method = method;
        if (url) commandUpdate.url = url;
        if (headers !== undefined) commandUpdate.headers = headers;
        if (body !== undefined) commandUpdate.body = body;
        if (timeout !== undefined) commandUpdate.timeout = timeout;

        const updateData: any = { ...rest };
        if ('workerGroup' in updateData) delete updateData.workerGroup;

        if (Object.keys(commandUpdate).length > 0) {
            const existing = await this.findOne(id);
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

        return this.prisma.task.update({
            where: { id },
            data: updateData,
            include: { groups: true }
        });
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
            const nodes = wf.nodes as any[];
            return nodes.some(n => n.taskId === taskId);
        });

        return {
            count: impactedWorkflows.length,
            workflows: impactedWorkflows.map(wf => ({
                id: wf.id,
                name: wf.name
            })).slice(0, 10)
        };
    }
}
