
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('🔍 Checking PENDING tasks in database...');

        const tasks = await prisma.taskExecution.findMany({
            where: { status: 'PENDING' },
            include: { task: true }
        });

        console.log(`📝 Found ${tasks.length} pending tasks:`);
        tasks.forEach(t => {
            console.log('------------------------------------------------');
            console.log(`ID: ${t.id}`);
            console.log(`Workflow Execution ID: ${t.workflowExecutionId || 'N/A'}`);
            console.log(`Task Name: ${t.task.name}`);
            console.log(`🎯 Target Worker ID: ${t.targetWorkerId || 'NULL'}`);
            console.log(`🏷️ Target Tags: ${JSON.stringify(t.targetTags)}`);
            console.log(`Created At: ${t.createdAt}`);
        });

        console.log('\n🔍 Checking WORKERS in database...');
        const workers = await prisma.worker.findMany();
        console.log(`👷 Found ${workers.length} workers:`);
        workers.forEach(w => {
            console.log('------------------------------------------------');
            console.log(`Hostname: ${w.hostname}`);
            console.log(`ID: ${w.id}`);
            console.log(`Status: ${w.status}`);
            console.log(`🏷️ Tags: ${JSON.stringify(w.tags)}`);
            console.log(`Last Seen: ${w.lastSeen}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
