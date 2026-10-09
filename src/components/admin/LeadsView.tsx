import { useState } from 'react'
import { Phone, WhatsappLogo, EnvelopeSimple, Trash } from '@/components/slab'
import { useData } from '@/components/admin/data'
import { shortDate, whatsappLink, downloadCsv } from '@/components/admin/ui'
import { formatPeso } from '@/lib/inventory'
import { FINANCING_AVAILABLE } from '@/data/profile'
import type { Inquiry, InquiryKind, InquiryStatus } from '@/types/vehicle'

const KIND: Record<InquiryKind, string> = { inquiry: 'Inquiry', trade_in: 'Trade-in', financing: 'Financing', test_drive: 'Test drive' }

function summary(i: Inquiry): string {
  const d = i.details
  if (i.kind === 'test_drive') return `${d.date ? shortDate(String(d.date)) : 'No date'}${d.time ? ` at ${String(d.time)}` : ''}`
  if (i.kind === 'financing') return `Price ${formatPeso(Number(d.price) || 0)}, down ${formatPeso(Number(d.down) || 0)}, ${String(d.months)} mo, about ${formatPeso(Number(d.monthly) || 0)}/mo`
  if (i.kind === 'trade_in') return [d.vehicle, d.year, d.mileage ? `${String(d.mileage)} km` : '', d.asking ? `asking ${formatPeso(Number(d.asking))}` : ''].filter(Boolean).join(' · ')
  return d.product ? `Item: ${String(d.product)}` : ''
}

export default function LeadsView() {
  const { data, patch, remove } = useData()
  const [kind, setKind] = useState<'all' | InquiryKind>('all')
  const [status, setStatus] = useState<'all' | InquiryStatus>('all')
  const title = (id: string | null) => { const v = data.vehicles.find((x) => x.id === id); return v ? `${v.year} ${v.brand} ${v.model}` : '' }
  const list = data.inquiries.filter((i) => (kind === 'all' || i.kind === kind) && (status === 'all' || i.status === status))

  return (
    <div className="adm-stack">
      <div className="adm-toolbar">
        <div className="adm-chips">
          {(['all', 'inquiry', 'test_drive', 'financing', 'trade_in'] as const).filter((k) => k !== 'financing' || FINANCING_AVAILABLE || data.inquiries.some((i) => i.kind === 'financing')).map((k) => (
            <button key={k} type="button" className={kind === k ? 'is-on' : ''} onClick={() => setKind(k)}>{k === 'all' ? 'All' : KIND[k]} <small>{k === 'all' ? data.inquiries.length : data.inquiries.filter((i) => i.kind === k).length}</small></button>
          ))}
        </div>
        <div className="adm-chips">
          {(['all', 'new', 'contacted', 'closed'] as const).map((s) => (
            <button key={s} type="button" className={status === s ? 'is-on' : ''} onClick={() => setStatus(s)}>{s === 'all' ? 'Any status' : s[0].toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadCsv('migs-auto-leads.csv', [['Date', 'Type', 'Name', 'Phone', 'Email', 'Vehicle', 'Details', 'Message', 'Status'], ...data.inquiries.map((i) => [i.created_at.slice(0, 10), KIND[i.kind], i.name, i.phone, i.email, title(i.vehicle_id), summary(i), i.message, i.status])])}>Export CSV</button>
      </div>
      {list.length === 0 ? <p className="adm-empty">No leads here yet. Inquiries, test drives, trade-ins and financing requests from the website appear here.</p> : (
        <ul className="adm-reviews">
          {list.map((i) => (
            <li key={i.id} className={`adm-panel${i.status === 'closed' ? ' is-done' : ''}`}>
              <div className="adm-reviews__top">
                <b>{i.name} <span className={`adm-pill adm-pill--${i.status === 'new' ? 'new' : i.status === 'contacted' ? 'confirmed' : 'completed'}`}>{i.status}</span></b>
                <span className="adm-note">{KIND[i.kind]} · {shortDate(i.created_at)}</span>
              </div>
              {title(i.vehicle_id) && <p><b>{title(i.vehicle_id)}</b></p>}
              {summary(i) && <p>{summary(i)}</p>}
              {i.message && <p>{i.message}</p>}
              <div className="adm-actions">
                {i.phone && <a className="adm-btn adm-btn--ghost" href={`tel:${i.phone.replace(/[^\d+]/g, '')}`}><Phone size={15} aria-hidden="true" /> Call</a>}
                {i.phone && <a className="adm-btn adm-btn--ghost" href={whatsappLink(i.phone)} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={15} aria-hidden="true" /> WhatsApp</a>}
                {i.email && <a className="adm-btn adm-btn--ghost" href={`mailto:${i.email}?subject=${encodeURIComponent('Your inquiry at Migs Auto')}`}><EnvelopeSimple size={15} aria-hidden="true" /> Email</a>}
                <select aria-label={`Status for ${i.name}`} value={i.status} onChange={(e) => void patch('inquiries', i.id, { status: e.target.value as InquiryStatus })}>
                  <option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
                </select>
                <button type="button" className="adm-icon-btn" aria-label="Delete lead" onClick={() => window.confirm('Delete this lead?') && void remove('inquiries', i.id)}><Trash size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
