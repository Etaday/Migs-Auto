import { useMemo } from 'react'
import { useData } from '@/components/admin/data'
import { shortDate } from '@/components/admin/ui'
import { formatPeso } from '@/lib/inventory'
import { dealerStats, daysInStock } from '@/lib/dealer'

export default function Overview({ go }: { go: (tab: string) => void }) {
  const { data } = useData()
  const now = useMemo(() => new Date(), [])
  const s = dealerStats(data.vehicles, data.inquiries, now)
  const aging = data.vehicles.filter((v) => v.status === 'available').sort((a, b) => daysInStock(b, now) - daysInStock(a, now)).slice(0, 5)
  const latest = data.inquiries.filter((i) => i.status === 'new').slice(0, 6)
  const title = (id: string | null) => { const v = data.vehicles.find((x) => x.id === id); return v ? `${v.year} ${v.brand} ${v.model}` : 'General' }

  return (
    <div className="adm-stack">
      <div className="adm-cards">
        <button type="button" className="adm-card" onClick={() => go('vehicles')}><b>{s.available}</b><span>Available</span></button>
        <button type="button" className="adm-card" onClick={() => go('vehicles')}><b>{s.reserved}</b><span>Reserved</span></button>
        <button type="button" className="adm-card" onClick={() => go('vehicles')}><b>{formatPeso(s.inventoryValue)}</b><span>Inventory value</span></button>
        <button type="button" className="adm-card" onClick={() => go('leads')}><b>{s.newLeads}</b><span>New leads</span></button>
        <button type="button" className="adm-card" onClick={() => go('sales')}><b>{s.soldThisMonth}</b><span>Sold this month</span></button>
        <button type="button" className="adm-card" onClick={() => go('sales')}><b>{formatPeso(s.profitThisMonth)}</b><span>Profit this month</span></button>
      </div>

      <section className="adm-panel">
        <h2>Upcoming test drives</h2>
        {s.upcomingTestDrives.length === 0 ? <p className="adm-empty">No test drives booked. Bookings from the website appear here.</p> : (
          <ul className="adm-list">{s.upcomingTestDrives.slice(0, 6).map((i) => (
            <li key={i.id}><button type="button" onClick={() => go('leads')}>
              <span className="adm-list__main"><b>{i.name}</b><small>{title(i.vehicle_id)} · {i.phone || i.email}</small></span>
              <span className="adm-list__when">{shortDate(String(i.details.date))}<small>{String(i.details.time ?? '')}</small></span>
            </button></li>))}</ul>
        )}
      </section>

      <section className="adm-panel">
        <h2>Newest leads</h2>
        {latest.length === 0 ? <p className="adm-empty">No new leads.</p> : (
          <ul className="adm-list">{latest.map((i) => (
            <li key={i.id}><button type="button" onClick={() => go('leads')}>
              <span className="adm-list__main"><b>{i.name}</b><small>{title(i.vehicle_id)}</small></span>
              <span className="adm-list__when">{shortDate(i.created_at)}<small>{i.kind.replace('_', ' ')}</small></span>
            </button></li>))}</ul>
        )}
      </section>

      <section className="adm-panel">
        <h2>Longest in stock</h2>
        {aging.length === 0 ? <p className="adm-empty">No vehicles in stock.</p> : (
          <ul className="adm-list">{aging.map((v) => (
            <li key={v.id}><button type="button" onClick={() => go('vehicles')}>
              <span className="adm-list__main"><b>{v.year} {v.brand} {v.model}</b><small>{formatPeso(v.price)}</small></span>
              <span className="adm-list__when">{daysInStock(v, now)} days</span>
            </button></li>))}</ul>
        )}
      </section>
    </div>
  )
}
