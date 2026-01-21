-- AlterTable
ALTER TABLE "task_executions" ADD COLUMN     "input" JSONB;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "sanityChecks" JSONB;

-- CreateTable
CREATE TABLE "task_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TaskToGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "task_groups_name_key" ON "task_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "_TaskToGroup_AB_unique" ON "_TaskToGroup"("A", "B");

-- CreateIndex
CREATE INDEX "_TaskToGroup_B_index" ON "_TaskToGroup"("B");

-- AddForeignKey
ALTER TABLE "_TaskToGroup" ADD CONSTRAINT "_TaskToGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskToGroup" ADD CONSTRAINT "_TaskToGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "task_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
