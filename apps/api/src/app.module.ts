import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkerModule } from './worker/worker.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { LoggerModule } from './common/logger/logger.module';
import { loadConfig } from './common/config/configuration';

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
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
