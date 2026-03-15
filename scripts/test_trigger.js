
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Fetching a binding...');
        const binding = await prisma.workflowScheduleBinding.findFirst({
            include: { workflow: true, schedule: true }
        });
        
        if (!binding) {
            console.log('No binding found.');
            return;
        }

        console.log(`Testing enqueueExecution for workflow ${binding.workflow.name} with binding ${binding.id}`);
        
        // This simulates the call in SchedulerService
        // Signature: (workflowId, triggeredBy, userId, initialVariables, sourceExecutionId, bindingId)
        
        const execution = await prisma.workflowExecution.create({
            data: {
                workflowId: binding.workflowId,
                workflowName: binding.workflow.name,
                workflowVersion: binding.workflow.version,
                status: 'RUNNING',
                triggeredBy: 'SCHEDULE',
                triggeredByUser: 'system',
                startedAt: new Date(),
                taskExecutions: {},
                sourceExecutionId: undefined, // This is what we pass
                bindingId: binding.id // This is what we pass
            }
        });

        console.log('Success! Created execution:', execution.id);
        
        // Cleanup
        await prisma.workflowExecution.delete({ where: { id: execution.id } });
        console.log('Deleted test execution.');

    } catch (e) {
        console.error('FAILED with error:', e.message);
        if (e.code) console.error('Prisma Error Code:', e.code);
    } finally {
        await prisma.$disconnect();
    }
}

test();
