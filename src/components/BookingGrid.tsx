import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PaperPlaneTilt, CheckCircle, WarningCircle, CalendarCheck, MapPin, Clock, Wallet } from '@/components/slab'
import { SERVICES, AREAS, POLICY, PAYMENT_METHODS, quote, serviceOf, money, stylesOf, isStudioOnly, STUDIO } from '@/data/catalog'
import { profile } from '@/data/profile'
import { EVENT_TYPES, DURATIONS, readBooking, submitBooking, formatDate, formatTime } from '@/lib/booking'
import { SubmitError } from '@/lib/contact'
import { bookedDates } from '@/lib/db'
import DatePicker from '@/components/DatePicker'
import { goToField } from '@/lib/formFocus'

/**
 * BookingGrid - the booking form at /book.
 *
 * Follows the studio's booking process: service, date, time, duration,
 * availability, details, a calculated price (total, 30% deposit, 70% balance),
 * the terms, then submit. All prices come from src/data/catalog.ts.
 * ?service=<id> highlights a service.
 *
 * Availability: the official calendar is Google Calendar, and the team checks
 * it before confirming. This page does not read the calendar itself.
 */

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'error'; note: string } | { kind: 'sent'; via: 'webhook' | 'mailto'; code: string }

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']
const FLIGHT_MS = 650
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const todayIso = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function BookingGrid() {
  const [params] = useSearchParams()
  const focusId = params.get('service')
  const focusRef = useRef<HTMLFieldSetElement>(null)
  // One option per service: serviceId -> optionId.
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('')
  const [area, setArea] = useState('')
  const [venue, setVenue] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [shake, setShake] = useState(0)
  const min = useMemo(todayIso, [])
  const [booked, setBooked] = useState<string[]>([])
  useEffect(() => {
    void bookedDates().then(setBooked)
  }, [])

  useEffect(() => {
    focusRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusId])

  // The time is kept as 24-hour "HH:MM" for the data, shown and chosen as 12-hour.
  const [h24, mm] = time ? time.split(':') : ['', '00']
  const hour12 = time ? String(Number(h24) % 12 || 12) : ''
  const minute = mm
  const period = time && Number(h24) >= 12 ? 'PM' : 'AM'
  const setClock = (h: string, m: string, p: string) => {
    if (!h) return setTime('')
    const base = Number(h) % 12
    const hh = p === 'PM' ? base + 12 : base
    setTime(`${String(hh).padStart(2, '0')}:${m || '00'}`)
  }

  const ids = Object.values(picked)
  // Studio shots only: a fixed 25-minute session at the studio, so duration, area and venue are set for the client.
  const studio = isStudioOnly(ids)
  const shownDuration = studio ? STUDIO.duration : duration
  const shownArea = studio ? STUDIO.area : area
  const q = quote(ids, shownArea)
  // Services that come in several styles (the booths) pick the style first, then one of the packages.
  const [styleOf, setStyleOf] = useState<Record<string, string>>({})
  // Every service is a collapsible dropdown so the page stays short on a phone; the one linked from elsewhere starts open.
  const [open, setOpen] = useState<Record<string, boolean>>(() => (focusId ? { [focusId]: true } : {}))
  const chooseStyle = (svcId: string, style: string) => {
    setStyleOf((m) => ({ ...m, [svcId]: style }))
    const svc = SERVICES.find((x) => x.id === svcId)
    const cur = svc?.options.find((o) => o.id === picked[svcId])
    if (!svc || !cur) return
    // Keep the same package when the style changes.
    const idx = svc.options.filter((o) => o.group === cur.group).findIndex((o) => o.id === cur.id)
    const next = svc.options.filter((o) => o.group === style)[idx]
    if (next) setPicked((p) => ({ ...p, [svcId]: next.id }))
  }
  const pick = (serviceId: string, optionId: string) =>
    setPicked((p) => {
      const next = { ...p }
      if (next[serviceId] === optionId) delete next[serviceId]
      else next[serviceId] = optionId
      return next
    })

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const parsed = readBooking(new FormData(e.currentTarget))
    if ('error' in parsed) {
      setStatus({ kind: 'error', note: parsed.error })
      setShake((n) => n + 1)
      goToField(e.currentTarget, parsed.field)
      return
    }
    if (parsed.booking.website) return
    setStatus({ kind: 'sending' })
    try {
      const [result] = await Promise.all([submitBooking(parsed.booking), wait(FLIGHT_MS)])
      try { localStorage.setItem('jd-my-booking', result.code) } catch { /* storage unavailable */ }
      setStatus({ kind: 'sent', via: result.via, code: result.code })
    } catch (err) {
      setStatus({
        kind: 'error',
        note: err instanceof SubmitError ? err.message : `That did not go through. Email ${profile.email} instead.`,
      })
      setShake((n) => n + 1)
    }
  }

  const busy = status.kind === 'sending'

  if (status.kind === 'sent') {
    return (
      <section className="pgrid cgrid bgrid" aria-labelledby="book-title">
        <div className="home__glass bgrid__glass bgrid__glass--done">
          <div className="cgrid__done" role="status">
            <span className="cgrid__done-mark" aria-hidden="true">
              <CheckCircle size={30} weight="fill" />
            </span>
            <h1 className="cgrid__done-title" id="book-title">
              {status.via === 'webhook' ? 'Booking request received.' : 'Your mail app has it.'}
            </h1>
            <p className="cgrid__done-body">
              {status.via === 'webhook'
                ? 'We will check your date on our calendar and send your booking confirmation. Your date is held once the 30% deposit is paid.'
                : 'Your request is written out and addressed. Press send in your mail app. We will check your date on our calendar and send your booking confirmation.'}
            </p>
            <p className="cgrid__done-body">
              <Link to={`/my-booking?code=${status.code}`}>Check, change or cancel your booking</Link>. Keep this link: it is private to you.
            </p>
            <button type="button" className="cgrid__again" onClick={() => setStatus({ kind: 'idle' })}>
              Make another booking
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="pgrid cgrid bgrid" aria-labelledby="book-title">
      <header className="pgrid__head">
        <span className="pgrid__eyebrow">Book now</span>
        <h1 className="pgrid__title" id="book-title">
          Book your date.
        </h1>
        <p className="pgrid__lede">
          Choose a service, your date and time, and see the price as you go. A 30% deposit confirms your booking.
        </p>
      </header>

      <div className="home__glass bgrid__glass">
        <form className={`bgrid__form${busy ? ' is-sending' : ''}`} onSubmit={onSubmit} noValidate>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="cgrid__trap" />
          {ids.map((id) => <input key={id} type="hidden" name="items" value={id} />)}

          <fieldset className="bgrid__set">
            <legend className="cgrid__label">1. Select a service</legend>
            <p className="bgrid__help">Tap a service to open it, then choose an option from its list. You can pick one option in each service.</p>
            <div className="bgrid__services">
              {SERVICES.map((s) => {
                const chosen = picked[s.id]
                const styles = stylesOf(s)
                const style = styles.length ? (s.options.find((o) => o.id === chosen)?.group ?? styleOf[s.id] ?? styles[0]) : ''
                const shown = styles.length ? s.options.filter((o) => o.group === style) : s.options
                const Glyph = s.Icon
                const chosenOpt = s.options.find((o) => o.id === chosen)
                const focused = focusId === s.id
                return (
                  <fieldset key={s.id} ref={focused ? focusRef : undefined} className={`bgrid__svc${chosen ? ' is-on' : ''}${focused ? ' is-focus' : ''}`}>
                    <legend>
                      <button type="button" className="bgrid__svc-toggle" aria-expanded={!!open[s.id]} aria-controls={`svc-body-${s.id}`} onClick={() => setOpen((m) => ({ ...m, [s.id]: !m[s.id] }))}>
                        <Glyph size={18} weight="duotone" aria-hidden="true" />
                        <span className="bgrid__svc-text"><span className="bgrid__svc-name">{s.name}</span>{chosenOpt && <span className="bgrid__svc-chosen">{chosenOpt.name}</span>}</span>
                        <span className="bgrid__svc-caret" aria-hidden="true" />
                      </button>
                    </legend>
                    <div className="bgrid__svc-body" id={`svc-body-${s.id}`} hidden={!open[s.id]}>
                      <p className="bgrid__svc-blurb">{s.blurb}</p>
                      {s.options.every((o) => o.price === null) && <p className="bgrid__svc-blurb"><Link to={`/quote?service=${s.id}`}>Request a quote on its own</Link></p>}
                      {styles.length > 0 && (
                        <div className="bgrid__styles" role="radiogroup" aria-label={`${s.name} style`}>
                          {styles.map((g) => (
                            <button key={g} type="button" role="radio" aria-checked={style === g} className={style === g ? 'is-on' : ''} onClick={() => chooseStyle(s.id, g)}>{g}</button>
                          ))}
                        </div>
                      )}
                      <label className="cgrid__field bgrid__pkg">
                        <span className="cgrid__label">{styles.length > 0 ? 'Package' : 'Choose an option'}</span>
                        <select value={chosen && shown.some((o) => o.id === chosen) ? chosen : ''} onChange={(e) => {
                          const id = e.target.value
                          if (id) { if (chosen !== id) pick(s.id, id) } else if (chosen) pick(s.id, chosen)
                        }}>
                          <option value="">{styles.length > 0 ? 'Choose a package' : 'None'}</option>
                          {shown.map((o) => (
                            <option key={o.id} value={o.id}>{o.name}{o.detail ? `, ${o.detail}` : ''}: {o.price === null ? 'Quote' : money(o.price)}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </fieldset>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="bgrid__set">
            <legend className="cgrid__label">2. Date, time and duration</legend>
            <div className="bgrid__grid">
              <div className="cgrid__field">
                <span className="cgrid__label">Event date</span>
                <DatePicker name="date" min={min} value={date} onChange={setDate} booked={booked} required />
              </div>
              <fieldset className="cgrid__field bgrid__time">
                <legend className="cgrid__label">Event time (AM / PM)</legend>
                <input type="hidden" name="startTime" value={time} />
                <div className="bgrid__time-row">
                  <select aria-label="Hour" value={hour12} onChange={(e) => setClock(e.target.value, minute, period)} required>
                    <option value="">Hour</option>
                    {HOURS.map((h) => <option key={h}>{h}</option>)}
                  </select>
                  <span aria-hidden="true">:</span>
                  <select aria-label="Minute" value={minute} disabled={!hour12} onChange={(e) => setClock(hour12, e.target.value, period)}>
                    {MINUTES.map((m) => <option key={m}>{m}</option>)}
                  </select>
                  <select aria-label="AM or PM" value={period} disabled={!hour12} onChange={(e) => setClock(hour12, minute, e.target.value)}>
                    <option>AM</option>
                    <option>PM</option>
                  </select>
                </div>
              </fieldset>
              {studio ? (
                <div className="cgrid__field">
                  <span className="cgrid__label">Duration</span>
                  <input type="hidden" name="duration" value={STUDIO.duration} />
                  <p className="bgrid__fixed">{STUDIO.duration} per session</p>
                </div>
              ) : (
              <label className="cgrid__field">
                <span className="cgrid__label">Duration</span>
                <select name="duration" value={duration} onChange={(e) => setDuration(e.target.value)} required>
                  <option value="">Select</option>
                  {DURATIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              )}
              <label className="cgrid__field">
                <span className="cgrid__label">Event type</span>
                <select name="eventType" defaultValue="">
                  <option value="">Select</option>
                  {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
            </div>
            {date && booked.includes(date) && (
              <p className="bgrid__avail bgrid__avail--warn" role="status"><WarningCircle size={16} weight="fill" aria-hidden="true" /> This date already has a confirmed booking. You can still send a request and we will check if we can fit you in.</p>
            )}
            <p className="bgrid__avail"><CalendarCheck size={16} weight="fill" aria-hidden="true" /> We check availability before your booking is confirmed.</p>
          </fieldset>

          <fieldset className="bgrid__set">
            <legend className="cgrid__label">3. Location</legend>
            {studio ? (
              <div className="bgrid__studioloc">
                <input type="hidden" name="area" value={STUDIO.area} />
                <input type="hidden" name="venue" value={STUDIO.venue} />
                <p className="bgrid__fixed"><MapPin size={16} weight="fill" aria-hidden="true" /><span>Your session is at our studio in <b>Farwaniya, Block 6</b>. There is no location charge.</span></p>
              </div>
            ) : (
            <>
            <div className="bgrid__grid">
              <label className="cgrid__field">
                <span className="cgrid__label">Area</span>
                <select name="area" value={area} onChange={(e) => setArea(e.target.value)} required>
                  <option value="">Select your area</option>
                  {[...AREAS].sort((a, b) => a.name.localeCompare(b.name)).map((a) => <option key={a.name}>{a.name}</option>)}
                </select>
              </label>
              <label className="cgrid__field">
                <span className="cgrid__label">Guests (approx.)</span>
                <input type="number" name="guests" min={1} max={100000} inputMode="numeric" placeholder="e.g. 80" />
              </label>
              <label className="cgrid__field bgrid__full">
                <span className="cgrid__label">Venue address or details</span>
                <input type="text" name="venue" maxLength={200} placeholder="Hall, block, street, building" value={venue} onChange={(e) => setVenue(e.target.value)} required />
              </label>
            </div>
            </>
            )}
          </fieldset>

          <fieldset className="bgrid__set">
            <legend className="cgrid__label">4. Your details</legend>
            <div className="bgrid__grid">
              <label className="cgrid__field">
                <span className="cgrid__label">Full name</span>
                <input type="text" name="name" autoComplete="name" maxLength={80} placeholder="Your name" required />
              </label>
              <label className="cgrid__field">
                <span className="cgrid__label">Phone</span>
                <input type="tel" name="phone" autoComplete="tel" maxLength={40} placeholder="Mobile number" required />
              </label>
              <label className="cgrid__field bgrid__full">
                <span className="cgrid__label">Email</span>
                <input type="email" name="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required />
              </label>
              <label className="cgrid__field bgrid__full">
                <span className="cgrid__label">Anything else? (optional)</span>
                <textarea name="notes" maxLength={3000} rows={3} placeholder="Theme, colors, special requests..." />
              </label>
            </div>
          </fieldset>

          <fieldset className="bgrid__set">
            <legend className="cgrid__label">5. Review and agree</legend>
            <div className="bgrid__terms">
              <p>{POLICY.deposit} {POLICY.balance} {POLICY.location}</p>
              <p>Payment methods: {PAYMENT_METHODS.join(' and ')}. Your date is confirmed only after we check availability on our Google Calendar.</p>
              <label className="bgrid__agree">
                <input type="checkbox" name="agree" />
                <span>I have read and agree to the booking terms.</span>
              </label>
            </div>
          </fieldset>

          <div className="cgrid__actions">
            <button
              key={shake}
              type="submit"
              className={`cgrid__submit${busy ? ' is-sending' : ''}${status.kind === 'error' ? ' is-shaking' : ''}`}
              disabled={busy}
            >
              <span className="cgrid__submit-plane" aria-hidden="true">
                <PaperPlaneTilt size={17} weight="fill" />
              </span>
              <span className="cgrid__submit-label">{busy ? 'Sending' : 'Submit booking request'}</span>
            </button>
            {status.kind === 'error' ? (
              <span className="cgrid__status" role="alert">
                <WarningCircle size={16} weight="fill" aria-hidden="true" />
                {status.note}
              </span>
            ) : (
              <span className="cgrid__hint">
                You receive a booking confirmation after we check availability. <Link to="/contact">Have a question first?</Link> Already booked? <Link to="/my-booking">Check your booking</Link>.
              </span>
            )}
          </div>
        </form>

        <aside className="bgrid__summary" aria-label="Your price" aria-live="polite">
          <span className="cgrid__eyebrow">Your booking</span>
          <ul className="bgrid__sum-lines" role="list">
            {q.items.length === 0 && <li className="is-empty">Select a service to see the price.</li>}
            {q.items.map((o) => (
              <li key={o.id}>
                <span><b>{o.group ?? serviceOf(o.id)?.name}: {o.name}</b>{o.detail && <small>{o.detail}</small>}</span>
                <span>{o.price === null ? 'Quote' : money(o.price)}</span>
              </li>
            ))}
            {q.location > 0 && (
              <li><span><b>Location charge</b><small>{shownArea}</small></span><span>{money(q.location)}</span></li>
            )}
          </ul>

          <dl className="bgrid__totals">
            <div className="is-total"><dt>Total price</dt><dd>{money(q.total)}</dd></div>
            <div><dt>30% deposit</dt><dd>{money(q.deposit)}</dd></div>
            <div><dt>70% remaining balance</dt><dd>{money(q.balance)}</dd></div>
          </dl>
          <p className="bgrid__sum-note">
            <Wallet size={14} weight="fill" aria-hidden="true" /> The remaining 70% is due at the venue on the event date.
            {q.hasQuoteOnly && ' Coverage and food photography are quoted separately and are not in this total.'}
          </p>

          <dl className="bgrid__sum-meta">
            <div>
              <dt><CalendarCheck size={15} weight="fill" aria-hidden="true" /> Date</dt>
              <dd>{date ? formatDate(date) : 'Not chosen'}{time ? `, ${formatTime(time)}` : ''}</dd>
            </div>
            <div>
              <dt><Clock size={15} weight="fill" aria-hidden="true" /> Duration</dt>
              <dd>{shownDuration || 'Not chosen'}</dd>
            </div>
            <div>
              <dt><MapPin size={15} weight="fill" aria-hidden="true" /> Location</dt>
              <dd>{studio ? 'Studio, Farwaniya Block 6' : <>{area || 'Not chosen'}{venue ? `, ${venue}` : ''}</>}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  )
}
