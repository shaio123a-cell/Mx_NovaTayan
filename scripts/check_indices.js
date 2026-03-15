
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT 
          t.relname as table_name,
          i.relname as index_name,
          a.attname as column_name
      FROM 
          pg_class t,
          pg_class i,
          pg_index ix,
          pg_attribute a
      WHERE 
          t.oid = ix.indrelid
          AND i.oid = ix.indexrelid
          AND a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
          AND t.relkind = 'r'
          AND ix.indisunique = true
          AND t.relname IN ('schedules', 'calendars')
    `);
    console.log('Unique indices:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
