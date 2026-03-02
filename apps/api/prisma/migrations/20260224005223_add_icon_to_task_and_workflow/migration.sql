-- DropForeignKey
ALTER TABLE "task_executions" DROP CONSTRAINT "task_executions_taskId_fkey";

-- AlterTable
ALTER TABLE "task_executions" ALTER COLUMN "taskId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "icon" TEXT;

-- AlterTable
ALTER TABLE "workflow_executions" ADD COLUMN     "parentTaskExecutionId" TEXT;

-- AlterTable
ALTER TABLE "workflows" ADD COLUMN     "icon" TEXT,
ADD COLUMN     "inputVariables" JSONB,
ADD COLUMN     "notifications" JSONB,
ADD COLUMN     "outputVariables" JSONB,
ADD COLUMN     "scheduling" JSONB;

-- AddForeignKey
ALTER TABLE "task_executions" ADD CONSTRAINT "task_executions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_parentTaskExecutionId_fkey" FOREIGN KEY ("parentTaskExecutionId") REFERENCES "task_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
