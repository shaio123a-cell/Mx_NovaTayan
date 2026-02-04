/*
  Warnings:

  - You are about to drop the column `workerGroup` on the `task_executions` table. All the data in the column will be lost.
  - You are about to drop the column `workerGroup` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `workerGroup` on the `workers` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `workflow_executions` table. All the data in the column will be lost.
  - You are about to drop the column `workerGroup` on the `workflows` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "task_executions" DROP COLUMN "workerGroup",
ADD COLUMN     "targetTags" TEXT[],
ADD COLUMN     "targetWorkerId" TEXT;

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "workerGroup";

-- AlterTable
ALTER TABLE "workers" DROP COLUMN "workerGroup",
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "workflow_executions" DROP COLUMN "notes",
ADD COLUMN     "parentExecutionId" TEXT,
ADD COLUMN     "targetWorkerId" TEXT;

-- AlterTable
ALTER TABLE "workflows" DROP COLUMN "workerGroup";

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_parentExecutionId_fkey" FOREIGN KEY ("parentExecutionId") REFERENCES "workflow_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_targetWorkerId_fkey" FOREIGN KEY ("targetWorkerId") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
