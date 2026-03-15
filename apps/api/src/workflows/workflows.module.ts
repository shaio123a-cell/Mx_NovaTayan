import { Module, forwardRef } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { TriggersController } from './triggers.controller';
import { WorkflowsService } from './workflows.service';
import { WorkerModule } from '../worker/worker.module';

@Module({
    imports: [forwardRef(() => WorkerModule)],
    controllers: [WorkflowsController, TriggersController],
    providers: [WorkflowsService],
    exports: [WorkflowsService]
})
export class WorkflowsModule {}
