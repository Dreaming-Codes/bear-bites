import { DateTime } from 'luxon'

/**
 * LA timezone identifier - used for all dining hall date operations
 */
export const LA_TIMEZONE = 'America/Los_Angeles'

/**
 * Get the current date/time in LA timezone
 */
export function nowInLA(): DateTime {
  return DateTime.now().setZone(LA_TIMEZONE)
}

/**
 * Parse a YYYY-MM-DD date string as a date in LA timezone.
 * Returns a DateTime at noon LA time to avoid DST edge cases.
 */
export function parseDateInLA(dateStr: string): DateTime {
  return DateTime.fromISO(dateStr, { zone: LA_TIMEZONE }).set({ hour: 12 })
}

/**
 * Format a DateTime or JS Date to YYYY-MM-DD in LA timezone
 */
export function formatDateLA(date: DateTime | Date): string {
  const dt =
    date instanceof Date ? DateTime.fromJSDate(date).setZone(LA_TIMEZONE) : date
  return dt.toFormat('yyyy-MM-dd')
}

/**
 * Convert a DateTime to a JS Date (for compatibility with existing code)
 */
export function toJSDate(dt: DateTime): Date {
  return dt.toJSDate()
}

/**
 * Get today's date in LA timezone as YYYY-MM-DD
 */
export function todayInLA(): string {
  return nowInLA().toFormat('yyyy-MM-dd')
}
