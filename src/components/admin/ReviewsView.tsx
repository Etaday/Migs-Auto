import { useState } from 'react'
import { Star, Check, X, Trash } from '@/components/slab'
import { useData } from '@/components/admin/data'
import { StatusPill, shortDate } from '@/components/admin/ui'
import type { ReviewStatus } from '@/lib/db'

export default function ReviewsView() {
  const { data, patch, remove } = useData()
  const [tab, setTab] = useState<ReviewStatus>('pending')
  const rows = data.reviews.filter((r) => r.status === tab)
  return (
    <div className="adm-stack">
      <div className="adm-chips" role="group" aria-label="Review status">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button key={s} type="button" className={tab === s ? 'is-on' : ''} aria-pressed={tab === s} onClick={() => setTab(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}<small>{data.reviews.filter((r) => r.status === s).length}</small>
          </button>
        ))}
      </div>
      <p className="adm-note">Only approved reviews show on the website.</p>
      {rows.length === 0 ? <p className="adm-empty">Nothing here.</p> : (
        <ul className="adm-reviews">
          {rows.map((r) => (
            <li key={r.id} className="adm-panel">
              <div className="adm-reviews__top">
                <span className="adm-stars" role="img" aria-label={`${r.rating} stars`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={16} weight={i <= r.rating ? 'fill' : 'regular'} />)}</span>
                <StatusPill status={r.status} />
              </div>
              <p>{r.text}</p>
              <p className="adm-note"><b>{r.name}</b> · {r.service || 'Service not set'} · {shortDate(r.created_at)}{r.email ? ` · ${r.email}` : ''}</p>
              <div className="adm-actions">
                {r.status !== 'approved' && <button type="button" className="adm-btn" onClick={() => void patch('reviews', r.id, { status: 'approved' })}><Check size={15} weight="bold" aria-hidden="true" /> Approve</button>}
                {r.status !== 'rejected' && <button type="button" className="adm-btn adm-btn--ghost" onClick={() => void patch('reviews', r.id, { status: 'rejected' })}><X size={15} weight="bold" aria-hidden="true" /> Reject</button>}
                <button type="button" className="adm-icon-btn" aria-label="Delete review" onClick={() => window.confirm('Delete this review?') && void remove('reviews', r.id)}><Trash size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
