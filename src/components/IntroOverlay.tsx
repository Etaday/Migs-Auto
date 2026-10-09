import { useEffect, useRef, useState } from 'react'
import { profile } from '@/data/profile'

/**
 * IntroOverlay - "the road writes the line".
 *
 * The intro follows the buyer's journey on a dashed road: Browse, Test drive,
 * Finance, Drive home. A headlight runs the road left to right; each stop lights
 * and earns a check as it passes, the headline is written by the same progress,
 * and the status reads "Starting engine" then "Ready to drive". (The node-and-
 * cable layout is the template's; the story and icons are the dealership's.)
 *
 *   Ignition  0.00-0.30  nodes and cables draw in
 *   Run       0.30-1.90  the execution streams the cables; nodes succeed as it
 *                        passes; words mask-reveal on the same progress value
 *   Lock      1.90-2.25  the last node succeeds, the status flips to done
 *   Handoff   2.25-3.15  the canvas falls away, the headline FLIES onto the
 *                        real `.home__title` rect at scale 1, and the page
 *                        assembles around it
 *
 * The overlay paints no backdrop. `html.is-intro` (set at module load, before
 * React's first paint) hides the page instead, so the contour shader drifts
 * behind the whole sequence.
 *
 * No animation library: Web Animations API for the keyframed parts and one rAF
 * loop for the progress-driven parts. Transform, opacity and stroke-dashoffset
 * only - nothing here touches layout.
 */

const WORDS = `${profile.displayName.line1} ${profile.displayName.line2}`.split(' ')

const IGNITE_MS = 300
const RUN_MS = 1600
const LOCK_MS = 350
const FLY_MS = 900

/** Design units for the canvas, before the shared scale is applied. */
const NODE = 40
const CANVAS_H = 96
const NODE_Y = 34

const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'
const EASE_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
const EASE_CAMERA = 'cubic-bezier(0.76, 0, 0.24, 1)'

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** The four steps of buying a vehicle. Icons are Tabler outlines, 24-unit grid. */
const STEPS = [
  { label: 'Browse', trigger: true, d: 'M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2M9 17h6M3 11h15M9 6v5' },
  { label: 'Test drive', trigger: false, d: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M12 14v7M10 12l-6.75 -1M14 12l6.75 -1' },
  { label: 'Finance', trigger: false, d: 'M6 7a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M16 17a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M6 18l12 -12' },
  { label: 'Drive home', trigger: false, d: 'M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1 -7 0a5 5 0 0 0 -7 0v-9zM5 21v-7' },
] as const

const shouldRun =
  typeof window !== 'undefined' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  window.location.pathname === '/'

// Two classes, because the page and the headline are handed back at different
// moments: `is-intro` holds the whole page, `is-intro-head` holds only the real
// headline, which must stay hidden until the flying clone has landed on it.
if (shouldRun) document.documentElement.classList.add('is-intro', 'is-intro-head')

const release = () => document.documentElement.classList.remove('is-intro')
const releaseHead = () => document.documentElement.classList.remove('is-intro-head')

export default function IntroOverlay() {
  const [gone, setGone] = useState(!shouldRun)
  const titleRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dotRef = useRef<HTMLElement>(null)
  const dotCoreRef = useRef<HTMLElement>(null)
  const statusRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!shouldRun) {
      release()
      releaseHead()
      return
    }

    // Re-assert here, not just at module load: StrictMode mounts, unmounts and
    // remounts in dev, and the first unmount's cleanup releases the class.
    document.documentElement.classList.add('is-intro', 'is-intro-head')

    const title = titleRef.current
    const canvas = canvasRef.current
    const svg = svgRef.current
    const dot = dotRef.current
    const dotCore = dotCoreRef.current
    const status = statusRef.current
    if (!title || !canvas || !svg || !dot || !dotCore || !status) {
      release()
      releaseHead()
      setGone(true)
      return
    }

    let cancelled = false
    let raf = 0
    const timers: number[] = []
    const anims: Animation[] = []
    const wait = (ms: number) =>
      new Promise<void>((res) => timers.push(window.setTimeout(res, ms)))
    const play = (el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      const a = el.animate(frames, { fill: 'both', ...opts })
      anims.push(a)
      return a
    }

    const run = async () => {
      if (document.fonts?.ready) await document.fonts.ready
      if (cancelled) return

      // Phones get the same sequence at two-thirds speed: a thumb is waiting.
      const k = window.innerWidth < 1100 ? 0.62 : 1
      const IGNITE = IGNITE_MS * k, RUN = RUN_MS * k, LOCK = LOCK_MS * k, FLY = FLY_MS * k

      const target = document.querySelector<HTMLElement>('.home__title')
      const t = target?.getBoundingClientRect()

      // Match the landing width exactly, so scale 1 IS the final layout.
      const width = t?.width ?? Math.min(760, window.innerWidth * 0.86)
      title.style.width = `${width}px`
      canvas.style.width = `${width}px`
      canvas.style.height = `${CANVAS_H}px`

      const height = t?.height ?? title.offsetHeight
      const scale = Math.min((window.innerWidth * 0.86) / width, 2.6)
      const w = width * scale
      const h = height * scale
      const sx = (window.innerWidth - w) / 2
      const sy = (window.innerHeight - h) / 2 - Math.min(96, window.innerHeight * 0.09)

      const restTransform = `translate(${sx}px, ${sy}px) scale(${scale})`
      const canvasTransform = `translate(${sx}px, ${sy + h + 76 * scale}px) scale(${scale})`
      title.style.transform = restTransform
      canvas.style.transform = canvasTransform
      title.style.opacity = '1'
      canvas.style.opacity = '1'

      // ---- Lay the nodes out on the design canvas ----
      // Node k sits with its centre at xs[k]; the run travels xs[0] -> xs[3].
      const nodeEls = Array.from(canvas.querySelectorAll<HTMLElement>('.boot__n'))
      const n = nodeEls.length
      const xs = nodeEls.map((_, k) => NODE / 2 + (k * (width - NODE)) / (n - 1))
      nodeEls.forEach((el, k) => {
        el.style.left = `${xs[k] - NODE / 2}px`
        el.style.top = `${NODE_Y - NODE / 2}px`
      })

      // Cables: one grey base path per gap, and one accent path on top whose
      // dashoffset the run pays out. n8n draws these as gentle beziers.
      svg.setAttribute('viewBox', `0 0 ${width} ${CANVAS_H}`)
      svg.setAttribute('width', String(width))
      svg.setAttribute('height', String(CANVAS_H))
      const NS = 'http://www.w3.org/2000/svg'
      svg.replaceChildren()
      const cables: { live: SVGPathElement; len: number; from: number; to: number }[] = []
      for (let k = 0; k < n - 1; k++) {
        const x1 = xs[k] + NODE / 2
        const x2 = xs[k + 1] - NODE / 2
        const cx = (x2 - x1) * 0.5
        const d = `M ${x1} ${NODE_Y} C ${x1 + cx} ${NODE_Y}, ${x2 - cx} ${NODE_Y}, ${x2} ${NODE_Y}`
        const base = document.createElementNS(NS, 'path')
        base.setAttribute('d', d)
        base.setAttribute('class', 'boot__cable')
        const live = document.createElementNS(NS, 'path')
        live.setAttribute('d', d)
        live.setAttribute('class', 'boot__cable boot__cable--live')
        svg.append(base, live)
        const len = live.getTotalLength()
        live.style.strokeDasharray = `${len}`
        live.style.strokeDashoffset = `${len}`
        cables.push({ live, len, from: x1, to: x2 })
        // The cable draws in with the ignition, base first.
        play(base, [{ opacity: 0 }, { opacity: 1 }], {
          duration: 420,
          delay: 90 + k * 70,
          easing: EASE_OUT,
        })
      }

      // Words: flex swallows the literal spaces, so the column gap is one
      // measured space and the row is allowed to wrap. Same width, same face,
      // same gap as the real headline, so it breaks on the same words (one
      // line on phones too, see mobile-pass.css) and the flight lands on the
      // same shape.
      const wordEls = Array.from(title.querySelectorAll<HTMLElement>('.boot__word'))
      const probe = document.createElement('span')
      probe.className = 'boot__word'
      probe.textContent = ' '
      title.append(probe)
      const space = probe.getBoundingClientRect().width / scale
      probe.remove()
      // One line: distribute the leftover exactly as the real headline does,
      // which absorbs sub-pixel rounding that would otherwise force a wrap.
      // More than one line: a natural space, and the row wraps like the h1.
      const inked = wordEls.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0) / scale
      const fits = inked + (wordEls.length - 1) * space <= width + 0.5
      title.style.columnGap = `${fits ? Math.max(0, (width - inked) / (wordEls.length - 1)) : space}px`
      // Reveal in reading order, spread across the run.
      const gates = wordEls.map((el, k) => ({
        inner: el.querySelector<HTMLElement>('.boot__word-in'),
        at: k / wordEls.length,
        done: false,
      }))

      // ---- Ignition: nodes pop in, left to right ----
      nodeEls.forEach((el, k) => {
        play(
          el,
          [
            { opacity: 0, transform: 'translateY(8px) scale(0.86)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' },
          ],
          { duration: 520, delay: k * 70, easing: EASE_SPRING },
        )
      })
      play(
        dotCore,
        [
          { opacity: 0, transform: 'scale(0.2)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        { duration: 320, delay: 200, easing: EASE_SPRING },
      )
      play(status, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], {
        duration: 420,
        delay: 160,
        easing: EASE_OUT,
      })
      await wait(IGNITE)
      if (cancelled) return

      // ---- The run: one progress value drives cables, dot, nodes and words ----
      const x0 = xs[0]
      const x1 = xs[n - 1]
      const nodeAt = xs.map((x) => (x - x0) / (x1 - x0))
      const nodeDone = nodeEls.map(() => false)
      const succeed = (k: number) => {
        nodeDone[k] = true
        const el = nodeEls[k]
        el.classList.add('is-done')
        const badge = el.querySelector<HTMLElement>('.boot__n-check')
        if (badge) {
          play(
            badge,
            [
              { opacity: 0, transform: 'scale(0.3)' },
              { opacity: 1, transform: 'scale(1)' },
            ],
            { duration: 460, easing: EASE_SPRING },
          )
        }
        const card = el.querySelector<HTMLElement>('.boot__n-card')
        if (card) {
          play(card, [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], {
            duration: 420,
            easing: EASE_OUT,
          })
        }
      }
      succeed(0)

      await new Promise<void>((res) => {
        const start = performance.now()
        const step = (now: number) => {
          if (cancelled) return res()
          const raw = Math.min(1, (now - start) / RUN)
          const p = easeInOut(raw)
          const x = x0 + p * (x1 - x0)

          dot.style.transform = `translate3d(${x}px, ${NODE_Y}px, 0)`

          for (const c of cables) {
            const f = Math.min(1, Math.max(0, (x - c.from) / (c.to - c.from)))
            c.live.style.strokeDashoffset = `${c.len * (1 - f)}`
          }
          for (let k = 1; k < n - 1; k++) {
            if (!nodeDone[k] && p >= nodeAt[k]) succeed(k)
          }
          for (const g of gates) {
            if (!g.done && p >= g.at && g.inner) {
              g.done = true
              play(
                g.inner,
                [{ transform: 'translateY(132%)' }, { transform: 'translateY(0)' }],
                { duration: 760, easing: EASE_OUT },
              )
            }
          }

          if (raw < 1) raf = requestAnimationFrame(step)
          else res()
        }
        raf = requestAnimationFrame(step)
      })
      if (cancelled) return

      // ---- Lock: the last node succeeds, the run reports done ----
      play(dotCore, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear' })
      succeed(n - 1)
      status.classList.add('is-done')
      const label = status.querySelector<HTMLElement>('.boot__status-text')
      if (label) label.textContent = 'Ready to drive'
      await wait(LOCK)
      if (cancelled) return

      // ---- Handoff: the canvas falls away, the headline flies home ----
      play(
        canvas,
        [
          { transform: canvasTransform, opacity: 1 },
          { transform: `translate(${sx}px, ${sy + h + 104 * scale}px) scale(${scale})`, opacity: 0 },
        ],
        { duration: 420, easing: EASE_OUT },
      )
      if (t) {
        play(
          title,
          [
            { transform: restTransform },
            { transform: `translate(${t.left}px, ${t.top}px) scale(1)` },
          ],
          { duration: FLY, easing: EASE_CAMERA },
        )
      } else {
        play(title, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: EASE_OUT })
      }

      await wait(FLY - 150)
      if (cancelled) return
      release()

      await wait(150)
      if (cancelled) return
      releaseHead()
      setGone(true)
    }

    void run()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      anims.forEach((a) => a.cancel())
      release()
      releaseHead()
    }
  }, [])

  if (gone) return null

  return (
    <div className="boot" aria-hidden="true" role="presentation">
      <div className="boot__title" ref={titleRef}>
        {WORDS.map((word, i) => (
          <span className="boot__word" key={`${word}-${i}`}>
            <span className="boot__word-in">{word}</span>
          </span>
        ))}
      </div>

      <div className="boot__canvas" ref={canvasRef}>
        <svg className="boot__cables" ref={svgRef} />

        {STEPS.map((s) => (
          <span key={s.label} className={`boot__n${s.trigger ? ' boot__n--trigger' : ''}`}>
            <span className="boot__n-card">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={s.d} />
              </svg>
              <span className="boot__n-check">
                <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5l9 -10" />
                </svg>
              </span>
              <i className="boot__n-port boot__n-port--in" />
              <i className="boot__n-port boot__n-port--out" />
            </span>
            <span className="boot__n-label">{s.label}</span>
          </span>
        ))}

        <i className="boot__dot" ref={dotRef}>
          <i className="boot__dot-core" ref={dotCoreRef} />
        </i>

        <span className="boot__status" ref={statusRef}>
          <i className="boot__status-dot" />
          <span className="boot__status-text">Starting engine</span>
        </span>
      </div>
    </div>
  )
}
