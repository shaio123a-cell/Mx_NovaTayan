import { Module, forwardRef } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { WorkerController } from './worker.controller';
import { GlobalVarsModule } from '../global-vars/global-vars.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
    imports: [
        GlobalVarsModule,
        forwardRef(() => WorkflowsModule)
    ],
    providers: [WorkerService],
    controllers: [WorkerController],
    exports: [WorkerService]
})
export class WorkerModule {}
