import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { videoKind, youtubeEmbedUrl } from '@/lib/video'

const MAX = 4
const FALLBACK = '/vehicle-placeholder.svg'
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const onBroken = (e: React.SyntheticEvent<HTMLImageElement>) => { if (!e.currentTarget.src.endsWith(FALLBACK)) e.currentTarget.src = FALLBACK }

type Item = { kind: 'photo'; src: string } | { kind: 'file'; src: string } | { kind: 'youtube'; src: string; id: string }

/** Photos first, then the listing's playable videos (uploaded files and YouTube) as the last slides. Plain links stay out. */
function buildItems(photos: string[], videos: string[]): Item[] {
  const out: Item[] = photos.map((src) => ({ kind: 'photo', src }))
  for (const src of videos) {
    const k = videoKind(src)
    if (k.kind === 'file') out.push({ kind: 'file', src })
    else if (k.kind === 'youtube') out.push({ kind: 'youtube', src, id: k.id })
  }
  return out
}

/** Main slide with swipe, arrows, counter and thumbnails. Tap a photo to open the full-screen viewer (zoom, pan, swipe, thumbnails). Videos are the last slides. */
export default function PhotoGallery({ photos, videos = [], alt }: { photos: string[]; videos?: string[]; alt: string }) {
  const items = buildItems(photos, videos)
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const [big, setBig] = useState(false)
  const n = items.length
  const np = photos.length
  const cur = Math.min(i, n - 1)
  const item = items[cur]
  const start = useRef<{ x: number; y: number; onVideo: boolean } | null>(null)
  const opener = useRef<HTMLElement | null>(null)

  const to = useCallback((k: number) => { setDir(k >= cur ? 1 : -1); setI(((k % n) + n) % n) }, [cur, n])
  const go = useCallback((d: number) => { setDir(d); setI((c) => (Math.min(c, n - 1) + d + n) % n) }, [n])

  useEffect(() => { // warm the neighbouring photos so swiping never waits
    if (n < 2) return
    for (const k of [cur + 1, cur - 1]) { const it = items[(k + n) % n]; if (it.kind === 'photo') new Image().src = it.src }
  }, [cur, n, items])

  const open = () => { if (item.kind !== 'photo') return; opener.current = document.activeElement as HTMLElement | null; setBig(true) }
  const close = () => { setBig(false); opener.current?.focus?.() }

  return (
    <>
      <div
        className="vdetail__stage"
        onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY, onVideo: (e.target as HTMLElement).tagName === 'VIDEO' } }}
        onPointerUp={(e) => {
          const s = start.current
          start.current = null
          if (!s || s.onVideo) return
          const dx = e.clientX - s.x
          const dy = e.clientY - s.y
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && n > 1) go(dx < 0 ? 1 : -1)
          else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) open()
        }}
        onPointerCancel={() => { start.current = null }}
        onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'ArrowLeft' && n > 1) go(-1); else if (e.key === 'ArrowRight' && n > 1) go(1); else if (e.key === 'Enter') open() }}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${alt} photos and videos`}
      >
        {item.kind === 'photo' && <img key={cur} className={`vdetail__main vdetail__main--in${dir > 0 ? 'r' : 'l'}`} src={item.src} alt={`${alt}, photo ${cur + 1} of ${np}`} draggable={false} onError={onBroken} decoding="async" />}
        {item.kind === 'file' && <video key={cur} className="vdetail__main vdetail__main--video" src={`${item.src}#t=0.1`} controls preload="metadata" playsInline aria-label={`${alt} video`} />}
        {item.kind === 'youtube' && <iframe key={cur} className="vdetail__main vdetail__main--video" src={youtubeEmbedUrl(item.id)} title={`${alt} video`} loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
        <img className="brandmark" src="/emblem.png" alt="" aria-hidden="true" />
        {n > 1 && <span className="vdetail__count" aria-hidden="true">{item.kind === 'photo' ? `${cur + 1} / ${n}` : `Video · ${cur + 1} / ${n}`}</span>}
        {item.kind === 'photo' && <button type="button" className="vdetail__expand" onPointerUp={(e) => e.stopPropagation()} onClick={open} aria-label="Expand photo">&#x26F6;</button>}
        {n > 1 && (
          <>
            <button type="button" className="vdetail__arrow vdetail__arrow--prev" onPointerUp={(e) => e.stopPropagation()} onClick={() => go(-1)} aria-label="Previous">&lsaquo;</button>
            <button type="button" className="vdetail__arrow vdetail__arrow--next" onPointerUp={(e) => e.stopPropagation()} onClick={() => go(1)} aria-label="Next">&rsaquo;</button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="vdetail__thumbs">
          {items.map((it, k) => (
            <button key={it.src.slice(-30) + k} type="button" className={`${k === cur ? 'is-on' : ''}${it.kind !== 'photo' ? ' is-video' : ''}`.trim()} onClick={() => to(k)} aria-label={it.kind === 'photo' ? `Photo ${k + 1}` : 'Video'} aria-current={k === cur}>
              {it.kind === 'photo' ? <img src={it.src} alt="" loading="lazy" onError={onBroken} /> : <span aria-hidden="true">&#9654;</span>}
            </button>
          ))}
        </div>
      )}
      {big && <Viewer photos={photos} index={Math.min(cur, np - 1)} alt={alt} to={(k) => to(((k % np) + np) % np)} close={close} />}
    </>
  )
}

function Viewer({ photos, index, alt, to, close }: { photos: string[]; index: number; alt: string; to: (k: number) => void; close: () => void }) {
  const [z, setZ] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [drag, setDrag] = useState(0) // live horizontal offset while swiping at 1x
  const [moving, setMoving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const pts = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef(0)
  const sx = useRef(0)
  const lastTap = useRef({ t: 0, x: 0, y: 0 })
  const n = photos.length

  const limit = useCallback((p: { x: number; y: number }, zz: number) => {
    const w = (img.current?.offsetWidth ?? 0) * (zz - 1) / 2
    const h = (img.current?.offsetHeight ?? 0) * (zz - 1) / 2
    return { x: clamp(p.x, -w, w), y: clamp(p.y, -h, h) }
  }, [])
  /** Zoom keeping the point under (cx, cy) fixed. */
  const zoomAt = useCallback((nz: number, cx?: number, cy?: number) => {
    nz = clamp(nz, 1, MAX)
    setPos((o) => {
      if (nz === 1) return { x: 0, y: 0 }
      const r = root.current!.getBoundingClientRect()
      const px = (cx ?? r.left + r.width / 2) - (r.left + r.width / 2)
      const py = (cy ?? r.top + r.height / 2) - (r.top + r.height / 2)
      const k = nz / z
      return limit({ x: px - (px - o.x) * k, y: py - (py - o.y) * k }, nz)
    })
    setZ(nz)
  }, [z, limit])
  const step = useCallback((d: number) => { setZ(1); setPos({ x: 0, y: 0 }); setLoaded(false); to(index + d) }, [to, index])

  // keyboard, scroll lock, focus in and trapped
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft' && n > 1) step(-1)
      else if (e.key === 'ArrowRight' && n > 1) step(1)
      else if (e.key === '+' || e.key === '=') zoomAt(z + 0.5)
      else if (e.key === '-') zoomAt(z - 0.5)
      else if (e.key === '0') zoomAt(1)
      else if (e.key === 'Tab') {
        const f = root.current?.querySelectorAll<HTMLElement>('button:not(:disabled)')
        if (!f?.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root.current?.querySelector<HTMLElement>('.mbox__close')?.focus()
    return () => { document.body.style.overflow = prev }
  }, [])
  useEffect(() => { // preload neighbours at full size
    if (n < 2) return
    for (const k of [index + 1, index - 1]) new Image().src = photos[(k + n) % n]
  }, [index, n, photos])
  useEffect(() => { // wheel needs a non-passive listener to stop the page scrolling behind
    const el = root.current?.querySelector('.mbox__stage')
    if (!el) return
    const w = (e: Event) => { e.preventDefault(); const we = e as WheelEvent; zoomAt(z * Math.exp(-we.deltaY / 300), we.clientX, we.clientY) }
    el.addEventListener('wheel', w, { passive: false })
    return () => el.removeEventListener('wheel', w)
  }, [z, zoomAt])

  const dist = () => { const [a, b] = [...pts.current.values()]; return Math.hypot(a.x - b.x, a.y - b.y) }

  return createPortal(
    <div ref={root} className="mbox" role="dialog" aria-modal="true" aria-label={`${alt} photo viewer`}>
      <div
        className="mbox__stage"
        onClick={(e) => { if (e.target === e.currentTarget && z === 1) close() }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          setMoving(true)
          if (pts.current.size === 2) pinch.current = dist()
          sx.current = e.clientX
        }}
        onPointerMove={(e) => {
          const p = pts.current.get(e.pointerId)
          if (!p) return
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          if (pts.current.size === 2) {
            const d = dist()
            if (pinch.current) { const [a, b] = [...pts.current.values()]; zoomAt(z * d / pinch.current, (a.x + b.x) / 2, (a.y + b.y) / 2) }
            pinch.current = d
          } else if (z > 1) setPos((o) => limit({ x: o.x + e.clientX - p.x, y: o.y + e.clientY - p.y }, z))
          else if (n > 1) setDrag(e.clientX - sx.current)
        }}
        onPointerUp={(e) => {
          const wasOne = pts.current.size === 1
          pts.current.delete(e.pointerId)
          pinch.current = 0
          setMoving(false)
          setDrag(0)
          if (!wasOne) return
          const dx = e.clientX - sx.current
          if (z === 1 && Math.abs(dx) > 60 && n > 1) { step(dx < 0 ? 1 : -1); return }
          if (Math.abs(dx) < 8) {
            const t = Date.now(), l = lastTap.current
            if (t - l.t < 300 && Math.hypot(e.clientX - l.x, e.clientY - l.y) < 30) { zoomAt(z > 1 ? 1 : 2.5, e.clientX, e.clientY); lastTap.current = { t: 0, x: 0, y: 0 } }
            else lastTap.current = { t, x: e.clientX, y: e.clientY }
          }
        }}
        onPointerCancel={(e) => { pts.current.delete(e.pointerId); setMoving(false); setDrag(0) }}
      >
        {!loaded && <span className="mbox__spin" aria-hidden="true" />}
        <img
          key={index}
          ref={img}
          src={photos[index]}
          alt={`${alt}, photo ${index + 1} of ${n}`}
          draggable={false}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={(e) => { onBroken(e); setLoaded(true) }}
          className={loaded ? 'is-loaded' : ''}
          style={{ transform: `translate(${pos.x + drag}px, ${pos.y}px) scale(${z})`, transition: moving ? 'none' : undefined, cursor: z > 1 ? 'grab' : 'zoom-in' }}
        />
      </div>
      <img className="brandmark brandmark--big" src="/emblem.png" alt="" aria-hidden="true" />
      <button type="button" className="mbox__btn mbox__close" onClick={close} aria-label="Close">&times; Close</button>
      <div className="mbox__zoom">
        <button type="button" className="mbox__btn" onClick={() => zoomAt(z - 0.5)} disabled={z <= 1} aria-label="Zoom out">&minus;</button>
        <button type="button" className="mbox__pct" onClick={() => zoomAt(1)} disabled={z === 1} aria-label="Reset zoom">{Math.round(z * 100)}%</button>
        <button type="button" className="mbox__btn" onClick={() => zoomAt(z + 0.5)} disabled={z >= MAX} aria-label="Zoom in">+</button>
      </div>
      {n > 1 && (
        <>
          <button type="button" className="mbox__btn mbox__prev" onClick={() => step(-1)} aria-label="Previous photo">&lsaquo;</button>
          <button type="button" className="mbox__btn mbox__next" onClick={() => step(1)} aria-label="Next photo">&rsaquo;</button>
          <div className="mbox__strip" role="tablist" aria-label="Photos">
            {photos.map((p, k) => (
              <button key={p.slice(-30) + k} type="button" role="tab" aria-selected={k === index} className={k === index ? 'is-on' : ''} onClick={() => { setZ(1); setPos({ x: 0, y: 0 }); setLoaded(false); to(k) }} aria-label={`Photo ${k + 1}`}><img src={p} alt="" loading="lazy" onError={onBroken} /></button>
            ))}
          </div>
        </>
      )}
      <span className="mbox__hint" aria-live="polite">{index + 1} / {n}{z === 1 ? ' · double-tap or scroll to zoom' : ' · drag to move'}</span>
    </div>,
    document.body,
  )
}
