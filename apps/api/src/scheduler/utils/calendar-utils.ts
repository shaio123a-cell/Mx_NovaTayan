import { DateTime } from 'luxon';

export class CalendarUtils {
  /**
   * Checks if a specific point in time is "open" based on the calendar rules.
   * Logic:
   * 1. If any EXCEPTION_DATE matches the day, it's CLOSED.
   * 2. If any EXCLUDE_WINDOW matches the time, it's CLOSED.
   * 3. If there are ALLOW_WINDOW rules:
   *    - It's OPEN only if it matches at least one ALLOW_WINDOW.
   * 4. If there are NO ALLOW_WINDOW rules:
   *    - It's OPEN (unless already closed by 1 or 2).
   */
  static isCalendarOpen(calendar: any, time: DateTime): boolean {
    if (!calendar) return true;
    if (calendar.state === 'PAUSED') return false;

    const localTime = time.setZone(calendar.timezone || 'UTC');
    const rules = calendar.rules || [];

    // 1. Check Exceptions (Holidays/Specific Dates)
    for (const rule of rules) {
      if (rule.ruleType === 'EXCEPTION_DATE') {
        const payload = rule.payload as any;
        if (localTime.toISODate() === payload.date) return false;
      }
    }

    // 2. Check Exclusions (Blackout Windows)
    for (const rule of rules) {
      if (rule.ruleType === 'EXCLUDE_WINDOW') {
        if (this.isInWindow(localTime, rule.payload)) return false;
      }
    }

    // 3. Check Allowances (Business Hours)
    const allowRules = rules.filter(r => r.ruleType === 'ALLOW_WINDOW');
    if (allowRules.length === 0) return true; // No allow rules = open by default

    for (const rule of allowRules) {
      if (this.isInWindow(localTime, rule.payload)) return true;
    }

    return false;
  }

  private static isInWindow(time: DateTime, window: any): boolean {
    // Check Days of Week (0=Sun, 1=Mon, ..., 6=Sat)
    if (window.daysOfWeek && window.daysOfWeek.length > 0) {
      const day = time.weekday === 7 ? 0 : time.weekday;
      if (!window.daysOfWeek.includes(day)) return false;
    }

    // Check Time Window (HH:mm)
    if (window.start && window.end) {
      const currentTimeMinutes = time.hour * 60 + time.minute;
      
      const [startH, startM] = window.start.split(':').map(Number);
      const [endH, endM] = window.end.split(':').map(Number);
      
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
    }

    return true;
  }
}
