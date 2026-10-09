import { useEffect, useRef } from 'react'
import { getTheme } from '@/lib/theme'
import { motionReduced } from '@/lib/a11y'

/**
 * RoadStreaks - the page background: headlight and tail-light streaks racing
 * across a dark road. Silver-white streaks travel left to right, red ones right
 * to left; thicker streaks are closer and faster (parallax). One fixed canvas
 * behind everything. Static for reduced motion.
 */

type Streak = { x: number; y: number; len: number; speed: number; thick: number; dir: 1 | -1; red: boolean; alpha: number }

export default function RoadStreaks() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let w = 0
    let h = 0
    let streaks: Streak[] = []
    let raf = 0
    let last = 0
    let dark = getTheme() === 'dark'
    const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || motionReduced()

    const make = (spread: boolean): Streak => {
      const depth = Math.random() // 0 far, 1 near
      const red = Math.random() < 0.38
      const dir: 1 | -1 = red ? -1 : 1
      const len = 60 + depth * 260 + Math.random() * 80
      return {
        x: spread ? Math.random() * (w + len) - len : dir === 1 ? -len : w + len,
        y: Math.random() * h,
        len,
        speed: 0.5 + depth * 3.2,
        thick: 0.6 + depth * 2.2,
        dir,
        red,
        alpha: 0.12 + depth * 0.34,
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.min(46, Math.max(16, Math.round((w * h) / 30000)))
      streaks = Array.from({ length: n }, () => make(true))
    }

    const draw = (dt: number, move: boolean) => {
      ctx.clearRect(0, 0, w, h)
      ctx.lineCap = 'round'
      for (const s of streaks) {
        if (move) {
          s.x += s.dir * s.speed * dt
          if ((s.dir === 1 && s.x > w + 20) || (s.dir === -1 && s.x < -s.len - 20)) Object.assign(s, make(false))
        }
        // The bright head leads in the travel direction; the tail fades behind it.
        const head = s.dir === 1 ? s.x + s.len : s.x
        const tail = s.dir === 1 ? s.x : s.x + s.len
        const g = ctx.createLinearGradient(tail, 0, head, 0)
        const rgb = s.red ? '235, 40, 48' : dark ? '226, 230, 238' : '70, 74, 84'
        const a = dark ? s.alpha : s.alpha * 0.55
        g.addColorStop(0, `rgba(${rgb}, 0)`)
        g.addColorStop(1, `rgba(${rgb}, ${a})`)
        ctx.strokeStyle = g
        ctx.lineWidth = s.thick
        ctx.beginPath()
        ctx.moveTo(tail, s.y)
        ctx.lineTo(head, s.y)
        ctx.stroke()
      }
    }

    const frame = (t: number) => {
      const dt = Math.min(3, (t - last) / 16.67 || 1)
      last = t
      draw(dt, true)
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      cancelAnimationFrame(raf)
      draw(0, false)
      if (!still()) raf = requestAnimationFrame(frame)
    }
    const onTheme = () => {
      dark = getTheme() === 'dark'
      if (still()) draw(0, false)
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
