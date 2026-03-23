import { DateTime } from 'luxon';
import cronParser from 'cron-parser';
import { CalendarUtils } from './calendar-utils';

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
        const days = Array.isArray(payload.days) && payload.days.length > 0 ? payload.days : [1, 2, 3, 4, 5];
        const [hour, minute] = (payload.time || "00:00").split(':').map(Number);
        
        let next = fromInZone.set({ hour, minute, second: 0, millisecond: 0 });
        if (next <= fromInZone) next = next.plus({ days: 1 });
        
        let safety = 0;
        while (!days.includes(next.weekday) && safety < 400) {
          next = next.plus({ days: 1 });
          safety++;
        }
        return safety < 400 ? next : null;
      }

      if (mode === 'MONTHLY') {
        const days = Array.isArray(payload.days) && payload.days.length > 0 ? payload.days : [1];
        const [hour, minute] = (payload.time || "00:00").split(':').map(Number);
        const runsPerDay = payload.runsPerDay || 1;
        const intervalMin = payload.intervalMinutes || 10;
        
        // Start by checking if we are still within the 'N runs' for the current day
        if (days.includes(fromInZone.day)) {
          const dayStart = fromInZone.set({ hour, minute, second: 0, millisecond: 0 });
          
          for (let i = 0; i < runsPerDay; i++) {
            const candidate = dayStart.plus({ minutes: i * intervalMin });
            if (candidate > fromInZone) {
                // Check if this candidate still falls on the same day. 
                // If it pushes into the next day, we should move to the "next valid day" logic.
                if (candidate.day === fromInZone.day) return candidate;
                break;
            }
          }
        }

        // Otherwise, find the next valid day
        let next = fromInZone.plus({ days: 1 }).set({ hour, minute, second: 0, millisecond: 0 });
        
        // Loop until we find a matching day in the monthly list
        let safety = 0;
        while (!days.includes(next.day) && safety < 400) {
          next = next.plus({ days: 1 });
          safety++;
        }
        return safety < 400 ? next : null;
      }

      if (mode === 'CRON') {
        const cronStr = (payload.cron || '').trim();
        if (!cronStr) return null;
        try {
          // In this TypeScript configuration, 'cronParser' is imported directly
          // as the CronExpressionParser class, so we call .parse() directly on it.
          const interval = (cronParser as any).parse(cronStr, {
            currentDate: fromInZone.toJSDate(),
            tz: timezone
          });
          return DateTime.fromJSDate(interval.next().toDate()).setZone(timezone);
        } catch (e) {
          return null; // Silent skip for invalid expressions
        }
      }
    } catch (e) {
      console.error(`Failed to calculate next fire: ${e.message}`);
      return null;
    }
  }

  /**
   * INTERSECTION LOGIC: Predicts the next N valid firing times.
   * Logic:
   * 1. Generate one candidate fire time.
   * 2. Check ALL bound calendars to ensure they are ALL open at that time.
   * 3. If any calendar is closed, discard that time and try the next schedule fire.
   * 4. Repeat until limit is reached or we reach the search limit.
   */
  static getPredictedFireTimes(
    schedule: any, 
    calendars: any[] = [], 
    count: number = 10, 
    startFrom?: DateTime
  ): Date[] {
    const fireTimes: Date[] = [];
    let current = startFrom || DateTime.now();
    
    // We search up to 1000 potential firings to avoid infinite loops if all are blocked
    const MAX_SEARCH = 1000;
    let attempts = 0;

    while (fireTimes.length < count && attempts < MAX_SEARCH) {
      attempts++;
      const next = this.calculateNextFire(schedule, current);
      if (!next) break;

      // Check all bound calendars
      let isBlocked = false;
      for (const calendar of calendars) {
        if (!CalendarUtils.isCalendarOpen(calendar, next)) {
          isBlocked = true;
          break;
        }
      }

      if (!isBlocked) {
        fireTimes.push(next.toJSDate());
      }
      
      // Ensure we advance at least 1 second to find the next occurrence
      current = next.plus({ seconds: 1 });
    }
    
    return fireTimes;
  }
}
