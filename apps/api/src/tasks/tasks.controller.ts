import { Controller, Get, Post, Put, Delete, Body, Param, Query, Patch } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, CreateFolderDto, UpdateFolderDto } from './dto/task.dto';

@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    create(@Body() createTaskDto: CreateTaskDto) {
        const ownerId = 'system';
        return this.tasksService.create(createTaskDto, ownerId);
    }

    @Patch(':id/reorder')
    reorder(@Param('id') id: string, @Body('order') order: number) {
        return this.tasksService.reorder(id, order);
    }

    @Get()
    findAll(@Query('ownerId') ownerId?: string, @Query('folderId') folderId?: string) {
        return this.tasksService.findAll(ownerId, folderId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.tasksService.findOne(id);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
        return this.tasksService.update(id, updateTaskDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.tasksService.remove(id);
    }

    @Post(':id/execute')
    execute(@Param('id') id: string) {
        return this.tasksService.enqueueExecution(id);
    }

    @Get(':id/executions')
    getExecutions(@Param('id') id: string) {
        return this.tasksService.getExecutions(id);
    }

    @Get(':id/impact')
    getImpact(@Param('id') id: string) {
        return this.tasksService.getImpact(id);
    }

    @Get('folders/all')
    getFolderTree() {
        return this.tasksService.getFolderTree();
    }

    @Post('folders')
    createFolder(@Body() dto: CreateFolderDto) {
        return this.tasksService.createFolder(dto);
    }

    @Put('folders/:id')
    updateFolder(@Param('id') id: string, @Body() dto: UpdateFolderDto) {
        return this.tasksService.updateFolder(id, dto);
    }

    @Delete('folders/:id')
    deleteFolder(@Param('id') id: string) {
        return this.tasksService.deleteFolder(id);
    }
}
