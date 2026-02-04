-- AlterTable
ALTER TABLE "task_executions" ADD COLUMN     "workflowExecutionId" TEXT;

-- AddForeignKey
ALTER TABLE "task_executions" ADD CONSTRAINT "task_executions_workflowExecutionId_fkey" FOREIGN KEY ("workflowExecutionId") REFERENCES "workflow_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
