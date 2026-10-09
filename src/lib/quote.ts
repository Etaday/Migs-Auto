import { backendOn, submitPublic } from '@/lib/db'
import { ENDPOINT, RECIPIENT, sanitize, EMAIL_RE, SubmitError } from '@/lib/contact'

/** A quote request for a service with no fixed price. It goes straight to the
 *  studio dashboard (Quotes tab); the studio replies with a price. */

export type QuoteDraft = { service: string; eventType: string; date: string; area: string; details: string; name: string; email: string; phone: string; website: string }

/** `field` is the form field that needs attention, so the page can jump to it. */
export function readQuote(data: FormData): { quote: QuoteDraft } | { error: string; field: string } {
  const f = (k: string, max: number, nl = false) => sanitize(String(data.get(k) ?? '').trim(), nl).slice(0, max)
  const quote: QuoteDraft = {
    service: f('service', 100), eventType: f('eventType', 80), date: f('date', 10), area: f('area', 80),
    details: f('details', 3000, true), name: f('name', 100), email: f('email', 254), phone: f('phone', 40),
    website: String(data.get('website') ?? ''),
  }
  if (!quote.service) return { error: 'Choose what you need a quote for.', field: 'service' }
  if (quote.details.length < 10) return { error: 'Tell us a little about what you need.', field: 'details' }
  if (quote.date && quote.date < new Date().toLocaleDateString('en-CA')) return { error: 'Pick a date that is today or later, or leave it empty.', field: 'date' }
  if (!quote.name) return { error: 'Add your name.', field: 'name' }
  if (!EMAIL_RE.test(quote.email)) return { error: 'Add a valid email so we can send the quote.', field: 'email' }
  if (quote.phone && quote.phone.replace(/\D/g, '').length < 7) return { error: 'That phone number looks too short.', field: 'phone' }
  return { quote }
}

export async function submitQuote(q: QuoteDraft): Promise<{ via: 'webhook' | 'mailto' }> {
  const row = { name: q.name, email: q.email, phone: q.phone, service: q.service, event_type: q.eventType, event_date: q.date || null, area: q.area, details: q.details, status: 'new' as const }
  if (backendOn) {
    try {
      await submitPublic('quotes', row)
    } catch {
      throw new SubmitError('We could not send your request. Please try again or contact us directly.')
    }
    return { via: 'webhook' }
  }
  void submitPublic('quotes', row).catch(() => undefined)
  if (ENDPOINT) {
    const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'quote', ...q }) })
    if (!res.ok) throw new SubmitError(`The server answered ${res.status}.`)
    return { via: 'webhook' }
  }
  const body = [`Service: ${q.service}`, `Event: ${q.eventType || 'Not specified'}`, `Date: ${q.date || 'Not decided'}`, `Area: ${q.area || 'Not specified'}`, `Name: ${q.name}`, `Email: ${q.email}`, `Phone: ${q.phone || 'Not given'}`, '', q.details].join('\n')
  window.location.href = `mailto:${encodeURIComponent(RECIPIENT)}?subject=${encodeURIComponent(`Quote request: ${q.service}`)}&body=${encodeURIComponent(body)}`
  return { via: 'mailto' }
}
