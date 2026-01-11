import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class TasksService {
    constructor(
        private prisma: PrismaService,
        private logger: LoggerService
    ) {
        this.logger.setContext(TasksService.name);
    }

    async create(createTaskDto: CreateTaskDto, ownerId: string) {
        const { method, url, headers, body, timeout, scope, tags, ...rest } = createTaskDto;
        // Explicitly exclude any legacy fields if they slip through
        const cleanRest = { ...rest };
        if ('workerGroup' in cleanRest) delete (cleanRest as any).workerGroup;

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
                tags: createTaskDto.tags || [],
            },
        });
    }

    async findAll(ownerId?: string) {
        return this.prisma.task.findMany({
            where: ownerId ? { ownerId } : undefined,
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const task = await this.prisma.task.findUnique({
            where: { id },
        });

        if (!task) {
            throw new NotFoundException(`Task with ID ${id} not found`);
        }

        return task;
    }

    async update(id: string, updateTaskDto: UpdateTaskDto) {
        await this.findOne(id); // Check if exists

        const { method, url, headers, body, timeout, ...rest } = updateTaskDto;

        const commandUpdate: any = {};
        if (method) commandUpdate.method = method;
        if (url) commandUpdate.url = url;
        if (headers !== undefined) commandUpdate.headers = headers;
        if (body !== undefined) commandUpdate.body = body;
        if (timeout !== undefined) commandUpdate.timeout = timeout;

        const updateData: any = { ...rest };
        if ('workerGroup' in updateData) delete updateData.workerGroup;

        if (Object.keys(commandUpdate).length > 0) {
            // Merge with existing command
            const existing = await this.findOne(id);
            updateData.command = {
                ...(existing.command as any),
                ...commandUpdate,
            };
        }

        return this.prisma.task.update({
            where: { id },
            data: updateData,
        });
    }

    async remove(id: string) {
        await this.findOne(id); // Check if exists

        return this.prisma.task.delete({
            where: { id },
        });
    }

    async enqueueExecution(taskId: string) {
        await this.findOne(taskId); // Check if exists
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
            })).slice(0, 10) // Only first 10 for UI
        };
    }
}
