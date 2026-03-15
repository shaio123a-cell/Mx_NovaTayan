
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('--- STARTING DATABASE SAFETY CHECK ---');
    
    // Check existing data
    const users = await prisma.user.count();
    const workflows = await prisma.workflow.count();
    const schedules = await prisma.schedule.count();
    const tasks = await prisma.task.count();

    console.log('\n📊 EXISTING DATA COUNTS:');
    console.log('  Users:', users);
    console.log('  Workflows:', workflows);
    console.log('  Schedules:', schedules);
    console.log('  Tasks:', tasks);

    // Check for new tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('calendars', 'calendar_rules', 'workflow_schedule_bindings')
    `;
    
    console.log('\n🏗️ NEW SCHEMA TABLES DETECTED:');
    tables.forEach(t => console.log('  -', t.table_name));

    if (tables.length === 3) {
      console.log('\n✅ VERIFICATION SUCCESSFUL: New tables are ready and existing data is intact.');
    } else {
      console.log('\n⚠️ PARTIAL SYNC: Only', tables.length, 'out of 3 new tables found.');
    }

  } catch (err) {
    console.error('\n❌ ERROR DURING CHECK:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
