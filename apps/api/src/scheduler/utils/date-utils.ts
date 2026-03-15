import { DateTime } from 'luxon';
import cronParser from 'cron-parser';

export class DateUtils {
  static calculateNextFire(schedule: any, from: DateTime): DateTime | null {
    const mode = schedule.mode;
    const payload = schedule.payload as any;
    const timezone = schedule.timezone || from.zoneName;

    const fromInZone = from.setZone(timezone);

    try {
      if (mode === 'ONCE') {
        const at = DateTime.fromISO(payload.at, { zone: timezone });
        return at > fromInZone ? at : null;
      }

      if (mode === 'INTERVAL') {
        const intervalStr = payload.every || '1h';
        const num = parseInt(intervalStr);
        const unit = intervalStr.slice(-1);
        
        if (unit === 's') return fromInZone.plus({ seconds: num });
        if (unit === 'm') return fromInZone.plus({ minutes: num });
        if (unit === 'h') return fromInZone.plus({ hours: num });
        if (unit === 'd') return fromInZone.plus({ days: num });
        
        return fromInZone.plus({ hours: 1 });
      }

      if (mode === 'WEEKLY') {
        const days = payload.days || [1,2,3,4,5];
        const [hour, minute] = (payload.time || "00:00").split(':').map(Number);
        
        let next = fromInZone.set({ hour, minute, second: 0, millisecond: 0 });
        if (next <= fromInZone) next = next.plus({ days: 1 });
        
        while (!days.includes(next.weekday)) {
          next = next.plus({ days: 1 });
        }
        return next;
      }

      if (mode === 'MONTHLY') {
        const days = payload.days || [1];
        const [hour, minute] = (payload.time || "00:00").split(':').map(Number);
        
        let next = fromInZone.set({ hour, minute, second: 0, millisecond: 0 });
        if (next <= fromInZone) next = next.plus({ days: 1 });
        
        while (!days.includes(next.day)) {
          next = next.plus({ days: 1 });
        }
        return next;
      }

      if (mode === 'CRON') {
        const interval = (cronParser as any).parseExpression(payload.cron || '* * * * *', {
          currentDate: fromInZone.toJSDate(),
          tz: timezone
        });
        return DateTime.fromJSDate(interval.next().toDate()).setZone(timezone);
      }
    } catch (e) {
      console.error(`Failed to calculate next fire: ${e.message}`);
    }

    return null;
  }

  static getNextFireTimes(schedule: any, count: number = 10): Date[] {
    const fireTimes: Date[] = [];
    let current = DateTime.now();
    
    for (let i = 0; i < count; i++) {
        const next = this.calculateNextFire(schedule, current);
        if (!next) break;
        fireTimes.push(next.toJSDate());
        current = next.plus({ seconds: 1 }); // Increment slightly to find the next one
    }
    
    return fireTimes;
  }
}
