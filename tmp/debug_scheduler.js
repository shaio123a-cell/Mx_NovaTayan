
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const workflowName = 'PWF1';
  
  console.log(`Checking status for workflow: ${workflowName}`);
  
  const workflow = await prisma.workflow.findFirst({
    where: { name: workflowName },
    include: {
      bindings: {
        include: {
          schedule: true
        }
      }
    }
  });
  
  if (!workflow) {
    console.log(`Workflow ${workflowName} not found.`);
    const all = await prisma.workflow.findMany({ select: { name: true } });
    console.log(`Available workflows: ${all.map(w => w.name).join(', ')}`);
    return;
  }
  
  console.log(`Workflow ID: ${workflow.id}, Enabled: ${workflow.enabled}`);
  
  for (const binding of workflow.bindings) {
    console.log(`\nBinding ID: ${binding.id}, State: ${binding.state}, MaxConcurrency: ${binding.maxConcurrency}`);
    console.log(`Schedule Name: ${binding.schedule.name}, Mode: ${binding.schedule.mode}, State: ${binding.schedule.state}, Enabled: ${binding.schedule.enabled}`);
    console.log(`Next Fire At: ${binding.nextFireAt}`);
    console.log(`Last FiredAt: ${binding.lastFiredAt}`);
    
    const activeExecs = await prisma.workflowExecution.count({
      where: {
        workflowId: workflow.id,
        status: { in: ['PENDING', 'RUNNING'] }
      }
    });
    console.log(`Active Executions (PENDING/RUNNING): ${activeExecs}`);
    
    if (activeExecs > 0) {
        const execs = await prisma.workflowExecution.findMany({
            where: {
                workflowId: workflow.id,
                status: { in: ['PENDING', 'RUNNING'] }
            },
            take: 5,
            orderBy: { startedAt: 'asc' }
        });
        for (const ex of execs) {
            console.log(`  - Exec ID: ${ex.id}, Status: ${ex.status}, StartedAt: ${ex.startedAt}`);
        }
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
