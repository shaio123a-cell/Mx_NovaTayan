import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { SettingsService } from '../settings/settings.service';
import { DateTime } from 'luxon';
import { DateUtils } from './utils/date-utils';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private tickInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private workflowsService: WorkflowsService,
    private settingsService: SettingsService,
  ) {
    this.logger.setContext('SchedulerService');
  }

  async onModuleInit() {
    this.logger.log('Initializing Scheduler "Brain"...');
    
    let intervalMs = 10000;
    try {
      const setting = await this.settingsService.getByKey('scheduler.tick_interval_ms');
      if (setting) intervalMs = parseInt(setting.value);
    } catch (e) {
      this.logger.debug('No custom tick interval found, using default 10s');
    }

    this.logger.log(`Starting scheduler loop with ${intervalMs}ms interval.`);
    this.tickInterval = setInterval(() => this.tick(), intervalMs);
    
    setTimeout(() => this.tick(), 2000);
  }

  onModuleDestroy() {
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  async tick() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = DateTime.now();
      
      const activeBindings = await this.prisma.workflowScheduleBinding.findMany({
        where: {
          state: 'ACTIVE',
          schedule: { state: 'ACTIVE', enabled: true },
          OR: [
            { nextFireAt: null },
            { nextFireAt: { lte: now.toJSDate() } }
          ]
        },
        include: {
          schedule: true,
          calendar: { include: { rules: true } },
          workflow: { select: { id: true, name: true, enabled: true } }
        }
      });

      for (const binding of activeBindings) {
        try {
          await this.processBinding(binding, now);
        } catch (err) {
          this.logger.error(`Error processing binding ${binding.id}: ${err.message}`);
        }
      }
    } catch (error) {
      this.logger.error('Critical error in scheduler tick:', error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processBinding(binding: any, now: DateTime) {
    const { schedule, calendar, workflow } = binding;

    // Move workflow.enabled check down after initialization
    
    if (schedule.launchAt && DateTime.fromJSDate(schedule.launchAt) > now) return;
    if (schedule.endAt && DateTime.fromJSDate(schedule.endAt) < now) {
      await this.prisma.schedule.update({ where: { id: schedule.id }, data: { state: 'PAUSED' } });
      return;
    }

    if (schedule.maxRuns) {
      const runCount = await this.prisma.workflowExecution.count({ where: { bindingId: binding.id } });
      if (runCount >= schedule.maxRuns) {
        this.logger.log(`Schedule ${schedule.name} reached max runs (${schedule.maxRuns}). Pausing.`);
        await this.prisma.schedule.update({ where: { id: schedule.id }, data: { state: 'PAUSED' } });
        return;
      }
    }

    if (!binding.nextFireAt) {
      const next = DateUtils.calculateNextFire(schedule, now);
      await this.prisma.workflowScheduleBinding.update({
        where: { id: binding.id },
        data: { nextFireAt: next?.toJSDate() }
      });
      // Continue processing if we just initialized it
      binding.nextFireAt = next?.toJSDate();
    }

    // If the time has come, execute but update next time
    if (binding.nextFireAt && DateTime.fromJSDate(binding.nextFireAt) <= now) {
      if (!workflow.enabled) {
        // Skip execution if workflow is disabled, but still advance the target time
        const next = DateUtils.calculateNextFire(schedule, now.plus({ seconds: 1 }));
        await this.prisma.workflowScheduleBinding.update({
          where: { id: binding.id },
          data: { nextFireAt: next?.toJSDate() }
        });
        return;
      }
      // Logic continues below
    } else {
      return;
    }

    const isCalendarOpen = await this.isCalendarOpen(calendar, now);
    
    if (!isCalendarOpen) {
      if (schedule.misfirePolicy === 'fire_once') {
        return;
      } else {
        const next = DateUtils.calculateNextFire(schedule, now.plus({ seconds: 1 }));
        await this.prisma.workflowScheduleBinding.update({
          where: { id: binding.id },
          data: { nextFireAt: next?.toJSDate() }
        });
        return;
      }
    }

    if (binding.skipIfRunning) {
      const activeExecutions = await this.prisma.workflowExecution.count({
        where: {
          workflowId: workflow.id,
          status: { in: ['PENDING', 'RUNNING'] }
        }
      });
      if (activeExecutions >= binding.maxConcurrency) {
        const next = DateUtils.calculateNextFire(schedule, now.plus({ seconds: 1 }));
        await this.prisma.workflowScheduleBinding.update({
          where: { id: binding.id },
          data: { nextFireAt: next?.toJSDate(), lastFiredAt: now.toJSDate() }
        });
        return;
      }
    }

    this.logger.log(`TRIGGERING workflow "${workflow.name}" via schedule "${schedule.name}"`);
    await this.workflowsService.enqueueExecution(workflow.id, 'SCHEDULE', 'system', {}, undefined, binding.id);

    const next = DateUtils.calculateNextFire(schedule, now.plus({ seconds: 1 }));
    await this.prisma.workflowScheduleBinding.update({
      where: { id: binding.id },
      data: { 
        nextFireAt: next?.toJSDate(),
        lastFiredAt: now.toJSDate()
      }
    });
  }

  private async isCalendarOpen(calendar: any, time: DateTime): Promise<boolean> {
    if (!calendar) return true;
    if (calendar.state === 'PAUSED') return false;

    const localTime = time.setZone(calendar.timezone || 'UTC');
    const rules = calendar.rules || [];

    for (const rule of rules) {
      const payload = rule.payload as any;
      if (rule.ruleType === 'EXCEPTION_DATE') {
        if (localTime.toISODate() === payload.date) return false;
      }
      if (rule.ruleType === 'EXCLUDE_WINDOW') {
        if (this.isInWindow(localTime, payload)) return false;
      }
    }

    const allowRules = rules.filter(r => r.ruleType === 'ALLOW_WINDOW');
    if (allowRules.length === 0) return true;

    for (const rule of allowRules) {
      if (this.isInWindow(localTime, rule.payload)) return true;
    }

    return false;
  }

  private isInWindow(time: DateTime, window: any): boolean {
    if (window.daysOfWeek) {
        const luxonToSpec = time.weekday === 7 ? 0 : time.weekday;
        if (!window.daysOfWeek.includes(luxonToSpec)) return false;
    }

    if (window.start && window.end) {
      const currentTime = time.hour * 60 + time.minute;
      const [startH, startM] = window.start.split(':').map(Number);
      const [endH, endM] = window.end.split(':').map(Number);
      const start = startH * 60 + startM;
      const end = endH * 60 + endM;
      return currentTime >= start && currentTime < end;
    }

    return true;
  }
}
