
import { PrismaClient } from '@prisma/client';

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
    return;
  }
  
  console.log(`Workflow ID: ${workflow.id}, Enabled: ${workflow.enabled}`);
  
  for (const binding of workflow.bindings) {
    console.log(`\nBinding ID: ${binding.id}, State: ${binding.state}`);
    console.log(`Schedule Name: ${binding.schedule.name}, Mode: ${binding.schedule.mode}, State: ${binding.schedule.state}, Enabled: ${binding.schedule.enabled}`);
    console.log(`Next Fire At: ${binding.nextFireAt}`);
    console.log(`Last Fired At: ${binding.lastFiredAt}`);
    
    const activeExecs = await prisma.workflowExecution.count({
      where: {
        workflowId: workflow.id,
        status: { in: ['PENDING', 'RUNNING'] }
      }
    });
    console.log(`Active Executions (PENDING/RUNNING): ${activeExecs}`);
  }
  
  await prisma.$disconnect();
}

main();
