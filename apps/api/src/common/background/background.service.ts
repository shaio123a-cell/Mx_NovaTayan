import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class BackgroundService implements OnModuleInit, OnModuleDestroy {
    private interval: NodeJS.Timeout | null = null;

    constructor(
        private prisma: PrismaService,
        private logger: LoggerService
    ) {
        this.logger.setContext('BackgroundService');
    }

    onModuleInit() {
        this.logger.log('Background Service initialized. Starting timeout watchdog...');
        // Run every 30 seconds
        this.interval = setInterval(() => this.checkTimeouts(), 30000);
    }

    onModuleDestroy() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    private async checkTimeouts() {
        try {
            const now = new Date();
            
            // 1. Find all PENDING or RUNNING task executions
            const activeTasks = await this.prisma.taskExecution.findMany({
                where: {
                    status: { in: ['PENDING', 'RUNNING'] }
                },
                include: {
                    task: true
                }
            });

            for (const execution of activeTasks) {
                const command = (execution.task?.command as any) || {};
                const timeoutMs = command.timeout || 60000; // Default 1 min if not set
                
                const startTime = execution.startedAt || new Date(); // startedAt is set on creation for pending
                const elapsed = now.getTime() - startTime.getTime();

                if (elapsed > timeoutMs) {
                    this.logger.warn(`Task execution ${execution.id} timed out. Elapsed: ${elapsed}ms, Max: ${timeoutMs}ms. Marking as FAILED.`);
                    
                    await this.prisma.taskExecution.update({
                        where: { id: execution.id },
                        data: {
                            status: 'FAILED',
                            error: `Execution timed out after ${timeoutMs}ms`,
                            completedAt: now
                        }
                    });

                    // Also check if we need to fail the workflow execution
                    if (execution.workflowExecutionId) {
                        await this.failWorkflowIfNecessary(execution.workflowExecutionId);
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error in timeout watchdog:', error.stack);
        }
    }

    private async failWorkflowIfNecessary(workflowExecutionId: string) {
        // If one task fails, the whole workflow usually fails (unless we have retry/branching logic, 
        // but for now let's keep it simple or check if it's the end of the line)
        
        await this.prisma.workflowExecution.update({
            where: { id: workflowExecutionId },
            data: {
                status: 'FAILED',
                completedAt: new Date()
            }
        });
    }
}
