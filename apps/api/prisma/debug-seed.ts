import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
    console.log('Starting seed...');
    try {
        const user = await prisma.user.upsert({
            where: { id: 'system-user' },
            update: {},
            create: {
                id: 'system-user',
                email: 'system@restmon.local',
                username: 'system',
                password: '',
                role: 'ADMIN',
            },
        });
        console.log('User upserted:', user);
    } catch (e) {
        console.error('Error during upsert:', e);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
