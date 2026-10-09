import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, CaretLeft, CaretRight } from '@/components/slab'
import type { Shot } from '@/data/portfolio'

const PhotoBarrel = lazy(() => import('@/components/PhotoBarrel'))

/**
 * PortfolioGallery - the food photography portfolio: a masonry grid that
 * opens a lightbox (arrow keys, Esc, swipe-free buttons).
 */
type Props = { id: string; title: string; sub: string; shots: Shot[]; tag?: string; barrel?: boolean }

/** The 3D photo ring is for larger screens; phones get the photo grid alone. */
function useWide() {
  const q = "(min-width: 821px)"
  const [wide, setWide] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setWide(m.matches)
    m.addEventListener("change", on)
    return () => m.removeEventListener("change", on)
  }, [])
  return wide
}

export default function PortfolioGallery({ id, title, sub, shots: SHOTS, tag = '', barrel = false }: Props) {
  const BARREL = SHOTS.map((s) => ({ src: s.thumb, label: s.alt, tag }))
  const wide = useWide()
  const [open, setOpen] = useState<number | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)

  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + SHOTS.length) % SHOTS.length)), [])

  useEffect(() => {
    if (open === null) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, step])

  const close = () => {
    setOpen(null)
    lastFocus.current?.focus()
  }
  const shot = open === null ? null : SHOTS[open]

  return (
    <section className="gallery" aria-labelledby={`${id}-title`}>
      <div className="sgrid__offers-head">
        <h2 className="sgrid__offers-title" id={`${id}-title`}>{title}</h2>
        <p className="sgrid__offers-sub">{sub}</p>
      </div>
      {barrel && wide && (
        <Suspense fallback={<div className="pbarrel" aria-hidden="true" />}>
          <PhotoBarrel items={BARREL} onOpen={(i, el) => { lastFocus.current = el ?? null; setOpen(i) }} />
        </Suspense>
      )}
      <ul className="gallery__grid" role="list">
        {SHOTS.map((s, i) => (
          <li key={s.id} style={{ "--ar": s.w / s.h, flexGrow: (s.w / s.h) * 100, flexBasis: `${(s.w / s.h) * 180}px`, maxWidth: `${(s.w / s.h) * 520}px`, aspectRatio: `${s.w} / ${s.h}` } as React.CSSProperties}>
            <button
              type="button"
              className="gallery__item"
              onClick={(e) => {
                lastFocus.current = e.currentTarget
                setOpen(i)
              }}
              aria-label={`Open photo: ${s.alt}`}
            >
              <img src={s.thumb} alt={s.alt} width={s.w} height={s.h} loading="lazy" decoding="async" />
            </button>
          </li>
        ))}
      </ul>

      {shot && createPortal(
        // On the page body, not inside the glass panel: a blurred parent would trap the fixed overlay and push it off screen.
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={shot.alt} onClick={close}>
          <button ref={closeRef} type="button" className="lightbox__btn lightbox__close" onClick={close} aria-label="Close">
            <X size={20} weight="bold" />
          </button>
          <button type="button" className="lightbox__btn lightbox__prev" onClick={(e) => { e.stopPropagation(); step(-1) }} aria-label="Previous photo">
            <CaretLeft size={22} weight="bold" />
          </button>
          <img className="lightbox__img" src={shot.full} alt={shot.alt} onClick={(e) => e.stopPropagation()} />
          <button type="button" className="lightbox__btn lightbox__next" onClick={(e) => { e.stopPropagation(); step(1) }} aria-label="Next photo">
            <CaretRight size={22} weight="bold" />
          </button>
          <span className="lightbox__count" aria-live="polite">{(open ?? 0) + 1} / {SHOTS.length}</span>
        </div>,
        document.body,
      )}
    </section>
  )
}
