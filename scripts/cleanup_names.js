
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const schedules = await prisma.schedule.findMany();
    const calendars = await prisma.calendar.findMany();

    console.log('Cleaning up schedules...');
    for (const [index, s] of schedules.entries()) {
      let newName = s.name.trim();
      if (!newName) {
        newName = `Schedule ${index + 1}`;
      }
      
      // Ensure absolute uniqueness in this cleanup run
      const count = await prisma.schedule.count({
          where: { name: newName, id: { not: s.id } }
      });
      if (count > 0) {
          newName = `${newName} (${s.id.substring(0, 4)})`;
      }

      await prisma.schedule.update({
        where: { id: s.id },
        data: { name: newName }
      });
      console.log(`Updated Schedule ${s.id}: "${s.name}" -> "${newName}"`);
    }

    console.log('Cleaning up calendars...');
    for (const [index, c] of calendars.entries()) {
      let newName = c.name.trim();
      if (!newName) {
        newName = `Calendar ${index + 1}`;
      }

      const count = await prisma.calendar.count({
          where: { name: newName, id: { not: c.id } }
      });
      if (count > 0) {
          newName = `${newName} (${c.id.substring(0, 4)})`;
      }

      await prisma.calendar.update({
        where: { id: c.id },
        data: { name: newName }
      });
      console.log(`Updated Calendar ${c.id}: "${c.name}" -> "${newName}"`);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
