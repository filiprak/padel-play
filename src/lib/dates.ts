/**
 * src/lib/dates.ts — single place for timestamp formatting.
 *
 * Conventions (used by every timestamp in the UI):
 * - date: `1 Jan 2026` (`D MMM YYYY`)
 * - time: 24-hour `HH:mm` (e.g. `18:00`)
 */
import dayjs from 'dayjs'

/** `2026-01-01T10:00:00.000Z` → `1 Jan 2026`. Never throws (`Invalid Date` fallback). */
export function formatMatchDate(iso: string): string {
  return dayjs(iso).format('D MMM YYYY')
}

/** `2026-01-01T18:00:00.000Z` → `18:00` (24-hour). */
export function formatMatchTime(iso: string): string {
  return dayjs(iso).format('HH:mm')
}

/** `10:00 – 11:30` for a match's time range. */
export function formatTimeRange(startsAt: string, endsAt: string): string {
  return `${formatMatchTime(startsAt)} – ${formatMatchTime(endsAt)}`
}

/**
 * Relative day pill for upcoming matches: `Today`, `Tomorrow`, `In N days`,
 * or `null` when already over / further than a week out.
 */
export function relativeDayLabel(startsAt: string, endsAt: string): string | null {
  const now = dayjs()
  if (dayjs(endsAt).isBefore(now)) return null
  const diff = dayjs(startsAt).startOf('day').diff(now.startOf('day'), 'day')
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 7) return `In ${diff} days`
  return null
}
