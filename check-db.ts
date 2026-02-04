import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    try {
        const user = await prisma.user.findUnique({
            where: { id: 'system-user' },
        });
        console.log('User found:', user);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
