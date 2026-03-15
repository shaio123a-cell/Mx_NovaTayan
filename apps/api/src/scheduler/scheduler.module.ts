import { Module, Global } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { WorkflowsModule } from '../workflows/workflows.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../common/logger/logger.module';
import { SettingsModule } from '../settings/settings.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    LoggerModule,
    WorkflowsModule,
    SettingsModule
  ],
  providers: [SchedulerService],
  exports: [SchedulerService]
})
export class SchedulerModule {}
