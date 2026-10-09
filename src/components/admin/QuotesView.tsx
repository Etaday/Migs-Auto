import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, EnvelopeSimple, WhatsappLogo, Trash, ClipboardText, FileText } from '@/components/slab'
import { HANDOFF_KEY } from '@/components/InvoiceStudio'
import { chargeFor, DEPOSIT_RATE } from '@/data/catalog'
import { useData } from '@/components/admin/data'
import { money, shortDate, whatsappLink, longDate, todayIso } from '@/components/admin/ui'
import type { QuoteRow, QuoteStatus } from '@/lib/db'

/**
 * Quote requests from the website's /quote page. Set a price and the customer
 * is emailed; when they accept, "Create booking" turns it into a booking.
 */

const LABEL: Record<QuoteStatus, string> = { new: 'New', quoted: 'Quoted', booked: 'Booked', closed: 'Closed' }
const r3 = (n: number) => Math.round(n * 1000) / 1000

function QuoteCard({ q }: { q: QuoteRow }) {
  const { patch, remove, add } = useData()
  const navigate = useNavigate()
  const [price, setPrice] = useState(q.quoted_price != null ? String(q.quoted_price) : '')
  const [note, setNote] = useState(q.quote_note)
  const [date, setDate] = useState(q.event_date ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr('')
    try { await fn() } catch (e) { setErr(e instanceof Error ? e.message : 'That did not save.') } finally { setBusy(false) }
  }
  const phone = whatsappLink(q.phone)
  const priced = q.quoted_price != null

  const save = () => run(() => patch('quotes', q.id, { quoted_price: Number(price), quote_note: note.trim(), status: 'quoted' }))
  const makeDocument = () => {
    const doc = {
      kind: 'quotation', clientName: q.name, clientEmail: q.email, clientPhone: q.phone, eventTitle: q.service, eventDate: q.event_date ?? '', area: q.area,
      notes: q.quote_note || undefined,
      lines: [{ id: 1, desc: q.service || 'Service', qty: 1, rate: q.quoted_price ?? 0 }],
    }
    try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(doc)) } catch { /* storage unavailable */ }
    navigate('/invoice')
  }
  const toBooking = () => run(async () => {
    if (!date || date < todayIso()) throw new Error('Pick the event date (today or later) before creating the booking.')
    const sub = q.quoted_price ?? 0
    const location = sub > 0 ? (chargeFor(q.area) ?? 0) : 0
    const total = r3(sub + location)
    const deposit = r3(total * DEPOSIT_RATE)
    await add('bookings', {
      status: 'new', name: q.name, email: q.email, phone: q.phone, event_type: q.event_type, event_date: date, start_time: '', duration: '',
      area: q.area, venue: '', guests: '', notes: q.details,
      items: [{ id: `Q-${q.id.slice(0, 8)}`, code: 'QUOTE', name: `${q.service}: Quoted`, detail: q.quote_note.slice(0, 120), price: sub }],
      subtotal: sub, location_charge: location, total, deposit, balance: r3(total - deposit), has_quote_only: false,
      deposit_paid: false, payment_status: 'pending', amount_paid: 0, admin_notes: 'Created from a quote request.',
    })
    await patch('quotes', q.id, { status: 'booked' })
    window.location.hash = 'bookings'
  })

  return (
    <li className="adm-panel">
      <div className="adm-reviews__top">
        <b>{q.service || 'Quote'} · {q.name}</b>
        <span className={`adm-pill adm-pill--${q.status === 'new' ? 'new' : q.status === 'quoted' ? 'confirmed' : q.status === 'booked' ? 'completed' : 'cancelled'}`}>{LABEL[q.status]}</span>
      </div>
      <p>{q.details}</p>
      <p className="adm-note">{[q.event_type, q.event_date ? longDate(q.event_date) : 'Date not decided', q.area].filter(Boolean).join(' · ')} · requested {shortDate(q.created_at)}</p>
      <div className="adm-actions">
        <a className="adm-btn adm-btn--ghost" href={`mailto:${q.email}?subject=${encodeURIComponent('Your quote request, Judeng Production Studio')}`}><EnvelopeSimple size={15} aria-hidden="true" /> {q.email}</a>
        {phone && <a className="adm-btn adm-btn--ghost" href={phone} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={15} aria-hidden="true" /> WhatsApp</a>}
      </div>

      {q.status !== 'booked' && q.status !== 'closed' && (
        <div className="adm-row">
          <label className="adm-field"><span>Your price (KWD)</span><input type="number" min="0" step="0.5" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <label className="adm-field"><span>Note to the customer (optional)</span><input type="text" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What the price includes" /></label>
          <button type="button" className="adm-btn" disabled={busy || !(Number(price) > 0)} onClick={() => void save()}><Check size={15} weight="bold" aria-hidden="true" /> {priced ? 'Update quote' : 'Send quote'}</button>
        </div>
      )}
      {priced && q.status !== 'closed' && <p className="adm-note">Quoted at <b>{money(q.quoted_price as number)}</b>. The customer is emailed when you send the quote.</p>}

      {q.status === 'quoted' && (
        <div className="adm-row">
          <label className="adm-field"><span>Event date (needed for the booking)</span><input type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={makeDocument}><FileText size={15} aria-hidden="true" /> Quotation document</button>
          <button type="button" className="adm-btn" disabled={busy} onClick={() => void toBooking()}><ClipboardText size={15} aria-hidden="true" /> Create booking</button>
          {phone && priced && <a className="adm-btn adm-btn--ghost" href={`${phone}?text=${encodeURIComponent(`Hi ${q.name.split(' ')[0]}, your quote from Judeng Production Studio for ${q.service}: ${money(q.quoted_price as number)}${q.quote_note ? ` (${q.quote_note})` : ''}. Reply here to go ahead and we will book your date.`)}`} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={15} aria-hidden="true" /> Send quote on WhatsApp</a>}
        </div>
      )}

      {err && <p className="adm-error" role="alert">{err}</p>}
      <div className="adm-actions">
        {q.status !== 'closed' && q.status !== 'booked' && <button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={() => void run(() => patch('quotes', q.id, { status: 'closed' }))}>Close request</button>}
        <button type="button" className="adm-icon-btn" aria-label="Delete quote request" onClick={() => window.confirm('Delete this quote request?') && void remove('quotes', q.id)}><Trash size={16} /></button>
      </div>
    </li>
  )
}

export default function QuotesView() {
  const { data } = useData()
  const [tab, setTab] = useState<QuoteStatus>('new')
  const rows = data.quotes.filter((q) => q.status === tab)
  return (
    <div className="adm-stack">
      <div className="adm-chips" role="group" aria-label="Quote status">
        {(['new', 'quoted', 'booked', 'closed'] as const).map((s) => (
          <button key={s} type="button" className={tab === s ? 'is-on' : ''} aria-pressed={tab === s} onClick={() => setTab(s)}>
            {LABEL[s]}<small>{data.quotes.filter((q) => q.status === s).length}</small>
          </button>
        ))}
      </div>
      <p className="adm-note">Requests from the website&apos;s Request a quote page. Set a price to email the customer; create a booking once they accept.</p>
      {rows.length === 0 ? <p className="adm-empty">Nothing here.</p> : <ul className="adm-reviews">{rows.map((q) => <QuoteCard key={q.id} q={q} />)}</ul>}
    </div>
  )
}
