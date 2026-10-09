import { ENDPOINT, RECIPIENT, EMAIL_RE, sanitize, SubmitError } from '@/lib/contact'
import { backendOn, submitPublic, type BookingRow } from '@/lib/db'
import { quote, optionById, serviceOf, chargeFor, money, PAYMENT_METHODS, CURRENCY } from '@/data/catalog'

/**
 * Booking submission. Totals are recomputed here from the option ids and the
 * area, never taken from the form. Delivery matches the contact form: a JSON
 * POST to VITE_CONTACT_ENDPOINT when set, otherwise the visitor's mail client
 * opens with the request laid out.
 */

export const EVENT_TYPES = ['Wedding', 'Birthday', 'Debut', 'Christening', 'Corporate event', 'Restaurant or food shoot', 'Other'] as const
export const DURATIONS = ['2 hours', '3 hours', '4 hours', '5 hours or more', 'As per package', 'Not sure yet'] as const

export type BookingItem = { id: string; code: string; name: string; detail: string; price: number | null }

export type Booking = {
  items: BookingItem[]
  eventType: string
  date: string
  startTime: string
  duration: string
  area: string
  venue: string
  guests: string
  name: string
  email: string
  phone: string
  notes: string
  subtotal: number
  locationCharge: number
  total: number
  deposit: number
  balance: number
  hasQuoteOnly: boolean
  currency: string
  agreed: boolean
  /** Honeypot. Empty for a person. */
  website: string
}

const field = (data: FormData, key: string, max: number, newlines = false) =>
  sanitize(String(data.get(key) ?? '').trim(), newlines).slice(0, max)

/** `field` is the form field that needs attention, so the page can jump to it. */
export function readBooking(data: FormData): { booking: Booking } | { error: string; field: string } {
  const ids = data.getAll('items').map(String).filter((id) => optionById(id))
  const area = field(data, 'area', 80)
  const q = quote(ids, area)
  const booking: Booking = {
    items: q.items.map((o) => ({ id: o.id, code: o.code, name: `${serviceOf(o.id)?.name ?? ''}: ${o.group ? `${o.group}, ` : ''}${o.name}`, detail: o.detail, price: o.price })),
    eventType: field(data, 'eventType', 60),
    date: field(data, 'date', 10),
    startTime: field(data, 'startTime', 5),
    duration: field(data, 'duration', 40),
    area,
    venue: field(data, 'venue', 200),
    guests: field(data, 'guests', 6),
    name: field(data, 'name', 80),
    email: field(data, 'email', 254),
    phone: field(data, 'phone', 40),
    notes: field(data, 'notes', 3000, true),
    subtotal: q.subtotal,
    locationCharge: q.location,
    total: q.total,
    deposit: q.deposit,
    balance: q.balance,
    hasQuoteOnly: q.hasQuoteOnly,
    currency: CURRENCY,
    agreed: data.get('agree') === 'on',
    website: String(data.get('website') ?? ''),
  }
  if (q.items.length === 0) return { error: 'Choose at least one service.', field: 'items' }
  if (!booking.date) return { error: 'Pick your event date.', field: 'date' }
  if (booking.date < new Date().toLocaleDateString('en-CA')) return { error: 'Pick a date that is today or later.', field: 'date' }
  if (!booking.startTime) return { error: 'Pick the event start time.', field: 'startTime' }
  if (!booking.duration) return { error: 'Choose how long you need us.', field: 'duration' }
  if (chargeFor(area) === undefined) return { error: 'Choose your area so we can add any location charge.', field: 'area' }
  if (!booking.venue) return { error: 'Add the venue address or details.', field: 'venue' }
  if (!booking.name) return { error: 'Add your name.', field: 'name' }
  if (!EMAIL_RE.test(booking.email)) return { error: 'Add a valid email.', field: 'email' }
  if (booking.phone.replace(/\D/g, '').length < 7) return { error: 'Add a phone number so we can reach you.', field: 'phone' }
  if (!booking.agreed) return { error: 'Please agree to the booking terms.', field: 'agree' }
  return { booking }
}

/** "18:30" -> "6:30 PM" */
export function formatTime(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!m) return hhmm
  const h = Number(m[1])
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

/** A private, unguessable code the customer uses to check or change this booking. */
export const newManageCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) => n.toString(16).padStart(2, '0')).join('')

function toRow(b: Booking, code: string): Partial<BookingRow> {
  return {
    manage_code: code,
    status: 'new',
    name: b.name,
    email: b.email,
    phone: b.phone,
    event_type: b.eventType,
    event_date: b.date,
    start_time: b.startTime,
    duration: b.duration,
    area: b.area,
    venue: b.venue,
    guests: b.guests,
    notes: b.notes,
    items: b.items,
    subtotal: b.subtotal,
    location_charge: b.locationCharge,
    total: b.total,
    deposit: b.deposit,
    balance: b.balance,
    has_quote_only: b.hasQuoteOnly,
    deposit_paid: false,
    admin_notes: '',
  }
}

export async function submitBooking(b: Booking): Promise<{ via: 'webhook' | 'mailto'; code: string }> {
  const code = newManageCode()
  if (backendOn) {
    try {
      await submitPublic('bookings', toRow(b, code))
    } catch {
      throw new SubmitError('We could not send your request. Please try again or contact us directly.')
    }
    return { via: 'webhook', code }
  }
  // Demo mode keeps a copy in this browser so the dashboard can show it.
  void submitPublic('bookings', toRow(b, code)).catch(() => undefined)

  if (ENDPOINT) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'booking', ...b }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new SubmitError(body?.error || `The server answered ${res.status}.`)
    }
    return { via: 'webhook', code }
  }

  const subject = `Booking request: ${b.items.map((i) => i.name.split(':')[0]).filter((n, k, a) => a.indexOf(n) === k).join(', ')} on ${b.date}`
  const lines = [
    'SERVICES',
    ...b.items.map((i) => `- ${i.name}${i.detail ? ` (${i.detail})` : ''}: ${i.price === null ? 'to be quoted' : money(i.price)}`),
    '',
    'PRICE',
    `Subtotal: ${money(b.subtotal)}`,
    `Location charge (${b.area}): ${money(b.locationCharge)}`,
    `Total: ${money(b.total)}${b.hasQuoteOnly ? ' (plus items to be quoted)' : ''}`,
    `30% deposit: ${money(b.deposit)}`,
    `70% balance, paid at the venue on the event date: ${money(b.balance)}`,
    `Payment methods: ${PAYMENT_METHODS.join(' or ')}`,
    '',
    'EVENT',
    `Type: ${b.eventType || 'Not specified'}`,
    `Date: ${formatDate(b.date)}`,
    `Start time: ${formatTime(b.startTime)}`,
    `Duration: ${b.duration}`,
    `Area: ${b.area}`,
    `Venue: ${b.venue}`,
    `Guests: ${b.guests || 'Not specified'}`,
    '',
    'CONTACT',
    `Name: ${b.name}`,
    `Email: ${b.email}`,
    `Phone: ${b.phone}`,
    '',
    b.notes,
    '',
    'Customer agreed to the booking terms: yes',
    'Availability to be checked against the Google Calendar before confirmation.',
  ]
  window.location.href = `mailto:${encodeURIComponent(RECIPIENT)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
  return { via: 'mailto', code }
}
