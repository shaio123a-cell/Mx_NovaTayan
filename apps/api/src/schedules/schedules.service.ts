import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';
import { LoggerService } from '../common/logger/logger.service';
import { DateUtils } from '../scheduler/utils/date-utils';

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {
    this.logger.setContext(SchedulesService.name);
  }

  async create(createScheduleDto: CreateScheduleDto, ownerId: string) {
    const { launchAt, endAt, ...rest } = createScheduleDto;
    
    return this.prisma.schedule.create({
      data: {
        ...rest,
        ownerId,
        scope: createScheduleDto.scope || 'GLOBAL',
        launchAt: launchAt ? new Date(launchAt) : undefined,
        endAt: endAt ? new Date(endAt) : undefined,
        state: createScheduleDto.state || 'ACTIVE'
      } as any
    });
  }

  async findAll() {
    return this.prisma.schedule.findMany({
      orderBy: { updatedAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: { bindings: { include: { workflow: { select: { name: true } } } } }
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    return schedule;
  }

  async update(id: string, updateScheduleDto: UpdateScheduleDto) {
    const { launchAt, endAt, ...rest } = updateScheduleDto;
    await this.findOne(id);
    
    return this.prisma.schedule.update({
      where: { id },
      data: {
        ...rest,
        launchAt: launchAt ? new Date(launchAt) : undefined,
        endAt: endAt ? new Date(endAt) : undefined,
      } as any
    });
  }

  async updateState(id: string, state: string) {
    await this.findOne(id);
    return this.prisma.schedule.update({
      where: { id },
      data: { state }
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Check usage
    const usage = await this.getUsage(id);
    if (usage.usageCount > 0) {
      throw new ConflictException(`Cannot delete schedule while it is in use by ${usage.usageCount} workflows. Please unbind it first.`);
    }

    return this.prisma.schedule.delete({
      where: { id }
    });
  }

  async getPreview(id: string, options: any) {
    const schedule = await this.findOne(id);
    return {
      schedule,
      nextFireTimes: DateUtils.getNextFireTimes(schedule, options.limit || 10)
    };
  }

  async getPreviewGeneric(options: any) {
    return {
      nextFireTimes: DateUtils.getNextFireTimes(options, options.limit || 10)
    };
  }

  async getUsage(id: string) {
    const bindings = await this.prisma.workflowScheduleBinding.findMany({
      where: { scheduleId: id },
      include: { workflow: { select: { id: true, name: true } } }
    });

    return {
      usageCount: bindings.length,
      dependents: bindings.map(b => b.workflow)
    };
  }
}
