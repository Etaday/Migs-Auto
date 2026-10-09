import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, WarningCircle } from '@/components/slab'
import { useData } from '@/components/admin/data'
import { longDate, todayIso } from '@/components/admin/ui'

/**
 * AddEventDrawer - the owner puts an event straight on the calendar and in
 * Bookings, without a customer request. Meant for events the studio sponsors,
 * but it also works for any walk-in or personal booking. It overrides
 * availability: a date that is already taken only shows a warning.
 */

const WALKIN_EMAIL = 'no-email@walk-in.invalid'

export default function AddEventDrawer({ date, onClose, onCreated }: { date?: string; onClose: () => void; onCreated?: (id: string) => void }) {
  const { data, add } = useData()
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(date || todayIso())
  const [time, setTime] = useState('')
  const [venue, setVenue] = useState('')
  const [area, setArea] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [sponsored, setSponsored] = useState(true)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const clash = data.bookings.filter((b) => b.event_date === day && b.status !== 'cancelled')

  const save = async () => {
    setErr('')
    if (!name.trim()) return setErr('Add who or what the event is for.')
    if (!day) return setErr('Choose the event date.')
    setBusy(true)
    try {
      const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
      await add('bookings', {
        status: 'confirmed',
        name: name.trim().slice(0, 100),
        email: emailOk ? email.trim().slice(0, 254) : WALKIN_EMAIL,
        phone: phone.trim().slice(0, 40),
        event_type: (title.trim() || (sponsored ? 'Sponsored event' : 'Event')).slice(0, 80),
        event_date: day,
        start_time: time,
        duration: '', guests: '', notes: '',
        venue: venue.trim().slice(0, 300),
        area: area.trim().slice(0, 80),
        items: [], subtotal: 0, location_charge: 0, total: 0, deposit: 0, balance: 0, has_quote_only: false,
        amount_paid: 0, deposit_paid: sponsored, payment_status: sponsored ? 'fully_paid' : 'pending',
        sponsored, sponsored_value: 0,
        admin_notes: [sponsored ? 'Sponsored by Judeng Production Studio.' : 'Added by the studio.', notes.trim()].filter(Boolean).join(' '),
      })
      onCreated?.(day)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That did not save.')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="adm-overlay" role="dialog" aria-modal="true" aria-label="Add an event" onClick={onClose}>
      <aside className="adm-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="adm-drawer__head">
          <div>
            <h2>Add an event</h2>
            <p>Put it on the calendar and in Bookings, even if the date is taken.</p>
          </div>
          <button type="button" className="adm-icon-btn" onClick={onClose} aria-label="Close"><X size={18} weight="bold" /></button>
        </header>
        <div className="adm-drawer__body">
          <label className="adm-check">
            <input type="checkbox" checked={sponsored} onChange={(e) => setSponsored(e.target.checked)} />
            <span><b>Sponsored by Judeng Production Studio</b> (nothing is charged; add the studio's cost from the booking afterwards)</span>
          </label>
          <label className="adm-field"><span>Event for (name of the host, group or cause)</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Barangay fiesta, community charity night" autoFocus /></label>
          <label className="adm-field"><span>Event type (optional)</span><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={sponsored ? 'Sponsored event' : 'Event'} /></label>
          <div className="adm-row">
            <label className="adm-field"><span>Date</span><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></label>
            <label className="adm-field"><span>Start time (optional)</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          </div>
          {clash.length > 0 && (
            <p className="adm-note adm-note--warn" role="status"><WarningCircle size={15} weight="fill" aria-hidden="true" /> {longDate(day)} already has {clash.length === 1 ? 'a booking' : `${clash.length} bookings`} ({clash.map((b) => b.name).join(', ')}). You can still add this event; it will show as a clash on the calendar.</p>
          )}
          <div className="adm-row">
            <label className="adm-field"><span>Area (optional)</span><input value={area} onChange={(e) => setArea(e.target.value)} maxLength={80} /></label>
            <label className="adm-field"><span>Venue (optional)</span><input value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={300} /></label>
          </div>
          <div className="adm-row">
            <label className="adm-field"><span>Phone (optional)</span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} /></label>
            <label className="adm-field"><span>Email (optional)</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} /></label>
          </div>
          <p className="adm-note">Without an email, no confirmation email is sent.</p>
          <label className="adm-field"><span>Notes for the team (optional)</span><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} /></label>
          {err && <p className="adm-error" role="alert">{err}</p>}
        </div>
        <footer className="adm-drawer__foot">
          <button type="button" className="adm-btn" disabled={busy} onClick={() => void save()}>{busy ? 'Saving' : 'Add to calendar'}</button>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Cancel</button>
        </footer>
      </aside>
    </div>,
    document.querySelector('.adm') ?? document.body,
  )
}
