import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { WorkerController } from './worker.controller';
import { GlobalVarsModule } from '../global-vars/global-vars.module';

@Module({
  imports: [GlobalVarsModule],
  providers: [WorkerService],
  controllers: [WorkerController]
})
export class WorkerModule {}
