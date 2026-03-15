
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Attempting to create duplicate calendar...');
    await prisma.calendar.create({
      data: {
        name: 'First Schedule', // Existing name
        ownerId: 'system'
      }
    });
  } catch (e) {
    console.log('Caught expected error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
