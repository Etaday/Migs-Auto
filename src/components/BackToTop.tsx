import { useEffect, useState } from 'react'
import { ArrowUp } from '@/components/slab'
import { SCROLLER_ID } from '@/hooks/useLenis'

/**
 * BackToTop - a round button that appears once the page has been scrolled and
 * glides back to the top. The scroller depends on the width: the shell panel
 * on desktop, the document on narrow screens, so scroll is watched
 * on both (capture phase, since scroll events do not bubble).
 */
const SHOW_AFTER = 400

export const SCROLL_TOP_EVENT = 'app:scrolltop'

export default function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const read = () => {
      const panel = document.getElementById(SCROLLER_ID)
      const y = Math.max(
        panel?.scrollTop ?? 0,
        document.body.scrollTop,
        document.documentElement.scrollTop,
        window.scrollY,
      )
      setShow(y > SHOW_AFTER)
    }
    document.addEventListener('scroll', read, { capture: true, passive: true })
    window.addEventListener('resize', read)
    read()
    return () => {
      document.removeEventListener('scroll', read, { capture: true })
      window.removeEventListener('resize', read)
    }
  }, [])

  const toTop = () => {
    // Lenis (desktop) handles the event and cancels it; otherwise scroll natively.
    const ev = new CustomEvent(SCROLL_TOP_EVENT, { cancelable: true })
    window.dispatchEvent(ev)
    if (ev.defaultPrevented) return
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    document.getElementById(SCROLLER_ID)?.scrollTo({ top: 0, behavior })
    document.body.scrollTo({ top: 0, behavior })
    window.scrollTo({ top: 0, behavior })
  }

  return (
    <button
      type="button"
      className={`to-top${show ? ' is-visible' : ''}`}
      onClick={toTop}
      aria-label="Back to top"
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
    >
      <ArrowUp size={20} weight="bold" aria-hidden="true" />
    </button>
  )
}
