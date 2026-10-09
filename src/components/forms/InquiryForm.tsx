import { useRef, useState, type ReactNode } from 'react'
import { submitPublic } from '@/lib/db'
import { sanitize, validateContact } from '@/lib/contact'
import type { InquiryKind } from '@/types/vehicle'

type Props = {
  kind?: InquiryKind
  vehicleId?: string
  heading?: string
  /** Extra fields, rendered above the message box. */
  children?: ReactNode
  /** Kind-specific data stored with the inquiry (date, asking price...). */
  details?: Record<string, unknown>
  submitLabel?: string
  messageRequired?: boolean
}

export default function InquiryForm({ kind = 'inquiry', vehicleId, heading, children, details = {}, submitLabel = 'Send', messageRequired = false }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')
  const busy = useRef(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy.current) return
    const bad = validateContact({ name, phone, email }) || (messageRequired && !message.trim() ? 'Please add a short message.' : null)
    if (bad) return setError(bad)
    busy.current = true
    setError('')
    setState('sending')
    try {
      await submitPublic('inquiries', {
        kind,
        vehicle_id: vehicleId ?? null,
        name: sanitize(name.trim()).slice(0, 100),
        phone: sanitize(phone.trim()).slice(0, 40),
        email: sanitize(email.trim()).slice(0, 254),
        message: sanitize(message.trim(), true).slice(0, 3000),
        details,
        status: 'new',
      })
      setState('sent')
    } catch {
      setError('We could not send that. Please call or message us directly.')
      setState('idle')
      busy.current = false
    }
  }

  if (state === 'sent') return <p className="mform__ok" role="status">Thank you. Migs Auto will contact you soon.</p>

  return (
    <form className="mform" onSubmit={onSubmit} noValidate>
      {heading && <h2 className="mform__title">{heading}</h2>}
      <label>Name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} /></label>
      <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" maxLength={40} /></label>
      <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" maxLength={254} /></label>
      {children}
      <label>Message<textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3000} /></label>
      {error && <p className="mform__err" role="alert">{error}</p>}
      <button type="submit" className="mbtn" disabled={state === 'sending'}>{state === 'sending' ? 'Sending...' : submitLabel}</button>
    </form>
  )
}
