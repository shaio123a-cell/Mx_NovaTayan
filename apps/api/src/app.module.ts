import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkerModule } from './worker/worker.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { LoggerModule } from './common/logger/logger.module';
import { SettingsModule } from './settings/settings.module';
import { GlobalVarsModule } from './global-vars/global-vars.module';
import { CalendarsModule } from './calendars/calendars.module';
import { SchedulesModule } from './schedules/schedules.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { loadConfig } from './common/config/configuration';
import { BackgroundService } from './common/background/background.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [loadConfig],
        }),
        PrismaModule,
        TasksModule,
        WorkerModule,
        WorkflowsModule,
        LoggerModule,
        SettingsModule,
        GlobalVarsModule,
        CalendarsModule,
        SchedulesModule,
        SchedulerModule,
    ],
    controllers: [AppController],
    providers: [AppService, BackgroundService],
})
export class AppModule { }
