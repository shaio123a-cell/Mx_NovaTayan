import { Controller, Get, Post, Body, Param, Put, Delete, Query, Patch } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';
import { CreateBindingDto, UpdateBindingDto } from './dto/binding.dto';

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

    @Get(':id/usage')
    getUsage(@Param('id') id: string) {
        return this.workflowsService.getUsageStatus(id);
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

    // --- Scheduling Bindings ---

    @Post(':id/bindings')
    createBinding(@Param('id') id: string, @Body() dto: CreateBindingDto) {
        return this.workflowsService.createBinding(id, dto);
    }

    @Get(':id/bindings')
    getBindings(@Param('id') id: string) {
        return this.workflowsService.getBindings(id);
    }

    @Delete(':workflowId/bindings/:bindingId')
    deleteBinding(@Param('bindingId') bindingId: string) {
        return this.workflowsService.deleteBinding(bindingId);
    }

    @Patch(':workflowId/bindings/:bindingId')
    patchBinding(@Param('bindingId') bindingId: string, @Body() dto: UpdateBindingDto) {
        return this.workflowsService.patchBinding(bindingId, dto);
    }

    // --- Event Triggers ---

    @Post(':id/trigger')
    trigger(@Param('id') id: string, @Body() body: any) {
        return this.workflowsService.triggerByEvent(id, body.payload, body.idempotencyKey);
    }

    // --- Webhook Trigger Tokens ---

    @Get(':id/tokens')
    getTokens(@Param('id') id: string) {
        return this.workflowsService.getTriggerTokens(id);
    }

    @Post(':id/tokens')
    createToken(@Param('id') id: string, @Body() body: { description?: string, mapping?: any }) {
        return this.workflowsService.createTriggerToken(id, body.description, body.mapping);
    }

    @Delete(':workflowId/tokens/:tokenId')
    deleteToken(@Param('tokenId') tokenId: string) {
        return this.workflowsService.deleteTriggerToken(tokenId);
    }

    @Patch(':workflowId/tokens/:tokenId')
    updateToken(@Param('tokenId') tokenId: string, @Body() body: any) {
        return this.workflowsService.updateTriggerToken(tokenId, body);
    }
}
