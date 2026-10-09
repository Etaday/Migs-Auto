import { Check, EnvelopeSimple, Trash } from '@/components/slab'
import { useData } from '@/components/admin/data'
import { shortDate } from '@/components/admin/ui'

export default function MessagesView() {
  const { data, patch, remove } = useData()
  return (
    <div className="adm-stack">
      {data.messages.length === 0 ? <p className="adm-empty">No messages yet. Messages from the Contact page appear here.</p> : (
        <ul className="adm-reviews">
          {data.messages.map((m) => (
            <li key={m.id} className={`adm-panel${m.handled ? ' is-done' : ''}`}>
              <div className="adm-reviews__top">
                <b>{m.name || 'Visitor'}</b>
                <span className="adm-note">{shortDate(m.created_at)}</span>
              </div>
              <p>{m.message}</p>
              <div className="adm-actions">
                <a className="adm-btn adm-btn--ghost" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message to Judeng Production Studio')}`}><EnvelopeSimple size={15} aria-hidden="true" /> Reply to {m.email}</a>
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => void patch('messages', m.id, { handled: !m.handled })}><Check size={15} weight="bold" aria-hidden="true" /> {m.handled ? 'Mark as unread' : 'Mark as handled'}</button>
                <button type="button" className="adm-icon-btn" aria-label="Delete message" onClick={() => window.confirm('Delete this message?') && void remove('messages', m.id)}><Trash size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
