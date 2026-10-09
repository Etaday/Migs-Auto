import { useState } from 'react'
import { useData } from '@/components/admin/data'
import BookingDrawer from '@/components/admin/BookingDrawer'
import { StatusPill, shortDate, formatTime, money, todayIso } from '@/components/admin/ui'

export default function Overview({ go }: { go: (tab: string) => void }) {
  const { data } = useData()
  const [open, setOpen] = useState<string | null>(null)
  const today = todayIso()
  const live = data.bookings.filter((b) => b.status !== 'cancelled')
  const upcoming = live.filter((b) => b.event_date >= today && b.status !== 'completed').sort((a, b) => a.event_date.localeCompare(b.event_date))
  const newCount = data.bookings.filter((b) => b.status === 'new').length
  const depositsDue = upcoming.filter((b) => b.status === 'confirmed' && b.payment_status === 'pending')
  const pendingRev = data.reviews.filter((r) => r.status === 'pending').length
  const unread = data.messages.filter((m) => !m.handled).length
  const booked = live.reduce((s, b) => s + b.total, 0)
  const row = data.bookings.find((b) => b.id === open)

  return (
    <div className="adm-stack">
      <div className="adm-cards">
        <button type="button" className="adm-card" onClick={() => go('bookings')}><b>{newCount}</b><span>New booking requests</span></button>
        <button type="button" className="adm-card" onClick={() => go('calendar')}><b>{upcoming.length}</b><span>Upcoming events</span></button>
        <button type="button" className="adm-card" onClick={() => go('bookings')}><b>{depositsDue.length}</b><span>Deposits to collect</span></button>
        <button type="button" className="adm-card" onClick={() => go('reviews')}><b>{pendingRev}</b><span>Reviews to approve</span></button>
        <button type="button" className="adm-card" onClick={() => go('messages')}><b>{unread}</b><span>Unread messages</span></button>
        <div className="adm-card adm-card--static"><b>{money(booked)}</b><span>Total of active bookings</span></div>
      </div>

      <section className="adm-panel">
        <h2>Next events</h2>
        {upcoming.length === 0 ? (
          <p className="adm-empty">No upcoming events yet. New requests from the booking page appear here.</p>
        ) : (
          <ul className="adm-list">
            {upcoming.slice(0, 8).map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => setOpen(b.id)}>
                  <span className="adm-list__main"><b>{b.name}</b><small>{b.event_type || 'Event'} · {b.area || 'Area not set'}</small></span>
                  <span className="adm-list__when">{shortDate(b.event_date)}<small>{formatTime(b.start_time)}</small></span>
                  <StatusPill status={b.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {row && <BookingDrawer row={row} onClose={() => setOpen(null)} />}
    </div>
  )
}
