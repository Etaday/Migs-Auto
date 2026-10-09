import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PaperPlaneTilt, CheckCircle, WarningCircle } from '@/components/slab'
import { SERVICES, AREAS } from '@/data/catalog'
import { EVENT_TYPES } from '@/lib/booking'
import { SubmitError } from '@/lib/contact'
import { readQuote, submitQuote } from '@/lib/quote'
import { goToField } from '@/lib/formFocus'

/**
 * QuoteRequest - /quote. For services with no fixed price (coverage, food
 * photography, anything custom). The request lands in the dashboard's Quotes
 * tab; the studio replies with a price, and an accepted quote becomes a booking.
 */

const QUOTED = SERVICES.filter((s) => !s.addon && s.options.every((o) => o.price === null))
type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'error'; note: string } | { kind: 'sent' }

export default function QuoteRequest() {
  const [params] = useSearchParams()
  const pre = QUOTED.find((s) => s.id === params.get('service'))?.name ?? ''
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [shake, setShake] = useState(0)
  const busy = status.kind === 'sending'

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const parsed = readQuote(new FormData(form))
    if ('error' in parsed) {
      setStatus({ kind: 'error', note: parsed.error })
      setShake((n) => n + 1)
      goToField(form, parsed.field)
      return
    }
    if (parsed.quote.website) return
    setStatus({ kind: 'sending' })
    try {
      await submitQuote(parsed.quote)
      setStatus({ kind: 'sent' })
    } catch (err) {
      setStatus({ kind: 'error', note: err instanceof SubmitError ? err.message : 'That did not go through. Please contact us directly.' })
      setShake((n) => n + 1)
    }
  }

  if (status.kind === 'sent') {
    return (
      <section className="pgrid cgrid bgrid" aria-labelledby="quote-title">
        <div className="home__glass bgrid__glass bgrid__glass--done">
          <div className="cgrid__done" role="status">
            <span className="cgrid__done-mark" aria-hidden="true"><CheckCircle size={30} weight="fill" /></span>
            <h1 className="cgrid__done-title" id="quote-title">Quote request received.</h1>
            <p className="cgrid__done-body">We will review what you need and send your quotation by email. When you are happy with it, we turn it into a booking.</p>
            <button type="button" className="cgrid__again" onClick={() => setStatus({ kind: 'idle' })}>Request another quote</button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="pgrid cgrid bgrid" aria-labelledby="quote-title">
      <header className="pgrid__head">
        <span className="pgrid__eyebrow">Quotation</span>
        <h1 className="pgrid__title" id="quote-title">Request a quote.</h1>
        <p className="pgrid__lede">For photo and video coverage, food photography and anything custom. Tell us what you need and we send a personal price. Looking for a booth or prints? <Link to="/book">Book online</Link>.</p>
      </header>
      <div className="home__glass bgrid__glass">
        <form className={`bgrid__form${busy ? ' is-sending' : ''}`} onSubmit={onSubmit} noValidate>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="cgrid__trap" />
          <fieldset className="bgrid__set">
            <legend className="cgrid__label">1. What do you need?</legend>
            <div className="bgrid__grid">
              <label className="cgrid__field">
                <span className="cgrid__label">Service</span>
                <select name="service" defaultValue={pre} required>
                  <option value="">Select</option>
                  {QUOTED.map((s) => <option key={s.id}>{s.name}</option>)}
                  <option>Something else</option>
                </select>
              </label>
              <label className="cgrid__field">
                <span className="cgrid__label">Event type (optional)</span>
                <select name="eventType" defaultValue="">
                  <option value="">Select</option>
                  {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="cgrid__field">
                <span className="cgrid__label">Date, if you know it (optional)</span>
                <input type="date" name="date" min={new Date().toLocaleDateString('en-CA')} />
              </label>
              <label className="cgrid__field">
                <span className="cgrid__label">Area (optional)</span>
                <select name="area" defaultValue="">
                  <option value="">Select</option>
                  {AREAS.map((a) => <option key={a.name}>{a.name}</option>)}
                </select>
              </label>
            </div>
            <label className="cgrid__field">
              <span className="cgrid__label">Tell us about it</span>
              <textarea name="details" rows={5} maxLength={3000} placeholder="What do you need, how many hours, how many photos or videos, where and when..." />
            </label>
          </fieldset>

          <fieldset className="bgrid__set">
            <legend className="cgrid__label">2. How do we reach you?</legend>
            <div className="bgrid__grid">
              <label className="cgrid__field"><span className="cgrid__label">Name</span><input type="text" name="name" autoComplete="name" maxLength={100} placeholder="Your name" /></label>
              <label className="cgrid__field"><span className="cgrid__label">Email</span><input type="email" name="email" autoComplete="email" maxLength={254} placeholder="you@example.com" /></label>
              <label className="cgrid__field"><span className="cgrid__label">Phone (optional)</span><input type="tel" name="phone" autoComplete="tel" maxLength={40} placeholder="Mobile number" /></label>
            </div>
          </fieldset>

          <div className="cgrid__actions">
            <button key={shake} type="submit" className={`cgrid__submit${busy ? ' is-sending' : ''}${status.kind === 'error' ? ' is-shaking' : ''}`} disabled={busy}>
              <span className="cgrid__submit-plane" aria-hidden="true"><PaperPlaneTilt size={17} weight="fill" /></span>
              <span className="cgrid__submit-label">{busy ? 'Sending' : 'Send quote request'}</span>
            </button>
            {status.kind === 'error' ? (
              <span className="cgrid__status" role="alert"><WarningCircle size={16} weight="fill" aria-hidden="true" />{status.note}</span>
            ) : (
              <span className="cgrid__hint">Free and no obligation. We reply with a personal price.</span>
            )}
          </div>
        </form>
      </div>
    </section>
  )
}
