import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X, Phone, EnvelopeSimple, WhatsappLogo, Trash, Receipt, CalendarPlus } from '@/components/slab'
import type { BookingRow, BookingStatus, PaymentStatus } from '@/lib/db'
import { PAYMENT_LABEL, paymentPatch } from '@/lib/payments'
import { addToGoogleCalendarUrl } from '@/lib/gcal'
import { isConnected, removeBookingEvent, syncBooking } from '@/lib/gcalApi'
import { chargeFor, DEPOSIT_RATE } from '@/data/catalog'
import { DEFAULT_EXPENSE_TYPES, knownNames } from '@/lib/revenue'
import { HANDOFF_KEY } from '@/components/InvoiceStudio'
import { useData } from '@/components/admin/data'
import { StatusPill, STATUS_LABEL, longDate, formatTime, money, whatsappLink } from '@/components/admin/ui'

const STATUSES: BookingStatus[] = ['new', 'confirmed', 'completed', 'cancelled']

/** Hand a prepared document to the invoice tool. */
function openInInvoice(navigate: (to: string) => void, b: BookingRow, kind: 'invoice' | 'receipt' | 'quotation', amount: number) {
  const lines = b.items.map((o, i) => ({ id: i + 1, desc: `${o.name}${o.detail ? `, ${o.detail}` : ''}`, qty: 1, rate: o.price ?? 0 }))
  const doc = {
    kind,
    bookingId: b.id,
    clientName: b.name,
    clientEmail: b.email,
    clientPhone: b.phone,
    eventTitle: b.event_type,
    eventDate: b.event_date,
    eventVenue: b.venue,
    area: b.area,
    lines: lines.length ? lines : undefined,
    deposit: amount,
  }
  try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(doc)) } catch { /* storage unavailable */ }
  navigate('/invoice')
}

export default function BookingDrawer({ row, onClose }: { row: BookingRow; onClose: () => void }) {
  const { patch, remove, add } = useData()
  const navigate = useNavigate()
  const [date, setDate] = useState(row.event_date)
  const [time, setTime] = useState(row.start_time)
  const [notes, setNotes] = useState(row.admin_notes)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [gMsg, setGMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedMy, setCopiedMy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setErr('')
    try {
      await fn()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That did not save.')
    } finally {
      setBusy(false)
    }
  }

  const dirty = date !== row.event_date || time !== row.start_time || notes !== row.admin_notes
  const wa = whatsappLink(row.phone)
  const cr = row.change_request
  // Services without a fixed price (coverage, food photography) are quoted here.
  const unpriced = row.items.map((o, i) => ({ o, i })).filter(({ o }) => o.price === null)
  const [quoteIn, setQuoteIn] = useState<Record<number, string>>({})
  const [justQuoted, setJustQuoted] = useState(false)
  const quotesReady = unpriced.length > 0 && unpriced.every(({ i }) => Number(quoteIn[i]) > 0)
  const saveQuote = () => run(async () => {
    const items = row.items.map((o, i) => (o.price === null && Number(quoteIn[i]) > 0 ? { ...o, price: Number(quoteIn[i]) } : o))
    const subtotal = items.reduce((t, o) => t + (o.price ?? 0), 0)
    const location = subtotal > 0 ? (row.location_charge || chargeFor(row.area) || 0) : 0
    const total = Math.round((subtotal + location) * 1000) / 1000
    const deposit = Math.round(total * DEPOSIT_RATE * 1000) / 1000
    await patch('bookings', row.id, { items, subtotal, location_charge: location, total, deposit, balance: Math.round((total - deposit) * 1000) / 1000, has_quote_only: items.some((o) => o.price === null) })
    setQuoteIn({})
    setJustQuoted(true)
  })
  const quoteLink = `${window.location.origin}/my-booking?code=${row.manage_code ?? row.id}`
  // Sponsored by the studio: the client owes nothing; the waived price is kept so it can be undone.
  const sponsor = (on: boolean) => run(async () => {
    const r2 = (n: number) => Math.round(n * 1000) / 1000
    if (on) {
      await patch('bookings', row.id, { sponsored: true, sponsored_value: row.total > 0 ? row.total : row.sponsored_value ?? 0, total: 0, deposit: 0, balance: 0, amount_paid: 0, payment_status: 'fully_paid', deposit_paid: true, ...(row.status === 'new' ? { status: 'confirmed' as const } : {}) })
    } else {
      const total = row.sponsored_value ?? 0
      const deposit = r2(total * DEPOSIT_RATE)
      await patch('bookings', row.id, { sponsored: false, total, deposit, balance: r2(total - deposit), amount_paid: 0, payment_status: 'pending', deposit_paid: false })
    }
  })
  const [cost, setCost] = useState('')
  const [costMsg, setCostMsg] = useState('')
  const names = knownNames()
  const costType = names.expenseTypes.includes('Complimentary cost') ? 'Complimentary cost' : (names.expenseTypes[0] ?? DEFAULT_EXPENSE_TYPES[0])
  const addCost = () => run(async () => {
    const amount = Math.round(Number(cost) * 1000) / 1000
    if (!(amount > 0)) throw new Error('Enter what the studio spent on this event.')
    await add('expenses', { entry_date: row.event_date || new Date().toISOString().slice(0, 10), category: costType, item: `Sponsored: ${row.name}`.slice(0, 200), amount, note: `Studio-sponsored event on ${row.event_date}` })
    setCost('')
    setCostMsg(`Added ${money(amount)} to Finance as ${costType}.`)
  })
  const decide = (ok: boolean) => run(async () => {
    if (!cr) return
    const done = { ...cr, status: ok ? ('approved' as const) : ('declined' as const) }
    if (!ok) return patch('bookings', row.id, { change_request: done })
    if (cr.type === 'cancel') {
      await patch('bookings', row.id, { status: 'cancelled', change_request: done })
      if (isConnected()) await removeBookingEvent(row).catch(() => false)
    }
    else await patch('bookings', row.id, { event_date: cr.date || row.event_date, start_time: cr.time || row.start_time, change_request: done })
    if (cr.type === 'reschedule') { setDate(cr.date || row.event_date); setTime(cr.time || row.start_time) }
  })
  const myLink = `${window.location.origin}/my-booking?code=${row.manage_code ?? row.id}`
  const reviewLink = `${window.location.origin}/testimonials?review=${row.review_code ?? row.id}`

  // Rendered at the dashboard root so a glass panel above it cannot trap the fixed overlay.
  return createPortal(
    <div className="adm-overlay" role="dialog" aria-modal="true" aria-label={`Booking from ${row.name}`} onClick={onClose}>
      <aside className="adm-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="adm-drawer__head">
          <div>
            <h2>{row.name}</h2>
            <p>{row.event_type || 'Event'} on {longDate(row.event_date)}</p>
          </div>
          <button type="button" className="adm-icon-btn" onClick={onClose} aria-label="Close"><X size={18} weight="bold" /></button>
        </header>

        <div className="adm-drawer__body">
          {cr && cr.status === 'pending' && (
            <section className="adm-request" role="alert">
              <h3>Customer request</h3>
              <p><b>{cr.type === 'cancel' ? 'Wants to cancel this booking.' : `Wants to move to ${longDate(cr.date ?? row.event_date)}${cr.time ? ` at ${formatTime(cr.time)}` : ''}.`}</b></p>
              {cr.note && <p className="adm-quote">{cr.note}</p>}
              <div className="adm-actions">
                <button type="button" className="adm-btn" disabled={busy} onClick={() => void decide(true)}>{cr.type === 'cancel' ? 'Approve cancellation' : 'Approve new date'}</button>
                <button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={() => void decide(false)}>Decline</button>
              </div>
              <p className="adm-note">Approving updates the booking. Check your calendar first for a new date.</p>
            </section>
          )}
          <div className="adm-row">
            <label className="adm-field">
              <span>Status</span>
              <select value={row.status} disabled={busy} onChange={(e) => run(async () => {
                const status = e.target.value as BookingStatus
                await patch('bookings', row.id, { status })
                // Keep Google Calendar in step when it is connected.
                if (!isConnected()) return
                try {
                  if (status === 'confirmed') setGMsg(`Google Calendar: ${await syncBooking({ ...row, status })}.`)
                  else if (status === 'cancelled' && (await removeBookingEvent(row))) setGMsg('Google Calendar: event removed.')
                } catch (x) {
                  setGMsg(x instanceof Error ? x.message : 'Google Calendar did not update.')
                }
              })}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="adm-field">
              <span>Payment</span>
              <select value={row.payment_status} disabled={busy} onChange={(e) => run(() => {
                const ps = e.target.value as PaymentStatus
                const paid = ps === 'fully_paid' ? row.total : ps === 'deposit_paid' ? Math.max(row.amount_paid, row.deposit) : 0
                return patch('bookings', row.id, paymentPatch(paid, row.total, row.status))
              })}>
                {(Object.keys(PAYMENT_LABEL) as PaymentStatus[]).map((p) => <option key={p} value={p}>{PAYMENT_LABEL[p]}</option>)}
              </select>
            </label>
          </div>

          <section className="adm-request" aria-label="Sponsored by the studio">
            <h3>Sponsored by the studio</h3>
            {row.sponsored ? (
              <>
                <p><b>The client owes nothing for this event.</b>{row.sponsored_value ? ` Waived value: ${money(row.sponsored_value)}.` : ''}</p>
                <div className="adm-row">
                  <label className="adm-field"><span>What the studio spent (KWD)</span><input type="number" min={0} step="any" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} /></label>
                  <div className="adm-actions"><button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={() => void addCost()}>Add to Finance as {costType}</button></div>
                </div>
                {costMsg && <p className="adm-note" role="status">{costMsg}</p>}
                <div className="adm-actions"><button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={() => void sponsor(false)}>Undo sponsorship</button></div>
              </>
            ) : (
              <>
                <p className="adm-note">Use this when the team covers the event. The total, deposit and balance become 0, the booking is marked paid, and you can record the studio's own cost in Finance.</p>
                <div className="adm-actions"><button type="button" className="adm-btn" disabled={busy} onClick={() => void sponsor(true)}>Sponsor this event</button></div>
              </>
            )}
          </section>

          <p className="adm-note">Paid {money(row.amount_paid)} of {money(row.total)}. Saving an invoice or receipt for this booking updates the payment and the status automatically.</p>

          <div className="adm-contact">
            {row.phone && <a href={`tel:${row.phone}`}><Phone size={15} weight="fill" aria-hidden="true" /> {row.phone}</a>}
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={15} weight="fill" aria-hidden="true" /> WhatsApp</a>}
            <a href={`mailto:${row.email}`}><EnvelopeSimple size={15} weight="fill" aria-hidden="true" /> {row.email}</a>
          </div>

          <section>
            <h3>Services</h3>
            <ul className="adm-lines">
              {row.items.map((o) => (
                <li key={o.id}><span><b>{o.name}</b>{o.detail && <small>{o.detail}</small>}</span><span>{o.price === null ? 'Quote' : money(o.price)}</span></li>
              ))}
              {row.location_charge > 0 && <li><span><b>Location charge</b><small>{row.area}</small></span><span>{money(row.location_charge)}</span></li>}
            </ul>
            <dl className="adm-totals">
              <div><dt>Total</dt><dd>{money(row.total)}</dd></div>
              <div><dt>30% deposit</dt><dd>{money(row.deposit)}</dd></div>
              <div><dt>70% balance at venue</dt><dd>{money(row.balance)}</dd></div>
            </dl>
            {row.has_quote_only && <p className="adm-note">Includes a service that is quoted personally and not in the total.</p>}
          </section>

          {unpriced.length > 0 && (
            <section className="adm-request">
              <h3>Quotation needed</h3>
              <p>Set a price for each service below. The booking total, 30% deposit and balance update when you save.</p>
              {unpriced.map(({ o, i }) => (
                <label key={i} className="adm-field">
                  <span>{o.name}</span>
                  <input type="number" min="0" step="0.5" inputMode="decimal" placeholder="Price in KWD" value={quoteIn[i] ?? ''} onChange={(e) => setQuoteIn((q) => ({ ...q, [i]: e.target.value }))} />
                </label>
              ))}
              <div className="adm-actions">
                <button type="button" className="adm-btn" disabled={busy || !quotesReady} onClick={() => void saveQuote()}>Save quotation</button>
              </div>
              <p className="adm-note">Need to work the price out first? Use the Quotation tab, then enter the result here.</p>
            </section>
          )}

          {justQuoted && !row.has_quote_only && wa && (
            <section>
              <h3>Send the quotation</h3>
              <div className="adm-actions">
                <a className="adm-btn adm-btn--ghost" href={`${wa}?text=${encodeURIComponent(`Hi ${row.name.split(' ')[0]}, here is your quotation from Judeng Production Studio: total ${money(row.total)} (30% deposit ${money(row.deposit)}). You can view your booking here: ${quoteLink}`)}`} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={15} aria-hidden="true" /> Send on WhatsApp</a>
              </div>
            </section>
          )}

          <section>
            <h3>Event</h3>
            <div className="adm-row">
              <label className="adm-field"><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <label className="adm-field"><span>Start time ({formatTime(time)})</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            </div>
            <p className="adm-note">{row.duration} · {row.area}{row.venue ? `, ${row.venue}` : ''}{row.guests ? ` · about ${row.guests} guests` : ''}</p>
            {row.notes && <p className="adm-quote"><b>Customer notes:</b> {row.notes}</p>}
          </section>

          <section>
            <h3>Your notes</h3>
            <textarea className="adm-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private notes, only you can see these" />
            <button type="button" className="adm-btn" disabled={!dirty || busy} onClick={() => run(() => patch('bookings', row.id, { event_date: date, start_time: time, admin_notes: notes }))}>
              Save changes
            </button>
          </section>

          <section>
            <h3>Calendar</h3>
            <div className="adm-actions">
              {isConnected() ? (
                <button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={() => run(async () => setGMsg(`Google Calendar: ${await syncBooking(row)}.`))}><CalendarPlus size={15} aria-hidden="true" /> Sync to Google Calendar</button>
              ) : (
                <a className="adm-btn adm-btn--ghost" href={addToGoogleCalendarUrl(row)} target="_blank" rel="noopener noreferrer"><CalendarPlus size={15} aria-hidden="true" /> Add to Google Calendar</a>
              )}
            </div>
            <p className="adm-note">{gMsg || (isConnected() ? 'Confirmed bookings are added to your Google Calendar automatically; cancelling removes the event.' : 'Connect Google Calendar on the Calendar tab to sync automatically. Until then this opens Google with the event filled in.')}</p>
          </section>

          <section>
            <h3>Customer booking link</h3>
            <div className="adm-actions">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { void navigator.clipboard?.writeText(myLink).then(() => setCopiedMy(true)) }}>Copy link</button>
              {wa && <a className="adm-btn adm-btn--ghost" href={`${wa}?text=${encodeURIComponent(`Hi ${row.name.split(' ')[0]}, you can check your Judeng Production Studio booking, change the date or cancel here: ${myLink}`)}`} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={15} aria-hidden="true" /> Send on WhatsApp</a>}
            </div>
            <p className="adm-note">{copiedMy ? 'Link copied.' : 'A private page where the customer sees the status and asks to change the date or cancel.'}</p>
          </section>

          <section>
            <h3>Review invitation</h3>
            <div className="adm-actions">
              <button type="button" className="adm-btn adm-btn--ghost" disabled={row.review_used} onClick={() => { void navigator.clipboard?.writeText(reviewLink).then(() => setCopied(true)) }}>Copy review link</button>
              <button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={() => window.confirm('Reset the review link? The old link stops working and a new one is created.') && run(async () => { const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) => n.toString(16).padStart(2, '0')).join(''); await patch('bookings', row.id, { review_code: code, review_used: false }); setCopied(false) })}>Reset review link</button>
              {wa && !row.review_used && <a className="adm-btn adm-btn--ghost" href={`${wa}?text=${encodeURIComponent(`Hi ${row.name.split(' ')[0]}, thank you for choosing Judeng Production Studio! We would love your feedback: ${reviewLink}`)}`} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={15} aria-hidden="true" /> Send on WhatsApp</a>}
            </div>
            <p className="adm-note">{copied ? 'Link copied. Send it to the customer.' : row.review_used ? 'This customer has already left a review.' : 'A private one-time link. Only people you send it to can leave a review, and it stops working after one use.'}</p>
          </section>

          <section>
            <h3>Documents</h3>
            <div className="adm-actions">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => openInInvoice(navigate, row, 'invoice', row.amount_paid || (row.deposit_paid ? row.deposit : 0))}><Receipt size={15} aria-hidden="true" /> Invoice</button>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => openInInvoice(navigate, row, 'quotation', 0)}>Quotation</button>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => openInInvoice(navigate, row, 'receipt', row.deposit)}>Deposit receipt</button>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => openInInvoice(navigate, row, 'receipt', row.total)}>Full payment receipt</button>
            </div>
          </section>

          {err && <p className="adm-error" role="alert">{err}</p>}
        </div>

        <footer className="adm-drawer__foot">
          <StatusPill status={row.status} />
          <button
            type="button"
            className="adm-btn adm-btn--danger"
            onClick={() => window.confirm('Delete this booking permanently?') && run(async () => { await remove('bookings', row.id); onClose() })}
          >
            <Trash size={15} aria-hidden="true" /> Delete
          </button>
        </footer>
      </aside>
    </div>,
    document.querySelector('.adm') ?? document.body,
  )
}
