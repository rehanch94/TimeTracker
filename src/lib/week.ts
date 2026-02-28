/**
 * Get start and end of current week in UTC.
 * weekStartDay: 0 = Sunday, 1 = Monday, ... 6 = Saturday
 */
export function getWeekBoundsUtc(weekStartDay: number): { start: Date; end: Date } {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayOfWeek = d.getUTCDay();
  const daysBack = (dayOfWeek - weekStartDay + 7) % 7;
  d.setUTCDate(d.getUTCDate() - daysBack);
  d.setUTCHours(0, 0, 0, 0);
  const start = new Date(d);
  const end = new Date(d);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
