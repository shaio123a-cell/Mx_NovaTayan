
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const executions = await prisma.workflowExecution.findMany({
        where: { status: 'RUNNING' },
        take: 10,
        orderBy: { startedAt: 'desc' }
    });
    console.log('--- RECENT RUNNING EXECUTIONS ---');
    console.log(JSON.stringify(executions, null, 2));

    const pendingTasks = await prisma.taskExecution.findMany({
        where: { status: 'PENDING' },
        take: 10
    });
    console.log('--- PENDING TASKS ---');
    console.log(JSON.stringify(pendingTasks, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
