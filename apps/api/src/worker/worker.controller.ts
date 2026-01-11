import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { LoggerService } from '../common/logger/logger.service';

@Controller('worker')
export class WorkerController {
    constructor(
        private readonly workerService: WorkerService,
        private readonly logger: LoggerService
    ) {
        this.logger.setContext(WorkerController.name);
    }

    @Post('register')
    register(@Body() body: { hostname: string; ipAddress?: string; name?: string; tags?: string[] }) {
        return this.workerService.register(body);
    }

    @Post('heartbeat')
    heartbeat(@Body() body: { hostname: string }) {
        return this.workerService.heartbeat(body.hostname);
    }

    @Get('list')
    list() {
        return this.workerService.findAll();
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.workerService.updateWorker(id, body);
    }

    @Get('pending')
    getPending(
        @Query('hostname') hostname: string,
        @Query('tags') tags?: string | string[]
    ) {
        this.logger.log(`Received poll request from ${hostname} with tags: ${tags}`);
        // Convert tags to string array if it comes as a single string
        const tagArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);
        return this.workerService.getNextPendingTask(hostname, tagArray);
    }

    @Patch('executions/:id/start')
    start(
        @Param('id') id: string,
        @Body('hostname') hostname: string
    ) {
        return this.workerService.startExecution(id, hostname);
    }

    @Post('executions/:id/complete')
    complete(
        @Param('id') id: string,
        @Body() body: { result?: any; error?: string; input?: any }
    ) {
        return this.workerService.completeExecution(id, body.result, body.error, body.input);
    }
}
