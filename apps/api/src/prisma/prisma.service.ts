import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        console.log('⏳ Connecting to database...');
        try {
            await this.$connect();
            console.log('✅ Database connected');

            // Seed system user if not exists
            console.log('⏳ Checking for system user...');
            await this.user.upsert({
                where: { id: 'system' },
                update: {},
                create: {
                    id: 'system',
                    email: 'system@restmon.local',
                    username: 'system',
                    password: '',
                    role: 'ADMIN',
                },
            });
            console.log('✅ System user ready');
        } catch (error) {
            console.error('❌ Database initialization failed!');
            if (error.code) console.error(`Error Code: ${error.code}`);
            if (error.meta) console.error(`Error Meta: ${JSON.stringify(error.meta)}`);
            console.error(error);
            // Don't rethrow, let the app start but it might fail later
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
