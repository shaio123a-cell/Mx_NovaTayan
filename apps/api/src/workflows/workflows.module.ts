import { Module, forwardRef } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WorkerModule } from '../worker/worker.module';

@Module({
    imports: [forwardRef(() => WorkerModule)],
    controllers: [WorkflowsController],
    providers: [WorkflowsService],
    exports: [WorkflowsService]
})
export class WorkflowsModule {}
