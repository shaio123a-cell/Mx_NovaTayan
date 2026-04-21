import { Module, forwardRef } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { WorkerController } from './worker.controller';
import { GlobalVarsModule } from '../global-vars/global-vars.module';
import { WorkflowsModule } from '../workflows/workflows.module';

import { ConditionEvaluator } from './condition-evaluator';

@Module({
    imports: [
        GlobalVarsModule,
        forwardRef(() => WorkflowsModule)
    ],
    providers: [WorkerService, ConditionEvaluator],
    controllers: [WorkerController],
    exports: [WorkerService, ConditionEvaluator]
})
export class WorkerModule {}
