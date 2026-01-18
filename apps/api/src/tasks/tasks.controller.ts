import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    create(@Body() createTaskDto: CreateTaskDto) {
        // TODO: Get ownerId from authenticated user
        // For now, using a placeholder
        const ownerId = 'system';
        return this.tasksService.create(createTaskDto, ownerId);
    }

    @Get()
    findAll(@Query('ownerId') ownerId?: string) {
        return this.tasksService.findAll(ownerId);
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

    @Get('groups/all')
    findAllGroups() {
        return this.tasksService.findAllGroups();
    }

    @Post('groups')
    createGroup(@Body() data: { name: string; description?: string }) {
        return this.tasksService.createGroup(data.name, data.description);
    }

    @Delete('groups/:id')
    deleteGroup(@Param('id') id: string) {
        return this.tasksService.deleteGroup(id);
    }
}
