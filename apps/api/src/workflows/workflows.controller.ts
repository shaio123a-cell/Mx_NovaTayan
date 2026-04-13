import { Controller, Get, Post, Body, Param, Put, Delete, Query, Patch } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto, UpdateWorkflowDto, CreateFolderDto, UpdateFolderDto } from './dto/workflow.dto';
import { CreateBindingDto, UpdateBindingDto } from './dto/binding.dto';

@Controller('workflows')
export class WorkflowsController {
    constructor(private readonly workflowsService: WorkflowsService) { }

    @Get('stats')
    getStats(@Query('folderId') folderId?: string) {
        return this.workflowsService.getSystemStats(folderId);
    }

    @Post()
    create(@Body() createWorkflowDto: CreateWorkflowDto) {
        const ownerId = 'system';
        return this.workflowsService.create(createWorkflowDto, ownerId);
    }

    @Get()
    findAll(@Query('ownerId') ownerId?: string, @Query('folderId') folderId?: string) {
        return this.workflowsService.findAll(ownerId, folderId);
    }

    @Patch(':id/reorder')
    reorder(@Param('id') id: string, @Body('order') order: number) {
        return this.workflowsService.reorder(id, order);
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

    // --- Webhook Listen Mode ---

    @Post(':workflowId/tokens/:tokenId/listen')
    startListening(@Param('tokenId') tokenId: string) {
        return this.workflowsService.startListening(tokenId);
    }

    @Get(':workflowId/tokens/:tokenId/sample')
    getSample(@Param('tokenId') tokenId: string) {
        return this.workflowsService.getSample(tokenId);
    }

    @Delete(':workflowId/tokens/:tokenId/listen')
    stopListening(@Param('tokenId') tokenId: string) {
        return this.workflowsService.stopListening(tokenId);
    }

    // --- Folders ---

    @Get('folders/all')
    getFolderTree() {
        return this.workflowsService.getFolderTree();
    }

    @Post('folders')
    createFolder(@Body() dto: CreateFolderDto) {
        return this.workflowsService.createFolder(dto);
    }

    @Put('folders/:id')
    updateFolder(@Param('id') id: string, @Body() dto: UpdateFolderDto) {
        return this.workflowsService.updateFolder(id, dto);
    }

    @Delete('folders/:id')
    deleteFolder(@Param('id') id: string) {
        return this.workflowsService.deleteFolder(id);
    }
}
