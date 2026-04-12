import { Injectable, NotFoundException, OnModuleInit, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto, CreateFolderDto, UpdateFolderDto } from './dto/task.dto';
import { LoggerService } from '../common/logger/logger.service';
import { suggestIcon } from './utils/icon-mapper';

@Injectable()
export class TasksService implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        private logger: LoggerService
    ) {
        this.logger.setContext(TasksService.name);
    }

    async onModuleInit() {
        // Automatically create 'Root' folders if they don't exist
        const globalGroup = await this.prisma.taskGroup.findFirst({
            where: { name: 'General', parentId: null }
        });

        if (!globalGroup) {
            this.logger.log('Creating default General task folder...');
            await this.prisma.taskGroup.create({
                data: { name: 'General', description: 'Default task folder' }
            });
        }
    }

    async create(createTaskDto: CreateTaskDto, ownerId: string) {
        const { method, url, headers, body, timeout, scope, tags, folderId, authorization, icon, ...rest } = createTaskDto;
        
        // Ensure folder exists or use first top-level folder
        let finalFolderId = folderId;
        if (!finalFolderId) {
            const defaultFolder = await this.prisma.taskGroup.findFirst({ where: { parentId: null } });
            finalFolderId = defaultFolder?.id;
        }

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
                ...rest,
                scope: scope || 'GLOBAL',
                ownerId,
                command,
                icon: icon || suggestIcon(createTaskDto.name),
                tags: tags || [],
                folderId: finalFolderId
            },
            include: { folder: true }
        });
    }

    async findAll(ownerId?: string) {
        return this.prisma.task.findMany({
            where: ownerId ? { ownerId } : undefined,
            orderBy: { createdAt: 'desc' },
            include: { folder: true }
        });
    }

    async getFolderTree() {
        // Fetch all folders to build tree in memory (simple for typical scale)
        const allFolders = await this.prisma.taskGroup.findMany({
            include: { 
                _count: { select: { tasks: true } }
            },
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
        try {
            return await this.prisma.taskGroup.create({
                data: {
                    name: dto.name,
                    description: dto.description,
                    parentId: dto.parentId || null
                }
            });
        } catch (e) {
            if (e.code === 'P2002') {
                throw new ConflictException(`A folder with name "${dto.name}" already exists in this location.`);
            }
            throw e;
        }
    }

    async updateFolder(id: string, dto: UpdateFolderDto) {
        return this.prisma.taskGroup.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                parentId: dto.parentId
            }
        });
    }

    async findOne(id: string) {
        const task = await this.prisma.task.findUnique({
            where: { id },
            include: { folder: true }
        });

        if (!task) {
            throw new NotFoundException(`Task with ID ${id} not found`);
        }

        return task;
    }

    async update(id: string, updateTaskDto: UpdateTaskDto) {
        const existing = await this.findOne(id);
        const { method, url, headers, body, timeout, folderId, authorization, ...rest } = updateTaskDto;
        
        const commandUpdate: any = {};
        if (method) commandUpdate.method = method;
        if (url) commandUpdate.url = url;
        if (headers !== undefined) commandUpdate.headers = headers;
        if (body !== undefined) commandUpdate.body = body;
        if (timeout !== undefined) commandUpdate.timeout = timeout;
        if (authorization !== undefined) commandUpdate.authorization = authorization;

        const updateData: any = { ...rest };
        if (Object.keys(commandUpdate).length > 0) {
            updateData.command = {
                ...(existing.command as any),
                ...commandUpdate,
            };
        }

        if (folderId !== undefined) {
            updateData.folderId = folderId;
        }

        if (updateTaskDto.name && !updateTaskDto.icon) {
            updateData.icon = suggestIcon(updateTaskDto.name);
        }

        const updatedTask = await this.prisma.task.update({
            where: { id },
            data: updateData,
            include: { folder: true }
        });

        // Propagation logic: Update nodes in all workflows if name changed
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
        const impact = await this.getImpact(id);
        if (impact.count > 0) {
            throw new BadRequestException(`Cannot delete task "${id}" because it is used by ${impact.count} workflow(s).`);
        }
        return this.prisma.task.delete({ where: { id } });
    }

    async deleteFolder(id: string) {
        const folder = await this.prisma.taskGroup.findUnique({ 
            where: { id },
            include: { children: true, tasks: true }
        });
        if (!folder) throw new NotFoundException('Folder not found');

        // 1. Gather all tasks in this folder and its subfolders recursively
        const allTaskIds: string[] = [];
        const foldersToProcess = [id];
        
        while (foldersToProcess.length > 0) {
            const currentId = foldersToProcess.pop();
            const f = await this.prisma.taskGroup.findUnique({
                where: { id: currentId },
                include: { children: true, tasks: true }
            });
            if (f) {
                allTaskIds.push(...f.tasks.map(t => t.id));
                foldersToProcess.push(...f.children.map(c => c.id));
            }
        }

        // 2. Check impact for all these tasks
        const allWorkflows = await this.prisma.workflow.findMany();
        const blockers: string[] = [];
        
        for (const wf of allWorkflows) {
            let nodes = wf.nodes as any[];
            if (typeof nodes === 'string') nodes = JSON.parse(nodes);
            if (Array.isArray(nodes) && nodes.some(n => allTaskIds.includes(n.taskId))) {
                blockers.push(wf.name);
            }
        }

        if (blockers.length > 0) {
            throw new BadRequestException({
                message: `Cannot delete folder "${folder.name}" because some the tasks inside are used by workflows.`,
                blockers: blockers.slice(0, 10), // Return first 10 for display
                totalBlockers: blockers.length
            });
        }

        // 3. No blockers? Delete all tasks and folders in the branch
        // We delete sub-folders first (Prisma one-by-one or depth-first)
        // Actually, deleting the tasks first is easier.
        await this.prisma.task.deleteMany({ where: { folderId: { in: [id] } } }); // Wait, need recursive deletion
        
        // Recursive deletion helper
        const recursiveDelete = async (fid: string) => {
            const subFolders = await this.prisma.taskGroup.findMany({ where: { parentId: fid } });
            for (const sub of subFolders) {
                await recursiveDelete(sub.id);
            }
            await this.prisma.task.deleteMany({ where: { folderId: fid } });
            await this.prisma.taskGroup.delete({ where: { id: fid } });
        };

        await recursiveDelete(id);
        return { success: true };
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
            }))
        };
    }
}

