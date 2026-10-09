import { useMemo, useState } from 'react'
import { MagnifyingGlass, DownloadSimple } from '@/components/slab'
import { useData } from '@/components/admin/data'
import BookingDrawer from '@/components/admin/BookingDrawer'
import AddEventDrawer from '@/components/admin/AddEventDrawer'
import { StatusPill, PaymentPill, STATUS_LABEL, shortDate, formatTime, money, downloadCsv } from '@/components/admin/ui'
import type { BookingStatus } from '@/lib/db'

export default function BookingsView() {
  const { data } = useData()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | BookingStatus>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return data.bookings.filter((b) => (status === 'all' || b.status === status) && (!t || [b.name, b.email, b.phone, b.area, b.event_type].join(' ').toLowerCase().includes(t)))
  }, [data.bookings, q, status])
  const row = data.bookings.find((b) => b.id === open)

  const exportCsv = () =>
    downloadCsv('bookings.csv', [
      ['Received', 'Status', 'Name', 'Phone', 'Email', 'Event', 'Date', 'Time', 'Duration', 'Area', 'Venue', 'Services', 'Total KWD', 'Deposit KWD', 'Payment status', 'Paid KWD', 'Balance KWD'],
      ...rows.map((b) => [b.created_at.slice(0, 10), b.status, b.name, b.phone, b.email, b.event_type, b.event_date, b.start_time, b.duration, b.area, b.venue, b.items.map((i) => i.name).join('; '), b.total, b.deposit, b.payment_status, b.amount_paid, b.balance]),
    ])

  return (
    <div className="adm-stack">
      <div className="adm-toolbar">
        <label className="adm-search">
          <MagnifyingGlass size={16} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, area" aria-label="Search bookings" />
        </label>
        <div className="adm-chips" role="group" aria-label="Filter by status">
          {(['all', 'new', 'confirmed', 'completed', 'cancelled'] as const).map((s) => (
            <button key={s} type="button" className={status === s ? 'is-on' : ''} aria-pressed={status === s} onClick={() => setStatus(s)}>
              {s === 'all' ? 'All' : STATUS_LABEL[s]}
              <small>{s === 'all' ? data.bookings.length : data.bookings.filter((b) => b.status === s).length}</small>
            </button>
          ))}
        </div>
        <button type="button" className="adm-btn" onClick={() => setAdding(true)}>Add event</button>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={exportCsv}><DownloadSimple size={15} aria-hidden="true" /> Export CSV</button>
      </div>

      {rows.length === 0 ? (
        <p className="adm-empty">No bookings match. Requests from the Book now page show up here.</p>
      ) : (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Event date</th><th>Customer</th><th>Services</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} tabIndex={0} onClick={() => setOpen(b.id)} onKeyDown={(e) => e.key === 'Enter' && setOpen(b.id)}>
                  <td data-label="Event date">{shortDate(b.event_date)}<small>{formatTime(b.start_time)}</small></td>
                  <td data-label="Customer"><b>{b.name}</b><small>{b.phone}</small></td>
                  <td data-label="Services">{b.items.map((i) => i.name.split(':')[0]).filter((n, k, a) => a.indexOf(n) === k).join(', ') || '-'}<small>{b.area}</small></td>
                  <td data-label="Total">{b.sponsored ? <>{money(0)}<small className="adm-flag adm-flag--ok">Sponsored</small></> : money(b.total)}</td>
                  <td data-label="Payment"><PaymentPill status={b.payment_status} /><small>{money(b.amount_paid)} of {money(b.total)}</small></td>
                  <td data-label="Status"><StatusPill status={b.status} />{b.change_request?.status === 'pending' && <small className="adm-flag">{b.change_request.type === 'cancel' ? 'Cancel request' : 'Date change request'}</small>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {row && <BookingDrawer row={row} onClose={() => setOpen(null)} />}
      {adding && <AddEventDrawer onClose={() => setAdding(false)} />}
    </div>
  )
}
