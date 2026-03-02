import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WorkerModule } from '../worker/worker.module';

@Module({
  imports: [WorkerModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService]
})
export class WorkflowsModule {}
