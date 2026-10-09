import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, WarningCircle, CalendarCheck, MapPin, Clock } from '@/components/slab'
import { money, CURRENCY } from '@/data/catalog'
import { formatDate, formatTime } from '@/lib/booking'
import { getMyBooking, requestBookingChange, type MyBooking } from '@/lib/db'
import { PAYMENT_LABEL } from '@/lib/payments'
import DatePicker from '@/components/DatePicker'

/**
 * MyBooking - the customer's own page at /my-booking?code=…
 * They see the status of one booking and can ask to move the date or cancel.
 * Those are requests: the studio checks the calendar and approves or declines
 * them in the dashboard, and the answer shows up here.
 */

export const MY_BOOKING_KEY = 'jd-my-booking'
const STATUS_TEXT: Record<string, string> = {
  new: 'Received. We are checking your date on our calendar.',
  confirmed: 'Confirmed. Your date is booked.',
  completed: 'Completed. Thank you for choosing us.',
  cancelled: 'Cancelled.',
}
const today = () => new Date().toLocaleDateString('en-CA')

export default function MyBookingPage() {
  const [params, setParams] = useSearchParams()
  const fromUrl = params.get('code') ?? ''
  const [code, setCode] = useState(() => {
    if (fromUrl) return fromUrl
    try { return localStorage.getItem(MY_BOOKING_KEY) ?? '' } catch { return '' }
  })
  const [typed, setTyped] = useState('')
  const [b, setB] = useState<MyBooking | null | 'loading'>(code ? 'loading' : null)
  const [mode, setMode] = useState<'none' | 'move' | 'cancel'>('none')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = async (c: string) => {
    setB('loading')
    const r = await getMyBooking(c)
    setB(r)
    if (r) { try { localStorage.setItem(MY_BOOKING_KEY, c) } catch { /* storage unavailable */ } }
  }
  useEffect(() => { if (code) void load(code) }, [code])

  const open = (e: FormEvent) => {
    e.preventDefault()
    const c = typed.trim().split('code=').pop() ?? ''
    if (c) { setCode(c); setParams({ code: c }, { replace: true }) }
  }

  const send = async (type: 'reschedule' | 'cancel') => {
    if (type === 'reschedule' && !date) return setMsg({ ok: false, text: 'Choose the new date you would like.' })
    setBusy(true)
    setMsg(null)
    try {
      await requestBookingChange(code, { type, date, time, note })
      setMsg({ ok: true, text: type === 'cancel' ? 'Cancellation request sent. We will confirm shortly.' : 'Date change request sent. We will check our calendar and confirm shortly.' })
      setMode('none')
      setNote('')
      await load(code)
    } catch (x) {
      setMsg({ ok: false, text: x instanceof Error ? x.message : 'That did not go through. Please contact us.' })
    } finally {
      setBusy(false)
    }
  }

  const editable = b && b !== 'loading' && (b.status === 'new' || b.status === 'confirmed') && b.event_date >= today()
  const cr = b && b !== 'loading' ? b.change_request : null

  return (
    <section className="pgrid cgrid bgrid mybk" aria-labelledby="mybk-title">
      <div className="home__glass bgrid__glass">
        <h1 className="pgrid__title" id="mybk-title">Your booking</h1>

        {b === null && (
          <form className="mybk__find" onSubmit={open} noValidate>
            <p className="bgrid__help">{code ? 'We could not find that booking. Check your link or code and try again.' : 'Paste the booking link or code we gave you after you booked.'}</p>
            <label className="cgrid__field"><span className="cgrid__label">Booking code or link</span><input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" /></label>
            <button type="submit" className="cgrid__submit" disabled={!typed.trim()}><span className="cgrid__submit-label">Find my booking</span></button>
            <p className="cgrid__hint">Lost it? <Link to="/contact">Contact us</Link> and we will resend it.</p>
          </form>
        )}

        {b === 'loading' && <p className="bgrid__help" role="status">Loading your booking.</p>}

        {b && b !== 'loading' && (
          <>
            <p className={`mybk__status mybk__status--${b.status}`} role="status">
              <CheckCircle size={20} weight="fill" aria-hidden="true" /> {STATUS_TEXT[b.status] ?? b.status}
            </p>

            {cr && (
              <p className={`mybk__notice mybk__notice--${cr.status}`} role="status">
                {cr.status === 'pending' && (cr.type === 'cancel' ? 'Your cancellation request is waiting for our reply.' : `Your request to move to ${cr.date ? formatDate(cr.date) : 'a new date'}${cr.time ? ` at ${formatTime(cr.time)}` : ''} is waiting for our reply.`)}
                {cr.status === 'approved' && (cr.type === 'cancel' ? 'Your cancellation was approved.' : 'Your date change was approved. The details above are up to date.')}
                {cr.status === 'declined' && 'We could not accept your last request. Please contact us to arrange it.'}
              </p>
            )}

            <dl className="mybk__facts">
              <div><dt><CalendarCheck size={16} aria-hidden="true" /> Date</dt><dd>{formatDate(b.event_date)}</dd></div>
              <div><dt><Clock size={16} aria-hidden="true" /> Time</dt><dd>{formatTime(b.start_time)} · {b.duration}</dd></div>
              <div><dt><MapPin size={16} aria-hidden="true" /> Place</dt><dd>{b.venue || b.area}</dd></div>
              <div><dt>Event</dt><dd>{b.event_type || 'Event'} for {b.name}</dd></div>
            </dl>

            <ul className="mybk__items" role="list">
              {b.items.map((o) => <li key={o.id}><span>{o.name}</span><b>{o.price === null ? 'Quote' : money(o.price)}</b></li>)}
            </ul>
            <dl className="mybk__facts mybk__facts--money">
              <div><dt>Total</dt><dd>{money(b.total)}</dd></div>
              <div><dt>Paid</dt><dd>{money(b.amount_paid)} · {PAYMENT_LABEL[b.payment_status]}</dd></div>
              <div><dt>30% deposit</dt><dd>{money(b.deposit)}</dd></div>
              <div><dt>Balance at the venue</dt><dd>{money(b.balance)}</dd></div>
            </dl>
            <p className="bgrid__help">All prices in {CURRENCY}.</p>

            {msg && <p className={`mybk__msg${msg.ok ? '' : ' is-bad'}`} role={msg.ok ? 'status' : 'alert'}>{!msg.ok && <WarningCircle size={16} weight="fill" aria-hidden="true" />} {msg.text}</p>}

            {editable && cr?.status !== 'pending' && mode === 'none' && (
              <div className="mybk__actions">
                <button type="button" className="cgrid__submit" onClick={() => { setMode('move'); setMsg(null) }}><span className="cgrid__submit-label">Change the date</span></button>
                <button type="button" className="cgrid__again" onClick={() => { setMode('cancel'); setMsg(null) }}>Cancel booking</button>
              </div>
            )}
            {editable && cr?.status === 'pending' && <p className="bgrid__help">You can ask for another change once we reply.</p>}
            {!editable && b.status !== 'cancelled' && b.status !== 'completed' && <p className="bgrid__help">This booking can no longer be changed online. <Link to="/contact">Contact us</Link>.</p>}

            {mode === 'move' && (
              <form className="mybk__form" onSubmit={(e) => { e.preventDefault(); void send('reschedule') }} noValidate>
                <h2>New date</h2>
                <div className="cgrid__field"><span className="cgrid__label">Date</span><DatePicker name="newdate" min={today()} value={date} onChange={setDate} booked={[]} required /></div>
                <label className="cgrid__field"><span className="cgrid__label">Start time (optional)</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
                <label className="cgrid__field"><span className="cgrid__label">Note (optional)</span><textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></label>
                <p className="bgrid__help">We check this date on our calendar before it is confirmed.</p>
                <div className="mybk__actions">
                  <button type="submit" className="cgrid__submit" disabled={busy}><span className="cgrid__submit-label">{busy ? 'Sending' : 'Send request'}</span></button>
                  <button type="button" className="cgrid__again" onClick={() => setMode('none')}>Back</button>
                </div>
              </form>
            )}

            {mode === 'cancel' && (
              <form className="mybk__form" onSubmit={(e) => { e.preventDefault(); void send('cancel') }} noValidate>
                <h2>Cancel this booking?</h2>
                <label className="cgrid__field"><span className="cgrid__label">Reason (optional)</span><textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></label>
                <p className="bgrid__help">The deposit follows our booking terms. We will reply to confirm the cancellation.</p>
                <div className="mybk__actions">
                  <button type="submit" className="cgrid__submit mybk__danger" disabled={busy}><span className="cgrid__submit-label">{busy ? 'Sending' : 'Request cancellation'}</span></button>
                  <button type="button" className="cgrid__again" onClick={() => setMode('none')}>Keep my booking</button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  )
}
