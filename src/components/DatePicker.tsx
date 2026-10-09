import { useEffect, useId, useRef, useState } from 'react'
import { CaretLeft, CaretRight, CalendarBlank, X } from '@/components/slab'

/**
 * DatePicker - a large, touch-friendly calendar in place of the browser's own
 * small date pop-up. Past dates are disabled and dates in `booked` are marked.
 * Posts its value as a hidden input named `name` (YYYY-MM-DD).
 */

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const p2 = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${p2(m + 1)}-${p2(d)}`

type Props = { name: string; value: string; onChange: (v: string) => void; min: string; booked?: string[]; required?: boolean }

export default function DatePicker({ name, value, onChange, min, booked = [], required }: Props) {
  const [open, setOpen] = useState(false)
  const base = value ? new Date(`${value}T00:00:00`) : new Date(`${min}T00:00:00`)
  const [ym, setYm] = useState({ y: base.getFullYear(), m: base.getMonth() })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    popRef.current?.querySelector<HTMLButtonElement>('button.is-sel, button.dp__day:not(:disabled)')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() }
    }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!popRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  const first = new Date(ym.y, ym.m, 1)
  const days = new Date(ym.y, ym.m + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const move = (d: number) => setYm((c) => { const n = new Date(c.y, c.m + d, 1); return { y: n.getFullYear(), m: n.getMonth() } })
  const minDate = new Date(`${min}T00:00:00`)
  const atMin = ym.y === minDate.getFullYear() && ym.m === minDate.getMonth()
  const label = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Choose a date'
  const today = new Date()

  return (
    <div className="dp">
      <input type="hidden" name={name} value={value} required={required} />
      <button ref={btnRef} type="button" className={`dp__field${value ? '' : ' is-empty'}`} onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open}>
        <CalendarBlank size={18} weight="duotone" aria-hidden="true" />
        <span>{label}</span>
      </button>

      {open && (
        <>
          <div className="dp__backdrop" aria-hidden="true" />
          <div className="dp__pop" ref={popRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <header className="dp__head">
              <button type="button" className="dp__nav" onClick={() => move(-1)} disabled={atMin} aria-label="Previous month"><CaretLeft size={20} weight="bold" /></button>
              <h3 id={titleId} aria-live="polite">{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
              <button type="button" className="dp__nav" onClick={() => move(1)} aria-label="Next month"><CaretRight size={20} weight="bold" /></button>
              <button type="button" className="dp__close" onClick={() => { setOpen(false); btnRef.current?.focus() }} aria-label="Close calendar"><X size={18} weight="bold" /></button>
            </header>
            <div className="dp__grid" role="grid">
              {DOW.map((d) => <span key={d} className="dp__dow" role="columnheader">{d}</span>)}
              {cells.map((d, i) => {
                if (!d) return <span key={`e${i}`} />
                const v = iso(ym.y, ym.m, d)
                const past = v < min
                const isBooked = booked.includes(v)
                const sel = v === value
                const isToday = ym.y === today.getFullYear() && ym.m === today.getMonth() && d === today.getDate()
                return (
                  <button key={v} type="button" role="gridcell" disabled={past} className={`dp__day${sel ? ' is-sel' : ''}${isBooked ? ' is-booked' : ''}${isToday ? ' is-today' : ''}`} aria-pressed={sel} aria-label={`${new Date(`${v}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${isBooked ? ', already has a confirmed booking' : ''}`} onClick={() => { onChange(v); setOpen(false); btnRef.current?.focus() }}>
                    {d}
                  </button>
                )
              })}
            </div>
            <p className="dp__legend"><i /> Already has a confirmed booking. You can still request it and we will check.</p>
          </div>
        </>
      )}
    </div>
  )
}
