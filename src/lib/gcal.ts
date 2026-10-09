import type { BookingRow } from '@/lib/db'

/**
 * Google Calendar helpers shared by the booking drawer and the sync code:
 * how a booking becomes a calendar entry, and the "Add to Google Calendar"
 * link that needs no sign-in (it opens Google's own pre-filled event form).
 */

export const TIME_ZONE = 'Asia/Kuwait'

/** "3 hours" -> 3, "5 hours or more" -> 5, otherwise 3. */
const hoursOf = (d: string) => Number(/(\d+)/.exec(d)?.[1]) || 3
const p2 = (n: number) => String(n).padStart(2, '0')

/** The calendar entry for a booking, as local Kuwait date-times "YYYY-MM-DDTHH:MM:00". */
export function bookingEvent(b: BookingRow) {
  const [hh, mm] = (b.start_time || '12:00').split(':').map(Number)
  const startMin = hh * 60 + (mm || 0)
  const endTotal = startMin + hoursOf(b.duration) * 60
  const endDate = new Date(`${b.event_date}T00:00:00`)
  endDate.setDate(endDate.getDate() + Math.floor(endTotal / 1440))
  const endIso = `${endDate.getFullYear()}-${p2(endDate.getMonth() + 1)}-${p2(endDate.getDate())}`
  const e = endTotal % 1440
  const description = [
    b.items.map((i) => `${i.name}${i.detail ? ` (${i.detail})` : ''}`).join('\n'),
    '',
    `Customer: ${b.name}`,
    `Phone: ${b.phone}`,
    `Email: ${b.email}`,
    `Total: ${b.total} KWD | Deposit (30%): ${b.deposit} KWD${b.deposit_paid ? ' (received)' : ''} | Balance at venue: ${b.balance} KWD`,
    b.notes ? `Notes: ${b.notes}` : '',
  ].filter((l, i, a) => l || a[i - 1]).join('\n')
  return {
    summary: `${b.event_type || 'Event'} - ${b.name} (${b.items.map((i) => i.name.split(':')[0]).filter((n, k, a) => a.indexOf(n) === k).join(', ')})`,
    description,
    location: [b.venue, b.area].filter(Boolean).join(', '),
    start: `${b.event_date}T${p2(hh)}:${p2(mm || 0)}:00`,
    end: `${endIso}T${p2(Math.floor(e / 60))}:${p2(e % 60)}:00`,
  }
}

const compact = (dt: string) => dt.replace(/[-:]/g, '')

/** A link that opens Google Calendar's new-event form, filled in from the booking. */
export function addToGoogleCalendarUrl(b: BookingRow): string {
  const ev = bookingEvent(b)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.summary,
    dates: `${compact(ev.start)}/${compact(ev.end)}`,
    ctz: TIME_ZONE,
    details: ev.description,
    location: ev.location,
  })
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}
