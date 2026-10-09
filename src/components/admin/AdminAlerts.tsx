import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, BellSlash, X } from '@/components/slab'
import { useData } from '@/components/admin/data'

/**
 * AdminAlerts - tells the studio the moment something new arrives while the
 * dashboard is open: a booking request, a change or cancel request from a
 * customer, a quote request, a message or a review to approve.
 *
 * It checks for new rows every 30 seconds (and when the tab comes back into
 * view), then shows a banner here, a browser notification if the owner has
 * allowed them, a soft chime, and a count in the tab title. The first load
 * only records what already exists, so nothing is announced on sign-in.
 */

type Note = { key: string; tab: string; title: string; body: string }

const POLL_MS = 30_000
const PREF = 'jd-admin-alerts'
const SEEN = 'jd-admin-seen-v1'
const TITLE = 'Dashboard - Judeng Production Studio'

const read = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* storage unavailable */ } }

function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const now = ctx.currentTime
    ;[880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0.0001, now + i * 0.16)
      g.gain.exponentialRampToValueAtTime(0.12, now + i * 0.16 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.5)
      o.connect(g).connect(ctx.destination); o.start(now + i * 0.16); o.stop(now + i * 0.16 + 0.55)
    })
    window.setTimeout(() => void ctx.close(), 1500)
  } catch { /* sound is a nicety */ }
}

export default function AdminAlerts({ go }: { go: (tab: string) => void }) {
  const { data, loading, reload } = useData()
  const [on, setOn] = useState(() => read(PREF) !== 'off')
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission))
  const [notes, setNotes] = useState<Note[]>([])
  const seen = useRef<Set<string> | null>(null)
  const unread = useRef(0)

  // Every pending thing the studio should know about, as a stable key per item.
  const current = useCallback((): Note[] => {
    const out: Note[] = []
    for (const b of data.bookings) {
      if (b.status === 'new') out.push({ key: `b:${b.id}`, tab: 'bookings', title: 'New booking request', body: `${b.name}${b.event_date ? `, ${b.event_date}` : ''}` })
      if (b.change_request?.status === 'pending') out.push({ key: `c:${b.id}:${b.change_request.at}`, tab: 'bookings', title: 'Change or cancel request', body: b.name })
    }
    for (const q of data.quotes) if (q.status === 'new') out.push({ key: `q:${q.id}`, tab: 'quotes', title: 'New quote request', body: `${q.name}${q.service ? `, ${q.service}` : ''}` })
    for (const m of data.messages) if (!m.handled) out.push({ key: `m:${m.id}`, tab: 'messages', title: 'New message', body: m.name })
    for (const r of data.reviews) if (r.status === 'pending') out.push({ key: `r:${r.id}`, tab: 'reviews', title: 'Review to approve', body: r.name })
    return out
  }, [data])

  // Detect what is new since the last look.
  useEffect(() => {
    if (loading) return // wait for the first load, so what already exists is not announced
    const now = current()
    if (seen.current === null) {
      // First look after sign-in: remember what exists, announce nothing.
      let stored: string[] = []
      try { stored = JSON.parse(read(SEEN) ?? '[]') as string[] } catch { /* ignore */ }
      seen.current = new Set([...stored, ...now.map((n) => n.key)])
      write(SEEN, JSON.stringify([...seen.current].slice(-500)))
      return
    }
    const fresh = now.filter((n) => !seen.current!.has(n.key))
    if (!fresh.length) return
    fresh.forEach((n) => seen.current!.add(n.key))
    write(SEEN, JSON.stringify([...seen.current].slice(-500)))
    if (!on) return
    setNotes((l) => [...fresh, ...l].slice(0, 4))
    unread.current += fresh.length
    document.title = `(${unread.current}) ${TITLE}`
    chime()
    if (perm === 'granted' && document.hidden) {
      const top = fresh[0]
      try {
        const n = new Notification(fresh.length > 1 ? `${fresh.length} new items` : top.title, { body: fresh.length > 1 ? fresh.map((f) => f.title).slice(0, 3).join(', ') : top.body, tag: 'jd-admin', icon: '/favicon.png' })
        n.onclick = () => { window.focus(); go(top.tab); n.close() }
      } catch { /* notifications blocked */ }
    }
  }, [current, loading, on, perm, go])

  // Look for new items on a timer and whenever the tab comes back.
  useEffect(() => {
    if (!on) return
    const tick = () => { if (!document.hidden) void reload(true) }
    const id = window.setInterval(() => void reload(true), POLL_MS)
    const vis = () => { if (!document.hidden) { unread.current = 0; document.title = TITLE; tick() } }
    document.addEventListener('visibilitychange', vis)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', vis) }
  }, [on, reload])

  const toggle = async () => {
    // Alerts are on but the browser has not been asked yet: this click is the ask.
    if (on && perm === 'default') {
      try { setPerm(await Notification.requestPermission()) } catch { /* ignore */ }
      return
    }
    if (on) { setOn(false); write(PREF, 'off'); return }
    setOn(true); write(PREF, 'on')
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { setPerm(await Notification.requestPermission()) } catch { /* ignore */ }
    }
  }

  const label = !on ? 'Alerts off' : perm === 'granted' ? 'Alerts on' : perm === 'default' ? 'Allow desktop alerts' : 'Alerts on (in page)'
  return (
    <>
      <button type="button" className="adm-alertbtn" aria-pressed={on} onClick={() => void toggle()} title={!on ? 'Click to turn alerts on' : perm === 'default' ? 'Click to let this browser show desktop notifications' : 'Click to turn alerts off'}>
        {on ? <Bell size={15} weight="fill" aria-hidden="true" /> : <BellSlash size={15} aria-hidden="true" />} {label}
      </button>
      {perm === 'denied' && on && <span className="adm-alertnote">Browser notifications are blocked for this site. Alerts still show here.</span>}
      <div className="adm-toasts" role="status" aria-live="polite">
        {notes.map((n) => (
          <div key={n.key} className="adm-toast">
            <button type="button" className="adm-toast__main" onClick={() => { go(n.tab); setNotes((l) => l.filter((x) => x.key !== n.key)); unread.current = 0; document.title = TITLE }}>
              <b>{n.title}</b>
              <span>{n.body}</span>
            </button>
            <button type="button" className="adm-toast__x" aria-label="Dismiss" onClick={() => setNotes((l) => l.filter((x) => x.key !== n.key))}><X size={14} aria-hidden="true" /></button>
          </div>
        ))}
      </div>
    </>
  )
}
