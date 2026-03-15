
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const checkScope = async (table) => {
      const result = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = 'scope'`);
      return result.length > 0;
    };

    console.log('Schedules has scope:', await checkScope('schedules'));
    console.log('Calendars has scope:', await checkScope('calendars'));
    console.log('Workflows has scope:', await checkScope('workflows'));
    console.log('Tasks has scope:', await checkScope('tasks'));
    console.log('Secrets has scope:', await checkScope('secrets'));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
