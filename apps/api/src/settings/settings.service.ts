import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService implements OnModuleInit {
    constructor(private prisma: PrismaService) {}

    async onModuleInit() {
        // Seed default settings if they don't exist
        const defaults = [
            { key: 'SUCCESS_CODES_DEFAULT', value: '200-299', description: 'HTTP success status code ranges (e.g. 200, 201 or 200-299)' },
            { key: 'FAILURE_CODES_DEFAULT', value: '400-599', description: 'HTTP failure status code ranges (e.g. 400-599)' },
        ];

        for (const d of defaults) {
            const exists = await this.prisma.systemSetting.findUnique({ where: { key: d.key } });
            if (!exists) {
                await this.prisma.systemSetting.create({ data: d });
            }
        }
    }

    async findAll() {
        return this.prisma.systemSetting.findMany({
            orderBy: { key: 'asc' },
        });
    }

    async update(key: string, value: string) {
        return this.prisma.systemSetting.update({
            where: { key },
            data: { value },
        });
    }

    async getByKey(key: string) {
        return this.prisma.systemSetting.findUnique({ where: { key } });
    }
}
