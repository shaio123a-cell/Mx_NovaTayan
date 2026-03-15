
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const schedulesCols = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name = 'schedules'");
    console.log('Schedules columns:', JSON.stringify(schedulesCols));

    const calendarsCols = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name = 'calendars'");
    console.log('Calendars columns:', JSON.stringify(calendarsCols));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
