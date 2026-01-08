-- AlterTable
ALTER TABLE "task_executions" ADD COLUMN     "workerId" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "workerGroup" TEXT DEFAULT 'default';

-- AlterTable
ALTER TABLE "workflows" ADD COLUMN     "workerGroup" TEXT DEFAULT 'default';

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "hostname" TEXT NOT NULL,
    "ipAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "workerGroup" TEXT NOT NULL DEFAULT 'default',
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workers_hostname_key" ON "workers"("hostname");

-- AddForeignKey
ALTER TABLE "task_executions" ADD CONSTRAINT "task_executions_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
