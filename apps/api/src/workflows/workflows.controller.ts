import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';

@Controller('workflows')
export class WorkflowsController {
    constructor(private readonly workflowsService: WorkflowsService) { }

    @Get('stats')
    getStats() {
        return this.workflowsService.getSystemStats();
    }

    @Post()
    create(@Body() createWorkflowDto: CreateWorkflowDto) {
        // TODO: Get ownerId from authenticated user
        const ownerId = 'system';
        return this.workflowsService.create(createWorkflowDto, ownerId);
    }

    @Get()
    findAll(@Query('ownerId') ownerId?: string) {
        return this.workflowsService.findAll(ownerId);
    }

    @Get('executions/all')
    getAllExecutions() {
        return this.workflowsService.getAllExecutions();
    }

    @Get('executions/:id')
    getExecutionDetail(@Param('id') id: string) {
        return this.workflowsService.getExecutionDetail(id);
    }

    @Get(':id')
    // ... (rest of the file)
    findOne(@Param('id') id: string) {
        return this.workflowsService.findOne(id);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateWorkflowDto: UpdateWorkflowDto) {
        return this.workflowsService.update(id, updateWorkflowDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.workflowsService.remove(id);
    }

    @Delete('executions/:id')
    removeExecution(@Param('id') id: string) {
        return this.workflowsService.removeExecution(id);
    }

    @Post(':id/execute')
    execute(@Param('id') id: string) {
        return this.workflowsService.enqueueExecution(id);
    }

    @Post('executions/:id/terminate')
    terminate(@Param('id') id: string) {
        return this.workflowsService.terminateExecution(id);
    }

    @Get(':id/executions')
    getExecutions(@Param('id') id: string) {
        return this.workflowsService.getExecutions(id);
    }
}
