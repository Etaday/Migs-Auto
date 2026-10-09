import { useCallback, useEffect, useMemo, useState } from 'react'
import { CaretLeft, CaretRight, CheckCircle, WarningCircle } from '@/components/slab'
import { useData } from '@/components/admin/data'
import BookingDrawer from '@/components/admin/BookingDrawer'
import AddEventDrawer from '@/components/admin/AddEventDrawer'
import { StatusPill, formatTime, todayIso } from '@/components/admin/ui'
import { connect, disconnect, getClientId, isConnected, listEvents, setClientId, syncBooking, type GEvent } from '@/lib/gcalApi'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const p2 = (n: number) => String(n).padStart(2, '0')

const clock = (e: GEvent) => (e.allDay ? 'All day' : new Date(e.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))

function GoogleBar({ connected, onChange, busy, message, onSyncAll }: {
  connected: boolean
  onChange: () => void
  busy: boolean
  message: { ok: boolean; text: string } | null
  onSyncAll: () => void
}) {
  const [clientId, setId] = useState(getClientId)
  const [draft, setDraft] = useState(clientId)
  const [err, setErr] = useState('')
  const [working, setWorking] = useState(false)

  const doConnect = async () => {
    setErr('')
    setWorking(true)
    try {
      await connect()
      onChange()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not connect.')
    } finally {
      setWorking(false)
    }
  }

  if (!clientId) {
    return (
      <section className="adm-panel adm-gsetup">
        <h2>Connect your Google Calendar</h2>
        <p className="adm-note">One-time setup so the dashboard can read and write your calendar. It needs a free Google Client ID (not a secret):</p>
        <ol>
          <li>Open <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">console.cloud.google.com</a>, create a project, and enable the <b>Google Calendar API</b>.</li>
          <li><b>Google Auth Platform</b> (OAuth consent screen): choose External, fill in the app name, and add your Google email as a <b>Test user</b>.</li>
          <li><b>Credentials &gt; Create credentials &gt; OAuth client ID</b>, type <b>Web application</b>. Under Authorized JavaScript origins add your website address (for example <code>https://your-site.vercel.app</code>) and <code>http://localhost:5173</code>.</li>
          <li>Copy the <b>Client ID</b> (ends in <code>.apps.googleusercontent.com</code>) and paste it below.</li>
        </ol>
        <form className="adm-gcal__form" onSubmit={(e) => { e.preventDefault(); setClientId(draft); setId(draft.trim()) }}>
          <label className="adm-field"><span>Google Client ID</span><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="1234567890-abc.apps.googleusercontent.com" /></label>
          <button type="submit" className="adm-btn" disabled={!draft.trim()}>Save</button>
        </form>
      </section>
    )
  }

  return (
    <div className="adm-gbar">
      {connected ? (
        <>
          <span className="adm-gbar__state"><CheckCircle size={16} weight="fill" aria-hidden="true" /> Google Calendar connected</span>
          <button type="button" className="adm-btn" onClick={onSyncAll} disabled={busy}>{busy ? 'Syncing' : 'Sync confirmed bookings to Google'}</button>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { disconnect(); onChange() }}>Disconnect</button>
        </>
      ) : (
        <>
          <button type="button" className="adm-btn" onClick={doConnect} disabled={working}>{working ? 'Waiting for Google' : 'Connect Google Calendar'}</button>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { setClientId(''); setId('') }}>Change Client ID</button>
        </>
      )}
      {(err || message) && (
        <span className={`adm-gbar__msg${err || !message?.ok ? ' is-bad' : ''}`} role="status">
          {err || !message?.ok ? <WarningCircle size={15} weight="fill" aria-hidden="true" /> : null} {err || message?.text}
        </span>
      )}
    </div>
  )
}

export default function CalendarView() {
  const { data } = useData()
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [day, setDay] = useState<string | null>(todayIso())
  const [open, setOpen] = useState<string | null>(null)
  const [connected, setConnected] = useState(isConnected)
  const [gevents, setGevents] = useState<GEvent[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const loadGoogle = useCallback(async () => {
    if (!isConnected()) { setConnected(false); setGevents([]); return }
    try {
      setGevents(await listEvents(new Date(ym.y, ym.m, 1), new Date(ym.y, ym.m + 1, 1)))
      setConnected(true)
    } catch (e) {
      setConnected(isConnected())
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Could not read Google Calendar.' })
    }
  }, [ym])

  useEffect(() => {
    void loadGoogle()
  }, [loadGoogle, connected])

  const byDay = useMemo(() => {
    const map = new Map<string, typeof data.bookings>()
    for (const b of data.bookings) {
      if (b.status === 'cancelled') continue
      map.set(b.event_date, [...(map.get(b.event_date) ?? []), b])
    }
    return map
  }, [data])

  // Events the dashboard pushed are shown as bookings already; the rest are the owner's other events.
  const others = useMemo(() => {
    const map = new Map<string, GEvent[]>()
    for (const e of gevents) {
      if (e.bookingId) continue
      map.set(e.date, [...(map.get(e.date) ?? []), e])
    }
    return map
  }, [gevents])

  const syncAll = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const todo = data.bookings.filter((b) => b.status === 'confirmed' && b.event_date >= todayIso())
      let created = 0, updated = 0
      for (const b of todo) {
        if ((await syncBooking(b)) === 'created') created++
        else updated++
      }
      setMessage({ ok: true, text: todo.length ? `Synced ${todo.length} booking${todo.length > 1 ? 's' : ''} (${created} new, ${updated} updated).` : 'No upcoming confirmed bookings to sync.' })
      await loadGoogle()
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Sync failed.' })
    } finally {
      setBusy(false)
    }
  }

  const first = new Date(ym.y, ym.m, 1)
  const days = new Date(ym.y, ym.m + 1, 0).getDate()
  const cells: (string | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => `${ym.y}-${p2(ym.m + 1)}-${p2(i + 1)}`)]
  const move = (d: number) => setYm((c) => { const n = new Date(c.y, c.m + d, 1); return { y: n.getFullYear(), m: n.getMonth() } })
  const list = day ? byDay.get(day) ?? [] : []
  const gList = day ? others.get(day) ?? [] : []
  const row = data.bookings.find((b) => b.id === open)
  const [adding, setAdding] = useState(false)
  const today = todayIso()

  return (
    <div className="adm-stack">
      <GoogleBar connected={connected} onChange={() => setConnected(isConnected())} busy={busy} message={message} onSyncAll={syncAll} />
      <div className="adm-cal">
        <section className="adm-panel">
          <header className="adm-cal__head">
            <button type="button" className="adm-icon-btn" onClick={() => move(-1)} aria-label="Previous month"><CaretLeft size={18} weight="bold" /></button>
            <h2>{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
            <button type="button" className="adm-icon-btn" onClick={() => move(1)} aria-label="Next month"><CaretRight size={18} weight="bold" /></button>
            <button type="button" className="adm-btn adm-btn--sm" onClick={() => setAdding(true)}>Add event</button>
          </header>
          <div className="adm-cal__grid" role="grid" aria-label="Booking calendar">
            {DOW.map((d) => <span key={d} className="adm-cal__dow" role="columnheader">{d}</span>)}
            {cells.map((c, i) => {
              if (!c) return <span key={`e${i}`} />
              const items = byDay.get(c) ?? []
              const g = others.get(c) ?? []
              const confirmed = items.some((b) => b.status === 'confirmed' || b.status === 'completed')
              return (
                <button key={c} type="button" role="gridcell" className={`adm-cal__day${c === today ? ' is-today' : ''}${c === day ? ' is-sel' : ''}${items.length ? ' has' : ''}${confirmed ? ' is-confirmed' : ''}${items.length > 1 || (items.length && g.length) ? ' is-double' : ''}`} onClick={() => setDay(c)} aria-label={`${c}, ${items.length} booking${items.length === 1 ? '' : 's'}${g.length ? `, ${g.length} Google Calendar event${g.length === 1 ? '' : 's'}` : ''}`}>
                  <span>{Number(c.slice(8))}</span>
                  {g.length > 0 && <b className="adm-cal__g" aria-hidden="true">{g.length}</b>}
                  {items.length > 0 && <i>{items.length}</i>}
                </button>
              )
            })}
          </div>
          <p className="adm-note">Bottom-right number: studio bookings (pink when confirmed). Top-right blue number: other events from your Google Calendar. A dark ring means a clash: two bookings, or a booking and a Google event, on one day.</p>
        </section>

        <section className="adm-panel">
          {day && <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setAdding(true)}>Add event on this day</button>}
          <h2>{day ? new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Pick a day'}</h2>
          {list.length === 0 && gList.length === 0 ? <p className="adm-empty">Nothing booked. This date looks free.</p> : (
            <ul className="adm-list">
              {list.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => setOpen(b.id)}>
                    <span className="adm-list__main"><b>{b.name}</b><small>{b.items.map((i) => i.name.split(':')[0]).filter((n, k, a) => a.indexOf(n) === k).join(', ')} · {b.area}</small></span>
                    <span className="adm-list__when">{formatTime(b.start_time)}<small>{b.duration}</small></span>
                    <StatusPill status={b.status} />
                  </button>
                </li>
              ))}
              {gList.map((e) => (
                <li key={e.id} className="adm-list__g">
                  <a href={e.htmlLink} target="_blank" rel="noopener noreferrer">
                    <span className="adm-list__main"><b>{e.summary}</b><small>Google Calendar{e.location ? ` · ${e.location}` : ''}</small></span>
                    <span className="adm-list__when">{clock(e)}</span>
                    <span className="adm-pill adm-pill--google">Google</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {row && <BookingDrawer row={row} onClose={() => setOpen(null)} />}
      {adding && <AddEventDrawer date={day ?? undefined} onClose={() => setAdding(false)} onCreated={(d) => setDay(d)} />}
    </div>
  )
}
