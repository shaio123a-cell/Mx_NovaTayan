import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCalendarDto, UpdateCalendarDto } from './dto/calendar.dto';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class CalendarsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {
    this.logger.setContext(CalendarsService.name);
  }

  async create(createCalendarDto: CreateCalendarDto, ownerId: string) {
    const { rules, ...data } = createCalendarDto;
    
    return this.prisma.calendar.create({
      data: {
        ...data,
        ownerId,
        rules: {
          create: rules?.map(rule => ({
            ruleType: rule.type,
            payload: rule.payload || {}
          }))
        }
      },
      include: { rules: true }
    });
  }

  async findAll() {
    return this.prisma.calendar.findMany({
      include: { rules: true },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const calendar = await this.prisma.calendar.findUnique({
      where: { id },
      include: { rules: true }
    });

    if (!calendar) {
      throw new NotFoundException(`Calendar with ID ${id} not found`);
    }

    return calendar;
  }

  async update(id: string, updateCalendarDto: UpdateCalendarDto) {
    const { rules, ...data } = updateCalendarDto;
    
    // Check existence
    await this.findOne(id);

    // Use a transaction to replace rules cleanly
    return this.prisma.$transaction(async (tx) => {
      if (rules) {
        await tx.calendarRule.deleteMany({
          where: { calendarId: id }
        });
      }

      return tx.calendar.update({
        where: { id },
        data: {
          ...data,
          rules: rules ? {
            create: rules.map(rule => ({
              ruleType: rule.type,
              payload: rule.payload || {}
            }))
          } : undefined
        },
        include: { rules: true }
      });
    });
  }

  async updateState(id: string, state: string) {
    await this.findOne(id);
    return this.prisma.calendar.update({
      where: { id },
      data: { state },
      include: { rules: true }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    
    // Check usage
    const usage = await this.getUsage(id);
    if (usage.usageCount > 0) {
      throw new ConflictException(`Cannot delete calendar while it is in use by ${usage.usageCount} workflows. Please unbind it first.`);
    }

    return this.prisma.calendar.delete({
      where: { id }
    });
  }

  async getUsage(id: string) {
    const bindings = await this.prisma.workflowScheduleBinding.findMany({
      where: { calendarId: id },
      include: { workflow: { select: { id: true, name: true } } }
    });

    return {
      usageCount: bindings.length,
      dependents: bindings.map(b => b.workflow)
    };
  }

  async getPreview(id: string, range: { start: string, end: string }) {
    const calendar = await this.findOne(id);
    // Logic for calculating intervals based on rules will be implemented in Step 3/4 
    // when we add the date utility libs. For now, return rules and placeholders.
    return {
      calendar,
      range,
      intervals: [] // Placeholder
    };
  }
}
