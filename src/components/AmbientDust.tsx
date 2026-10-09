import { useEffect, useRef } from 'react'
import { getTheme } from '@/lib/theme'
import { motionReduced } from '@/lib/a11y'

/**
 * AmbientDust - the page background: fairy dust drifting slowly upward over
 * a soft pink and purple glow. Replaces the template's contour-line shader.
 * One fixed canvas behind everything; stars and specks twinkle at their own
 * pace. Static (no animation) for reduced motion.
 */

type Mote = { x: number; y: number; r: number; vy: number; sway: number; phase: number; hue: number; star: boolean; tw: number }

const LIGHT = ['#D60078', '#E83A9A', '#C8C4BC', '#4A4742', '#F5B942']
const DARK = ['#FFB08A', '#FFCBA8', '#E4DFD5', '#FFFFFF', '#FFD36B']

export default function AmbientDust() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let w = 0
    let h = 0
    let motes: Mote[] = []
    let raf = 0
    let last = 0
    let dark = getTheme() === 'dark'
    // A blurred glow is costly to paint every frame; phones get plain specks.
    const glow = !window.matchMedia('(pointer: coarse)').matches
    const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || motionReduced()

    const make = (spread: boolean): Mote => ({
      x: Math.random() * w,
      y: spread ? Math.random() * h : h + 20,
      r: 2 + Math.random() * 5,
      vy: 0.12 + Math.random() * 0.3,
      sway: 6 + Math.random() * 18,
      phase: Math.random() * Math.PI * 2,
      hue: (Math.random() * 5) | 0,
      star: Math.random() < 0.5,
      tw: 0.6 + Math.random() * 1.6,
    })

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.min(90, Math.max(28, Math.round((w * h) / 16000)))
      motes = Array.from({ length: n }, () => make(true))
    }

    const star = (x: number, y: number, r: number) => {
      ctx.beginPath()
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
        ctx.lineTo(x + Math.cos(a + Math.PI / 4) * r * 0.26, y + Math.sin(a + Math.PI / 4) * r * 0.26)
      }
      ctx.closePath()
      ctx.fill()
    }

    const draw = (t: number, dt: number, move: boolean) => {
      ctx.clearRect(0, 0, w, h)
      const palette = dark ? DARK : LIGHT
      const base = dark ? 0.75 : 0.6
      for (const m of motes) {
        if (move) {
          m.y -= m.vy * dt
          if (m.y < -20) Object.assign(m, make(false), { y: h + 20 })
        }
        const x = m.x + Math.sin(t / 1800 + m.phase) * m.sway
        const a = base * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 700 * m.tw + m.phase)))
        const col = palette[m.hue]
        ctx.globalAlpha = a
        ctx.fillStyle = col
        ctx.shadowColor = col
        ctx.shadowBlur = glow ? m.r * 2.2 : 0
        if (m.star) star(x, m.y, m.r * 1.6)
        else {
          ctx.beginPath()
          ctx.arc(x, m.y, m.r * 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
    }

    const frame = (t: number) => {
      const dt = Math.min(3, (t - last) / 16.67 || 1)
      last = t
      draw(t, dt, true)
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      cancelAnimationFrame(raf)
      draw(performance.now(), 0, false)
      if (!still()) raf = requestAnimationFrame(frame)
    }
    const onTheme = () => {
      dark = getTheme() === 'dark'
      if (still()) draw(0, 0, false)
    }
    const onVis = () => (document.hidden ? cancelAnimationFrame(raf) : start())

    resize()
    start()
    window.addEventListener('resize', resize)
    window.addEventListener('themechange', onTheme)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('themechange', onTheme)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return (
    <div className="hero-canvas ambient" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  )
}
