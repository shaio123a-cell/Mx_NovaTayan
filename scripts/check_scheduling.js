
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const schedules = await prisma.schedule.findMany();
    const calendars = await prisma.calendar.findMany({ include: { rules: true } });
    const bindings = await prisma.workflowScheduleBinding.findMany({
        include: {
            schedule: true,
            calendar: true,
            workflow: { select: { name: true, enabled: true } }
        }
    });

    console.log('--- SCHEDULES ---');
    console.log(JSON.stringify(schedules, null, 2));
    console.log('--- CALENDARS ---');
    console.log(JSON.stringify(calendars, null, 2));
    console.log('--- BINDINGS ---');
    console.log(JSON.stringify(bindings, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
