import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Printer, Plus, Trash, ArrowLeft } from '@/components/slab'
import { profile } from '@/data/profile'
import { addRow, updateRow, listRows, backendOn, getSession, onSessionChange, type BookingRow } from '@/lib/db'
import { paymentPatch, PAYMENT_LABEL } from '@/lib/payments'
import { docLink, emailHref, whatsappHref, shareText } from '@/lib/share'
import InvoicePaper from '@/components/InvoicePaper'
import { totalsOf, quoteNote, type Doc, type Kind, type Line } from '@/lib/invoiceDoc'
import { serviceOf, ALL_OPTIONS, AREAS, DEPOSIT_RATE, PAYMENT_METHODS } from '@/data/catalog'

/**
 * InvoiceStudio - the studio's own invoice and receipt maker at /invoice.
 *
 * Fill the form, watch the paper update, press Print / Save as PDF. Not
 * linked from the public nav. Drafts are kept in this browser only
 * (localStorage); nothing is sent anywhere.
 */

const KEY = 'migs-invoice-draft-v1'
const COUNTER = 'migs-invoice-counter-v1'
const METHODS = [...PAYMENT_METHODS, 'Other']
const CURRENCIES = ['KWD', '$', '€', '£']

const iso = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const addDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return iso(d)
}

function nextNumber(kind: Kind): string {
  let n = 1
  try {
    const all = JSON.parse(localStorage.getItem(COUNTER) ?? '{}') as Record<string, number>
    n = (all[kind] ?? 0) + 1
  } catch { /* storage unavailable */ }
  return `${kind === 'invoice' ? 'INV' : kind === 'receipt' ? 'REC' : 'QT'}-${iso().replace(/-/g, '')}-${String(n).padStart(3, '0')}`
}

function bumpCounter(kind: Kind) {
  try {
    const all = JSON.parse(localStorage.getItem(COUNTER) ?? '{}') as Record<string, number>
    all[kind] = (all[kind] ?? 0) + 1
    localStorage.setItem(COUNTER, JSON.stringify(all))
  } catch { /* storage unavailable */ }
}

const blank = (kind: Kind = 'invoice'): Doc => ({
  kind,
  number: nextNumber(kind),
  issued: iso(),
  due: addDays(7),
  validUntil: addDays(14),
  paidOn: iso(),
  method: 'Cash',
  currency: 'KWD',
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  clientAddress: '',
  eventTitle: '',
  eventDate: '',
  eventVenue: '',
  lines: [{ id: 1, desc: '', qty: 1, rate: 0 }],
  area: '',
  discount: 0,
  taxPct: 0,
  deposit: 0,
  notes: kind === 'invoice' ? 'A 30% deposit confirms your booking. The remaining 70% is paid at the venue on the event date.' : kind === 'quotation' ? 'To confirm, reply to accept this quotation and we will reserve your date.' : 'Thank you for choosing Judeng Production Studio.',
  studioPhone: profile.phone,
  studioAddress: '',
  payTo: 'WAMD or cash.',
})

/** The dashboard hands a prepared document over through sessionStorage. */
export const HANDOFF_KEY = 'migs-invoice-handoff'
type Handoff = Partial<Doc> & { bookingId?: string }
function takeHandoff(): Handoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY)
    if (!raw) return null
    sessionStorage.removeItem(HANDOFF_KEY)
    return JSON.parse(raw) as Handoff
  } catch {
    return null
  }
}

function load(): { doc: Doc; bookingId: string | null } {
  const fix = (d: Doc): Doc => ({ ...d, notes: quoteNote(d) })
  const hand = takeHandoff()
  if (hand) {
    const { bookingId, ...rest } = hand
    return { doc: fix({ ...blank(hand.kind ?? 'invoice'), ...rest }), bookingId: bookingId ?? null }
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { doc: fix({ ...blank(), ...(JSON.parse(raw) as Partial<Doc>) }), bookingId: null }
  } catch { /* ignore */ }
  return { doc: blank(), bookingId: null }
}

const num = (v: string) => {
  const n = parseFloat(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export default function InvoiceStudio() {
  const [signedIn, setSignedIn] = useState(() => !!getSession())
  useEffect(() => onSessionChange(() => setSignedIn(!!getSession())), [])
  // With a real backend this tool is for the signed-in admin only.
  if (backendOn && !signedIn) return <Navigate to="/admin" replace />
  return <InvoiceEditor />
}

const label = (o: (typeof ALL_OPTIONS)[number]) => `${serviceOf(o.id)?.name}: ${o.name}${o.detail ? `, ${o.detail}` : ''}`

function InvoiceEditor() {
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [share, setShare] = useState<{ id: string; token: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [init] = useState(load)
  const [doc, setDoc] = useState<Doc>(init.doc)
  const [bookingId, setBookingId] = useState<string | null>(init.bookingId)
  const [bookingMsg, setBookingMsg] = useState('')
  const [saveError, setSaveError] = useState('')
  // When ticked, saving also makes the reservation (booking) match this document.
  const [override, setOverride] = useState(false)
  // Reserve the date without asking for the 30% deposit first.
  const [noDeposit, setNoDeposit] = useState(false)
  const set = <K extends keyof Doc>(k: K, v: Doc[K]) => setDoc((d) => ({ ...d, [k]: v }))

  useEffect(() => {
    document.title = 'Invoice, receipt and quotation - Judeng Production Studio'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(doc)) } catch { /* ignore */ }
  }, [doc])

  const { total, paid, isReceipt, isQuotation } = totalsOf(doc)
  const kindName = isQuotation ? 'quotation' : isReceipt ? 'receipt' : 'invoice'

  const setLine = (id: number, patch: Partial<Line>) =>
    set('lines', doc.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const addLine = () => set('lines', [...doc.lines, { id: Date.now(), desc: '', qty: 1, rate: 0 }])
  const removeLine = (id: number) => set('lines', doc.lines.length > 1 ? doc.lines.filter((l) => l.id !== id) : doc.lines)

  const switchKind = (kind: Kind) => {
    if (kind === doc.kind) return
    setDoc((d) => ({ ...d, kind, number: nextNumber(kind), notes: blank(kind).notes }))
  }
  const newDoc = () => {
    if (window.confirm('Start a new blank document? The current draft will be cleared.')) setDoc(blank(doc.kind))
  }
  const saveToDashboard = async () => {
    setSaved('saving')
    setSaveError('')
    setBookingMsg('')
    try {
      const fields = {
        booking_id: bookingId,
        kind: doc.kind,
        number: doc.number,
        client_name: doc.clientName,
        total,
        paid,
        data: doc as unknown as Record<string, unknown>,
      }
      if (share) {
        await updateRow('invoices', share.id, fields)
      } else {
        const row = await addRow('invoices', fields)
        setShare({ id: row.id, token: row.share_token })
        bumpCounter(doc.kind)
      }
      setSaved('saved')
      // Optional override: the document becomes the source of truth for the reservation.
      let linkedId = bookingId
      if (override) {
        try {
          const t = totalsOf(doc)
          const clip = (v: string, n: number) => v.trim().slice(0, n)
          const items = doc.lines.filter((l) => l.desc.trim() || l.rate > 0).slice(0, 20).map((l) => ({ id: String(l.id), code: 'DOC', name: clip(l.desc, 120) || 'Item', detail: l.qty !== 1 ? `x${l.qty}` : '', price: Math.round(l.qty * l.rate * 1000) / 1000 }))
          if (!items.length) throw new Error('Add at least one item with a rate.')
          const deposit = noDeposit ? 0 : Math.round(t.total * DEPOSIT_RATE * 1000) / 1000
          // The database rejects a booking without a valid email, so only send the contact fields that are filled in.
          const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(doc.clientEmail.trim())
          const fields: Partial<BookingRow> = {
            ...(clip(doc.clientName, 100) ? { name: clip(doc.clientName, 100) } : {}),
            ...(emailOk ? { email: clip(doc.clientEmail, 254) } : {}),
            ...(clip(doc.clientPhone, 40) ? { phone: clip(doc.clientPhone, 40) } : {}),
            event_type: clip(doc.eventTitle, 80), venue: clip(doc.eventVenue, 300), area: clip(doc.area, 80),
            ...(doc.eventDate ? { event_date: doc.eventDate } : {}),
            items, subtotal: t.subtotal - t.location, location_charge: t.location, total: t.total, deposit, balance: Math.round((t.total - deposit) * 1000) / 1000, has_quote_only: false,
          }
          if (bookingId) {
            await updateRow('bookings', bookingId, fields)
            setBookingMsg(`Reservation updated${noDeposit ? ' with no deposit required' : ''}.`)
          } else {
            if (!doc.eventDate) throw new Error('Add the event date above, then press Save again to create the reservation.')
            if (!clip(doc.clientName, 100)) throw new Error('Add the client name above, then press Save again to create the reservation.')
            const created = await addRow('bookings', {
              status: noDeposit ? 'confirmed' : 'new', start_time: '', duration: '', guests: '', notes: '', deposit_paid: false, payment_status: 'pending', amount_paid: 0,
              admin_notes: `Created from ${doc.number}.`,
              ...fields,
              // Bookings must have an email: walk-in clients without one get a placeholder that no mail is delivered to.
              email: emailOk ? clip(doc.clientEmail, 254) : 'no-email@walk-in.invalid',
            })
            linkedId = created.id
            setBookingId(created.id)
            setBookingMsg(`Reservation created${noDeposit ? ' without a deposit and marked Confirmed' : ''}${emailOk ? '' : ' (no client email, so no confirmation email is sent)'}. Find it in Bookings.`)
          }
        } catch (e) {
          // The document itself is already saved; say exactly why the reservation was not.
          setBookingMsg(`The document is saved, but the reservation was not: ${e instanceof Error ? e.message : 'unknown error'}`)
          return
        }
      }
      // The booking follows the payment on this document.
      if (linkedId && !isQuotation) {
        const b = (await listRows('bookings')).find((x) => x.id === linkedId)
        if (b) {
          const base = b.total > 0 ? b.total : total
          const patch = paymentPatch(paid, base, b.status)
          await updateRow('bookings', b.id, patch)
          const statusNote = patch.status && patch.status !== b.status ? ' and the booking is now Confirmed' : ''
          setBookingMsg(`Booking updated: ${PAYMENT_LABEL[patch.payment_status ?? 'pending']}${statusNote}.`)
        }
      }
    } catch (e) {
      setSaved('error')
      setSaveError(e instanceof Error && e.message ? e.message : 'The dashboard did not accept this document.')
    }
  }
  const print = () => {
    bumpCounter(doc.kind)
    window.print()
  }

  return (
    <main className="inv">
      <div className="inv__editor">
        <div className="inv__top">
          <Link to={getSession() ? '/admin' : '/'} className="inv__back"><ArrowLeft size={14} weight="bold" aria-hidden="true" /> {getSession() ? 'Back to dashboard' : 'Back to site'}</Link>
          <h1>Invoice, receipt and quotation</h1>
          <p>Drafts stay in this browser only.</p>
        </div>

        <div className="inv__tabs" role="tablist" aria-label="Document type">
          {(['invoice', 'receipt', 'quotation'] as const).map((k) => (
            <button key={k} role="tab" aria-selected={doc.kind === k} className={doc.kind === k ? 'is-on' : ''} onClick={() => switchKind(k)}>
              {k === 'invoice' ? 'Invoice' : k === 'receipt' ? 'Receipt' : 'Quotation'}
            </button>
          ))}
        </div>

        <fieldset>
          <legend>Document</legend>
          <div className="inv__grid">
            <label>Number<input value={doc.number} onChange={(e) => set('number', e.target.value)} /></label>
            <label>Currency
              <select value={doc.currency} onChange={(e) => set('currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Issued<input type="date" value={doc.issued} onChange={(e) => set('issued', e.target.value)} /></label>
            {isReceipt ? (
              <label>Payment date<input type="date" value={doc.paidOn} onChange={(e) => set('paidOn', e.target.value)} /></label>
            ) : isQuotation ? (
              <label>Valid until<input type="date" value={doc.validUntil ?? ''} onChange={(e) => set('validUntil', e.target.value)} /></label>
            ) : (
              <label>Due date<input type="date" value={doc.due} onChange={(e) => set('due', e.target.value)} /></label>
            )}
            {isReceipt && (
              <label>Paid by
                <select value={doc.method} onChange={(e) => set('method', e.target.value)}>
                  {METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </label>
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend>Client</legend>
          <div className="inv__grid">
            <label>Name<input value={doc.clientName} onChange={(e) => set('clientName', e.target.value)} /></label>
            <label>Phone<input value={doc.clientPhone} onChange={(e) => set('clientPhone', e.target.value)} /></label>
            <label className="inv__full">Email<input type="email" value={doc.clientEmail} onChange={(e) => set('clientEmail', e.target.value)} /></label>
            <label className="inv__full">Address<input value={doc.clientAddress} onChange={(e) => set('clientAddress', e.target.value)} /></label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Event</legend>
          <div className="inv__grid">
            <label>Event<input placeholder="e.g. Maria's 18th birthday" value={doc.eventTitle} onChange={(e) => set('eventTitle', e.target.value)} /></label>
            <label>Event date<input type="date" value={doc.eventDate} onChange={(e) => set('eventDate', e.target.value)} /></label>
            <label className="inv__full">Venue<input value={doc.eventVenue} onChange={(e) => set('eventVenue', e.target.value)} /></label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Items</legend>
          <datalist id="inv-services">{ALL_OPTIONS.map((o) => <option key={o.id} value={label(o)} />)}</datalist>
          {doc.lines.map((l) => (
            <div className="inv__line" key={l.id}>
              <input list="inv-services" aria-label="Description" placeholder="Description" value={l.desc} onChange={(e) => {
                const hit = ALL_OPTIONS.find((o) => label(o) === e.target.value)
                setLine(l.id, hit && hit.price !== null ? { desc: e.target.value, rate: hit.price } : { desc: e.target.value })
              }} />
              <input aria-label="Quantity" type="number" min={0} step="any" value={l.qty} onChange={(e) => setLine(l.id, { qty: num(e.target.value) })} />
              <input aria-label="Rate" type="number" min={0} step="any" value={l.rate || ''} placeholder="Rate" onChange={(e) => setLine(l.id, { rate: num(e.target.value) })} />
              <button type="button" aria-label="Remove item" onClick={() => removeLine(l.id)}><Trash size={16} /></button>
            </div>
          ))}
          <button type="button" className="inv__add" onClick={addLine}><Plus size={14} weight="bold" aria-hidden="true" /> Add item</button>
          <label>Location (adds the area charge)
            <select value={doc.area} onChange={(e) => set('area', e.target.value)}>
              <option value="">No location charge</option>
              {[...AREAS].sort((a, b) => a.name.localeCompare(b.name)).map((a) => <option key={a.name}>{a.name}</option>)}
            </select>
          </label>
          <div className="inv__grid">
            <label>Discount ({doc.currency})<input type="number" min={0} step="any" value={doc.discount || ''} onChange={(e) => set('discount', num(e.target.value))} /></label>
            <label>Tax (%)<input type="number" min={0} step="any" value={doc.taxPct || ''} onChange={(e) => set('taxPct', num(e.target.value))} /></label>
            {!isQuotation && (
            <label>{isReceipt ? `Amount received (${doc.currency}, blank = full)` : `Deposit paid (${doc.currency})`}
              <input type="number" min={0} step="any" value={doc.deposit || ''} onChange={(e) => set('deposit', num(e.target.value))} />
              {!isReceipt && <button type="button" className="inv__add" onClick={() => set('deposit', Math.round(total * DEPOSIT_RATE * 1000) / 1000)}>Set 30% deposit</button>}
            </label>
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend>Studio and notes</legend>
          <div className="inv__grid">
            <label>Studio phone<input value={doc.studioPhone} onChange={(e) => set('studioPhone', e.target.value)} /></label>
            <label>Studio address<input value={doc.studioAddress} onChange={(e) => set('studioAddress', e.target.value)} /></label>
            {!isReceipt && <label className="inv__full">Payment details (bank, GCash...)<input value={doc.payTo} onChange={(e) => set('payTo', e.target.value)} /></label>}
            <label className="inv__full">Notes<textarea rows={3} value={doc.notes} onChange={(e) => set('notes', e.target.value)} /></label>
          </div>
        </fieldset>

        <div className="inv__actions">
          <button type="button" className="inv__print" onClick={print}><Printer size={16} weight="fill" aria-hidden="true" /> Print / Save as PDF</button>
          {getSession() && (
            <button type="button" className="inv__ghost" onClick={saveToDashboard} disabled={saved === 'saving'}>
              {saved === 'saving' ? 'Saving' : saved === 'saved' ? 'Saved' : saved === 'error' ? 'Retry save' : 'Save to dashboard'}
            </button>
          )}
          {saveError && <p className="inv__hint inv__err" role="alert">Could not save: {saveError}</p>}
          <button type="button" className="inv__ghost" onClick={() => { setShare(null); setSaved('idle'); setBookingId(null); setBookingMsg(''); newDoc() }}>New blank</button>
        </div>

        {getSession() && (
          <label className="inv__override">
            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
            <span>
              <b>{bookingId ? 'Update the reservation from this document' : 'Create a reservation from this document'}</b>
              <small>{bookingId ? 'Overrides the booking\'s items, total, deposit, date and venue with what is on this page.' : 'Makes a new booking with these items, client and event date. Needs the event date.'}</small>
            </span>
          </label>
        )}
        {getSession() && override && (
          <label className="inv__override">
            <input type="checkbox" checked={noDeposit} onChange={(e) => setNoDeposit(e.target.checked)} />
            <span>
              <b>Reserve without a deposit</b>
              <small>No 30% deposit is asked for. A new reservation is marked Confirmed and the full amount stays as the balance.</small>
            </span>
          </label>
        )}

        {getSession() && (
          <div className="inv__sendbox">
            <b>Send a digital copy</b>
            {!share ? (
              <>
                <p className="inv__hint">Press Save to dashboard first. That creates a private link to this {kindName} that you can send by email or WhatsApp.</p>
              </>
            ) : (
              <>
                <input className="inv__linkbox" readOnly value={docLink(share.token)} onFocus={(e) => e.currentTarget.select()} aria-label="Private link" />
                <div className="inv__sendrow">
                  <a className="inv__sendbtn" href={emailHref(doc.clientEmail, doc, docLink(share.token))} aria-disabled={!doc.clientEmail}>Email</a>
                  <a className="inv__sendbtn inv__sendbtn--wa" href={whatsappHref(doc.clientPhone, doc, docLink(share.token))} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                  <button type="button" className="inv__sendbtn" onClick={() => { void navigator.clipboard?.writeText(shareText(doc, docLink(share.token)).body).then(() => setCopied(true)); setTimeout(() => setCopied(false), 2000) }}>{copied ? 'Copied' : 'Copy message'}</button>
                </div>
                {bookingMsg && <p className="inv__hint"><b>{bookingMsg}</b></p>}
                <p className="inv__hint">
                  {!doc.clientEmail && 'Add the client email above to address the email. '}
                  {!doc.clientPhone && 'Add the client phone above to open WhatsApp on their number. '}
                  Edited something? Press Save to dashboard again and the same link shows the latest version.
                  {!backendOn && ' Demo mode: this link only opens in this browser until the database is connected.'}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="inv__stage">
        <InvoicePaper doc={doc} />
      </div>
    </main>
  )
}
