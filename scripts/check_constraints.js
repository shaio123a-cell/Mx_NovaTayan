
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const constraints = await prisma.$queryRawUnsafe(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid IN ('schedules'::regclass, 'calendars'::regclass) 
      AND contype = 'u'
    `);
    console.log('Unique constraints:', JSON.stringify(constraints, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
