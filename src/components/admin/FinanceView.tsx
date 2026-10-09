import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Chart, registerables, type ChartConfiguration } from 'chart.js'
import { UploadSimple, Trash } from '@/components/slab'
import { useData } from '@/components/admin/data'
import ManualRevenue from '@/components/admin/ManualRevenue'
import { DEFAULT_STREAMS, emptyFinance, withManualRevenue, yearOf } from '@/lib/revenue'

Chart.register(...registerables)

/**
 * Finance dashboard: month strip, KPIs, charts, top clients and entry tables.
 * The figures are NOT part of the website's code (anything in the bundle is
 * public). They are imported from a JSON file after login and kept only in
 * this browser (localStorage). See the shape in `FinanceData`.
 */

type Income = { date: string; m: number; cat: string; client: string; amt: number }
type Expense = { date: string; m: number; item: string; amt: number }
export type FinanceData = {
  cats: string[]
  rev: Record<string, number[]>
  forecast: number[]
  ly25: number[]
  exp: Record<string, number[]>
  expTotal: number[]
  klpj: number[]
  nop: number[]
  annual: { year: number; forecast: number; actual: number }[]
  annualExp: { year: number; rev: number; exp: number }[]
  income: Income[]
  expenses: Expense[]
}

const KEY = 'jd-finance-data'
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MFULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKFULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const STREAM_VARS = ['--f-s1', '--f-s2', '--f-s3', '--f-s4', '--f-s5', '--f-s6']

const f0 = (n: number) => Math.round(n).toLocaleString('en-US')
const sg = (n: number) => (n > 0.5 ? '+' : n < -0.5 ? '−' : '') + f0(Math.abs(n))
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
const cls = (v: number) => (v > 0.5 ? 'is-pos' : v < -0.5 ? 'is-neg' : '')
const css = (name: string) => getComputedStyle(document.querySelector('.adm') ?? document.documentElement).getPropertyValue(name).trim()
const alpha = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  if (h.length < 6) return hex
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`
}
const cfg = (c: object) => c as unknown as ChartConfiguration

const isNumArr = (v: unknown): v is number[] => Array.isArray(v) && v.length === 12 && v.every((x) => typeof x === 'number')

/** Returns the data, or a message saying what is wrong with the file. */
export function parseFinance(raw: unknown): FinanceData | string {
  const d = raw as Partial<FinanceData> | null
  if (!d || typeof d !== 'object') return 'The file is not a JSON object.'
  if (!Array.isArray(d.cats) || !d.cats.length || !d.cats.every((c) => typeof c === 'string')) return 'Missing "cats" (the list of revenue streams).'
  if (!d.rev || !d.cats.every((c) => isNumArr(d.rev![c]))) return '"rev" needs 12 monthly numbers for every stream in "cats".'
  for (const k of ['forecast', 'ly25', 'expTotal', 'klpj', 'nop'] as const) if (!isNumArr(d[k])) return `"${k}" needs 12 monthly numbers.`
  if (!d.exp || typeof d.exp !== 'object' || !Object.values(d.exp).every(isNumArr)) return '"exp" needs 12 monthly numbers for each expense type.'
  if (!Array.isArray(d.annual) || !Array.isArray(d.annualExp)) return 'Missing "annual" or "annualExp".'
  if (!Array.isArray(d.income) || !Array.isArray(d.expenses)) return 'Missing "income" or "expenses" entries.'
  return d as FinanceData
}

function readStored(): FinanceData | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = parseFinance(JSON.parse(raw))
    return typeof p === 'string' ? null : p
  } catch {
    return null
  }
}

function useThemeTick() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const mo = new MutationObserver(() => setTick((t) => t + 1))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  return tick
}

function ChartBox({ config, label, height = 300 }: { config: ChartConfiguration; label: string; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const chart = new Chart(ref.current, config)
    return () => chart.destroy()
  }, [config])
  return (
    <div className="adm-chart" style={{ minHeight: height }}>
      <canvas ref={ref} role="img" aria-label={label} />
    </div>
  )
}

function Legend({ items }: { items: [string, string, boolean?][] }) {
  return (
    <div className="adm-legend">
      {items.map(([n, c, line]) => (
        <span key={n}><i className={line ? 'is-line' : ''} style={{ ['--c' as string]: c }} />{n}</span>
      ))}
    </div>
  )
}

export default function FinanceView() {
  const [data, setData] = useState<FinanceData | null>(readStored)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const { data: app } = useData()
  // Manual revenue works even before a finance file is imported: it starts from empty figures.
  const base = data ?? (app.revenue.length || app.expenses.length ? emptyFinance() : null)
  const merged = useMemo(() => (base ? withManualRevenue(base, app.revenue, app.expenses) : null), [base, app.revenue, app.expenses])
  const year = base ? yearOf(base) : new Date().getFullYear()
  // The month filter starts at the latest month with revenue, so a new entry in a later month shows up straight away.
  const lastMonth = merged ? Math.max(0, ...Array.from({ length: 12 }, (_, i) => (merged.data.cats.reduce((t, c) => t + merged.data.rev[c][i], 0) > 0 ? i + 1 : 0))) : 0

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const parsed = parseFinance(JSON.parse(await file.text()))
      if (typeof parsed === 'string') { setMsg(parsed); return }
      try { localStorage.setItem(KEY, JSON.stringify(parsed)) } catch { setMsg('Loaded, but this browser would not keep it. It will be gone when you close the page.') }
      setData(parsed)
      if (!msg.startsWith('Loaded')) setMsg('')
    } catch {
      setMsg('That file could not be read as JSON.')
    }
  }
  const clear = () => {
    try { localStorage.removeItem(KEY) } catch { /* ignore */ }
    setData(null)
    setMsg('')
  }

  const importBar = (
    <div className="adm-actions">
      <button type="button" className="adm-btn" onClick={() => fileRef.current?.click()}><UploadSimple size={15} aria-hidden="true" /> {data ? 'Import new data' : 'Import finance data'}</button>
      {data && <button type="button" className="adm-btn adm-btn--ghost" onClick={clear}><Trash size={15} aria-hidden="true" /> Remove data from this browser</button>}
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
    </div>
  )

  if (!merged) {
    return (
      <div className="adm-stack">
        <ManualRevenue streams={DEFAULT_STREAMS} year={year} skipped={0} />
        <section className="adm-panel">
          <h2>Finance data</h2>
          <p className="adm-note" style={{ marginBottom: 12 }}>
            No figures are stored on the website, because anything in a website&rsquo;s code can be downloaded by visitors. Import your finance JSON file here and it stays in this browser only.
            The file needs: <code>cats</code>, <code>rev</code>, <code>forecast</code>, <code>ly25</code>, <code>exp</code>, <code>expTotal</code>, <code>klpj</code>, <code>nop</code>, <code>annual</code>, <code>annualExp</code>, <code>income</code> and <code>expenses</code>.
          </p>
          {importBar}
          {msg && <p className="adm-error" role="alert" style={{ marginTop: 12 }}>{msg}</p>}
        </section>
      </div>
    )
  }
  return (
    <div className="adm-stack">
      <ManualRevenue streams={merged.data.cats} year={year} skipped={merged.skipped} />
      <FinanceBody key={`${merged.data.cats.join('|')}:${lastMonth}`} data={merged.data} importBar={importBar} msg={msg} />
    </div>
  )
}

function FinanceBody({ data: D, importBar, msg }: { data: FinanceData; importBar: React.ReactNode; msg: string }) {
  const tick = useThemeTick()
  const CATS = D.cats
  const revAll = (i: number) => sum(CATS.map((c) => D.rev[c][i]))
  const reported = useMemo(() => {
    let last = 0
    for (let i = 0; i < 12; i++) if (CATS.reduce((s, c) => s + D.rev[c][i], 0) > 0) last = i + 1
    return Math.max(1, last)
  }, [D, CATS])

  const [sel, setSel] = useState<Set<number>>(() => new Set(Array.from({ length: reported }, (_, i) => i)))
  const [cats, setCats] = useState<Set<string>>(() => new Set(CATS))
  const [metric, setMetric] = useState<'revenue' | 'expenses' | 'net'>('revenue')
  const [tab, setTab] = useState<'income' | 'expense'>('income')
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState(1)
  const [q, setQ] = useState('')

  const ms = useMemo(() => [...sel].sort((a, b) => a - b), [sel])
  const full = cats.size === CATS.length
  const revSel = (i: number) => sum(CATS.filter((c) => cats.has(c)).map((c) => D.rev[c][i]))
  const streamColor = (c: string) => css(STREAM_VARS[CATS.indexOf(c) % STREAM_VARS.length])
  const toggleMonth = (i: number) => setSel((s) => { const n = new Set(s); if (n.has(i)) { if (n.size > 1) n.delete(i) } else n.add(i); return n })

  const nameOf = (list: number[]) => {
    if (!list.length) return 'No months'
    const runs: [number, number][] = []
    let s = list[0], p = list[0]
    for (let i = 1; i <= list.length; i++) { if (list[i] !== p + 1) { runs.push([s, p]); s = list[i] } p = list[i] }
    return runs.map(([a, b]) => (a === b ? MN[a] : b === a + 1 ? `${MN[a]}, ${MN[b]}` : `${MN[a]} to ${MN[b]}`)).join(', ')
  }

  const quick: [string, number[]][] = [
    ['Year to date', Array.from({ length: reported }, (_, i) => i)],
    ['Q1', [0, 1, 2]], ['Q2', [3, 4, 5]], ['Q3', [6, 7, 8]], ['Q4', [9, 10, 11]],
  ].map(([n, m]) => [n as string, (m as number[]).filter((i) => i < reported)] as [string, number[]]).filter(([, m]) => m.length)
  const selKey = ms.join(',')

  /* ---- KPIs ---- */
  const k = useMemo(() => {
    const rev = sum(ms.map(revSel)), revT = sum(ms.map(revAll))
    const fc = sum(ms.map((i) => D.forecast[i])), ly = sum(ms.map((i) => D.ly25[i]))
    const ex = sum(ms.map((i) => D.expTotal[i])), kl = sum(ms.map((i) => D.klpj[i])), nop = sum(ms.map((i) => D.nop[i]))
    return { rev, revT, fc, ly, ex, kl, nop }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, cats, D])
  const beat = ms.filter((i) => revAll(i) >= D.forecast[i]).length
  const best = ms.reduce((a, i) => (revAll(i) > revAll(a) ? i : a), ms[0])
  const bestN = ms.reduce((a, i) => (D.nop[i] > D.nop[a] ? i : a), ms[0])

  /* ---- chart configs ---- */
  const base = (extra: object = {}) => {
    const muted = css('--a-muted'), line = css('--a-line')
    return {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: css('--a-ink'), titleColor: css('--a-bg'), bodyColor: css('--a-bg'), padding: 10, cornerRadius: 8 } },
      scales: {
        x: { grid: { display: false }, ticks: { color: muted }, border: { color: line } },
        y: { grid: { color: line }, ticks: { color: muted, callback: (v: number | string) => f0(Number(v)) }, border: { display: false } },
      },
      ...extra,
    }
  }
  const tooltipWith = (label: (c: { dataset: { label?: string }; parsed: { x: number; y: number }; dataIndex: number }) => string, extra: object = {}) => ({
    backgroundColor: css('--a-ink'), titleColor: css('--a-bg'), bodyColor: css('--a-bg'), padding: 10, cornerRadius: 8, callbacks: { label }, ...extra,
  })

  const idx12 = Array.from({ length: 12 }, (_, i) => i)
  const bar = css('--f-bar')

  const mainCfg = useMemo(() => {
    const pos = css('--f-pos'), neg = css('--f-neg'), muted = css('--a-muted'), tgt = css('--f-s3')
    let vals: (number | null)[], colors: string[], lines: object[] = []
    if (metric === 'revenue') {
      vals = idx12.map((i) => (i < reported ? revSel(i) : null))
      colors = idx12.map((i) => (sel.has(i) ? bar : alpha(bar, 0.22)))
      if (full) lines = [
        { type: 'line', label: 'Target', data: D.forecast, borderColor: tgt, borderDash: [6, 4], borderWidth: 2, pointRadius: 3, pointBackgroundColor: tgt, tension: 0, order: 0 },
        { type: 'line', label: 'Same month 2025', data: D.ly25, borderColor: muted, borderWidth: 2, pointRadius: 2, pointBackgroundColor: muted, tension: 0, order: 0 },
      ]
    } else if (metric === 'expenses') {
      vals = idx12.map((i) => (i < reported ? D.expTotal[i] : null))
      colors = idx12.map((i) => (sel.has(i) ? neg : alpha(neg, 0.28)))
    } else {
      vals = idx12.map((i) => (i < reported ? D.nop[i] : null))
      colors = idx12.map((i) => { const c = D.nop[i] >= 0 ? pos : neg; return sel.has(i) ? c : alpha(c, 0.3) })
    }
    return cfg({
      type: 'bar',
      data: { labels: MN, datasets: [{ type: 'bar', label: metric === 'revenue' ? 'Revenue' : metric === 'expenses' ? 'Expenses' : 'Net profit', data: vals, backgroundColor: colors, borderRadius: 4, maxBarThickness: 44, order: 1 }, ...lines] },
      options: base({
        interaction: { mode: 'index', intersect: false },
        onClick: (e: unknown, _els: unknown, chart: Chart) => {
          const pts = chart.getElementsAtEventForMode(e as Event, 'index', { intersect: false }, true)
          if (pts.length && pts[0].index < reported) toggleMonth(pts[0].index)
        },
        plugins: { legend: { display: false }, tooltip: tooltipWith((c) => `${c.dataset.label}: ${c.parsed.y == null ? '–' : f0(c.parsed.y)}`) },
      }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D, sel, cats, metric, tick])

  const walkCfg = useMemo(() => {
    const R = sum(ms.map(revAll)), E = sum(ms.map((i) => D.expTotal[i])), K = sum(ms.map((i) => D.klpj[i])), G = R - E, N = G - K
    const pos = css('--f-pos'), neg = css('--f-neg')
    const data = [[0, R], [Math.min(G, R), Math.max(G, R)], [Math.min(0, G), Math.max(0, G)], [Math.min(N, G), Math.max(N, G)], [Math.min(0, N), Math.max(0, N)]]
    const real = [R, -E, G, -K, N]
    const muted = css('--a-muted'), line = css('--a-line')
    return cfg({
      type: 'bar',
      data: { labels: ['Revenue', 'Expenses', 'Gross operating profit', 'KLPJ and salary', 'Net operating profit'], datasets: [{ data, backgroundColor: [bar, neg, G >= 0 ? pos : neg, neg, N >= 0 ? pos : neg], borderRadius: 4, barPercentage: 0.7 }] },
      options: base({
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: tooltipWith((c) => sg(real[c.dataIndex])) },
        scales: { x: { grid: { color: line }, ticks: { color: muted, maxRotation: 0, maxTicksLimit: 5, callback: (v: number | string) => f0(Number(v)) }, border: { display: false } }, y: { grid: { display: false }, ticks: { color: muted }, border: { color: line } } },
      }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D, ms, tick])

  const activeCats = CATS.filter((c) => cats.has(c))
  const mixCfg = useMemo(() => {
    const months = Array.from({ length: reported }, (_, i) => i)
    const muted = css('--a-muted'), line = css('--a-line')
    return cfg({
      type: 'bar',
      data: { labels: months.map((i) => MN[i]), datasets: activeCats.map((c) => ({ label: c, data: months.map((i) => D.rev[c][i]), backgroundColor: months.map((i) => (sel.has(i) ? streamColor(c) : alpha(streamColor(c), 0.28))), borderRadius: 2, maxBarThickness: 48 })) },
      options: base({
        scales: { x: { stacked: true, grid: { display: false }, ticks: { color: muted }, border: { color: line } }, y: { stacked: true, grid: { color: line }, ticks: { color: muted, callback: (v: number | string) => f0(Number(v)) }, border: { display: false } } },
        plugins: { legend: { display: false }, tooltip: tooltipWith((c) => `${c.dataset.label}: ${f0(c.parsed.y)}`, { mode: 'index', intersect: false }) },
      }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D, sel, cats, tick, reported])

  const expKeys = Object.keys(D.exp)
  const costCfg = useMemo(() => {
    const vals = expKeys.map((key) => sum(ms.map((i) => D.exp[key][i])))
    const muted = css('--a-muted'), line = css('--a-line')
    return cfg({
      type: 'bar',
      data: { labels: expKeys, datasets: [{ data: vals, backgroundColor: css('--f-neg'), borderRadius: 4, barPercentage: 0.65 }] },
      options: base({
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: tooltipWith((c) => f0(c.parsed.x)) },
        scales: { x: { grid: { color: line }, ticks: { color: muted, maxRotation: 0, maxTicksLimit: 5, callback: (v: number | string) => f0(Number(v)) }, border: { display: false } }, y: { grid: { display: false }, ticks: { color: muted }, border: { color: line } } },
      }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D, ms, tick])
  const topExp = D.expenses.filter((e) => sel.has(e.m)).sort((a, b) => b.amt - a.amt).slice(0, 5)

  const inc = useMemo(() => D.income.filter((x) => sel.has(x.m) && cats.has(x.cat)), [D, sel, cats])
  const dailyCfg = useMemo(() => {
    const days = [...new Set(inc.map((x) => x.date))].sort()
    const lab = days.map((d) => { const t = new Date(`${d}T00:00:00`); return `${t.getDate()} ${MN[t.getMonth()]}` })
    const muted = css('--a-muted'), line = css('--a-line')
    return cfg({
      type: 'bar',
      data: { labels: lab, datasets: activeCats.map((c) => ({ label: c, data: days.map((d) => sum(inc.filter((x) => x.date === d && x.cat === c).map((x) => x.amt))), backgroundColor: streamColor(c), borderRadius: 1 })) },
      options: base({
        scales: { x: { stacked: true, grid: { display: false }, ticks: { color: muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 14 }, border: { color: line } }, y: { stacked: true, grid: { color: line }, ticks: { color: muted, callback: (v: number | string) => f0(Number(v)) }, border: { display: false } } },
        plugins: { legend: { display: false }, tooltip: tooltipWith((c) => (c.parsed.y ? `${c.dataset.label}: ${f0(c.parsed.y)}` : ''), { mode: 'index', intersect: false }) },
      }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inc, cats, tick])

  const weekCfg = useMemo(() => {
    const tot = Array(7).fill(0) as number[]
    const dset = Array.from({ length: 7 }, () => new Set<string>())
    inc.forEach((x) => { const d = new Date(`${x.date}T00:00:00`).getDay(); tot[d] += x.amt; dset[d].add(x.date) })
    const mx = Math.max(...tot)
    return cfg({
      type: 'bar',
      data: { labels: WEEK, datasets: [{ data: tot, backgroundColor: tot.map((v) => (v === mx && mx > 0 ? bar : alpha(bar, 0.45))), borderRadius: 4, maxBarThickness: 36 }] },
      options: base({ plugins: { legend: { display: false }, tooltip: tooltipWith((c) => `${f0(c.parsed.y)} over ${dset[c.dataIndex].size} trading day${dset[c.dataIndex].size === 1 ? '' : 's'}`) } }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inc, tick])

  const pace = useMemo(() => {
    const cum = (a: number[]) => { let t = 0; return a.map((v) => { t += v; return Math.round(t * 100) / 100 }) }
    const rev = cum(idx12.map((i) => (i < reported ? revAll(i) : 0))).map((v, i) => (i < reported ? v : null))
    const tgt = cum(D.forecast), ly = cum(D.ly25)
    return { rev, tgt, ly }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D, reported])
  const paceCfg = useMemo(() => {
    const tgt = css('--f-s3'), muted = css('--a-muted')
    return cfg({
      type: 'line',
      data: { labels: MN, datasets: [
        { label: 'Revenue', data: pace.rev, borderColor: bar, backgroundColor: bar, borderWidth: 3, pointRadius: 3, tension: 0 },
        { label: 'Target', data: pace.tgt, borderColor: tgt, borderDash: [6, 4], borderWidth: 2, pointRadius: 2, pointBackgroundColor: tgt, tension: 0 },
        { label: '2025', data: pace.ly, borderColor: muted, borderWidth: 2, pointRadius: 0, tension: 0 },
      ] },
      options: base({ interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: tooltipWith((c) => (c.parsed.y == null ? '' : `${c.dataset.label}: ${f0(c.parsed.y)}`), { mode: 'index', intersect: false }) } }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pace, tick])
  const lastP = reported - 1
  const paceGap = (pace.rev[lastP] ?? 0) - pace.tgt[lastP]
  const paceVs = pace.ly[lastP] ? (((pace.rev[lastP] ?? 0) - pace.ly[lastP]) / pace.ly[lastP]) * 100 : null

  const yearsCfg = useMemo(() => {
    const A = D.annual.filter((a) => a.year >= (D.annualExp[0]?.year ?? 0))
    const labels = A.map((a) => String(a.year))
    const ex = labels.map((y) => D.annualExp.find((e) => String(e.year) === y)?.exp ?? null)
    const tgt = css('--f-s3')
    return cfg({
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Revenue', data: A.map((a) => a.actual), backgroundColor: bar, borderRadius: 4, maxBarThickness: 34 },
        { label: 'Expenses', data: ex, backgroundColor: css('--f-neg'), borderRadius: 4, maxBarThickness: 34 },
        { type: 'line', label: 'Target', data: A.map((a) => a.forecast || null), borderColor: tgt, borderDash: [6, 4], borderWidth: 2, pointRadius: 3, pointBackgroundColor: tgt },
      ] },
      options: base({ plugins: { legend: { display: false }, tooltip: tooltipWith((c) => `${c.dataset.label}: ${c.parsed.y == null ? '–' : f0(c.parsed.y)}`, { mode: 'index', intersect: false }) } }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D, tick])

  /* ---- clients ---- */
  const clients = useMemo(() => {
    const map: Record<string, { name: string; amt: number; n: number; cats: Record<string, number> }> = {}
    inc.forEach((x) => {
      const raw = x.client || 'Unnamed', key = raw.toLowerCase()
      const o = (map[key] ??= { name: raw.charAt(0).toUpperCase() + raw.slice(1), amt: 0, n: 0, cats: {} })
      o.amt += x.amt; o.n += 1; o.cats[x.cat] = (o.cats[x.cat] || 0) + x.amt
    })
    return Object.values(map).sort((a, b) => b.amt - a.amt)
  }, [inc])
  const incTotal = sum(inc.map((x) => x.amt))

  /* ---- insights ---- */
  const insights = useMemo(() => {
    const out: string[] = []
    const revT = sum(ms.map(revAll))
    const gaps = ms.map((i) => [i, revAll(i) - D.forecast[i]] as const).sort((a, b) => a[1] - b[1])
    out.push(`${beat} of ${ms.length} month${ms.length === 1 ? '' : 's'} beat the revenue target. ${gaps[0][1] >= 0 ? 'Smallest cushion' : 'Biggest shortfall'}: ${MFULL[gaps[0][0]]} at ${sg(gaps[0][1])}.`)
    const L = sum(ms.map((i) => D.ly25[i]))
    if (L > 0) out.push(`Revenue is ${sg(((revT - L) / L) * 100)}% against the same months of 2025 (${f0(revT)} now, ${f0(L)} then).`)
    const byCat = CATS.map((c) => [c, sum(ms.map((i) => D.rev[c][i]))] as const).sort((a, b) => b[1] - a[1])
    if (revT > 0) out.push(`${byCat[0][0]} brings in ${f0((byCat[0][1] / revT) * 100)}% of revenue${byCat[1] && byCat[1][1] > 0 ? `, then ${byCat[1][0]} at ${f0((byCat[1][1] / revT) * 100)}%` : ''}.`)
    const named = clients.filter((c) => c.name !== 'Unnamed')
    if (named.length > 1 && incTotal > 0) out.push(`Your top two clients, ${named[0].name} and ${named[1].name}, make up ${f0(((named[0].amt + named[1].amt) / incTotal) * 100)}% of takings.`)
    const mg = ms.filter((i) => revAll(i) > 0).map((i) => [i, (D.nop[i] / revAll(i)) * 100] as const).sort((a, b) => b[1] - a[1])
    const nopT = sum(ms.map((i) => D.nop[i])), pc = (v: number) => (v < 0 ? '−' : '') + f0(Math.abs(v)) + '%'
    if (revT > 0 && mg.length) out.push(`Net margin is ${pc((nopT / revT) * 100)} overall. Best month: ${MFULL[mg[0][0]]} at ${pc(mg[0][1])}${mg.length > 1 ? `, weakest: ${MFULL[mg[mg.length - 1][0]]} at ${pc(mg[mg.length - 1][1])}` : ''}.`)
    const exs = D.expenses.filter((x) => sel.has(x.m)).sort((a, b) => b.amt - a.amt), exT = sum(ms.map((i) => D.expTotal[i]))
    if (exs.length && exT > 0) out.push(`Biggest single expense: ${exs[0].item} at ${f0(exs[0].amt)}, ${f0((exs[0].amt / exT) * 100)}% of all expenses.`)
    const wt = Array(7).fill(0) as number[]
    inc.forEach((x) => { wt[new Date(`${x.date}T00:00:00`).getDay()] += x.amt })
    const bw = wt.indexOf(Math.max(...wt))
    if (incTotal > 0) out.push(`${WEEKFULL[bw]} is your strongest day of the week at ${f0((wt[bw] / incTotal) * 100)}% of takings.`)
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D, ms, sel, inc, clients])

  /* ---- table ---- */
  type Row = { date: string; cat?: string; client?: string; item?: string; amt: number; _d?: string }
  const cols: [string, string, boolean?][] = tab === 'income' ? [['date', 'Date'], ['cat', 'Stream'], ['client', 'Client / venue'], ['amt', 'Amount', true]] : [['date', 'Date'], ['item', 'Item'], ['amt', 'Amount', true]]
  const rows = useMemo(() => {
    let r: Row[] = tab === 'income'
      ? inc.map((x) => ({ date: x.date, cat: x.cat, client: x.client || 'Unnamed', amt: x.amt }))
      : D.expenses.filter((x) => sel.has(x.m)).map((x) => ({ date: x.date || `${MN[x.m]} (month-end)`, item: x.item, amt: x.amt, _d: x.date || `2026-${String(x.m + 1).padStart(2, '0')}-99` }))
    if (q) r = r.filter((x) => Object.values(x).join(' ').toLowerCase().includes(q))
    const key = (x: Row) => (sortKey === 'date' && x._d ? x._d : (x as Record<string, string | number | undefined>)[sortKey])
    return r.sort((a, b) => { const x = key(a), y = key(b); return (typeof x === 'number' ? x - (y as number) : String(x ?? '').localeCompare(String(y ?? ''))) * sortDir })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D, sel, inc, tab, q, sortKey, sortDir])
  const fmtDate = (d: string) => (/^\d{4}-/.test(d) && !d.endsWith('-99') ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : d)
  const sortBy = (key: string) => { if (sortKey === key) setSortDir((d) => -d); else { setSortKey(key); setSortDir(key === 'amt' ? -1 : 1) } }

  const mx = Math.max(...idx12.map((i) => Math.max(revAll(i), D.forecast[i])), 1)

  return (
    <div className="adm-stack adm-fin">
      <section className="adm-panel">
        <div className="adm-fin__top">
          <div>
            <h2 style={{ marginBottom: 2 }}>Finance</h2>
            <p className="adm-note">{nameOf(ms)}. Figures live in this browser only. Amounts are as recorded in your workbook.</p>
          </div>
          {importBar}
        </div>
        {msg && <p className="adm-banner" role="status" style={{ marginTop: 10 }}>{msg}</p>}
      </section>

      <section aria-label="Month selector" className="adm-stack" style={{ gap: 12 }}>
        <div className="adm-strip">
          <div className="adm-frames" role="group" aria-label="Months">
            {MN.map((m, i) => {
              const rep = i < reported
              return (
                <button key={m} type="button" className="adm-frame" disabled={!rep} aria-pressed={sel.has(i)} onClick={() => rep && toggleMonth(i)}
                  aria-label={rep ? `${MFULL[i]}: revenue ${f0(revAll(i))}, target ${f0(D.forecast[i])}` : `${MFULL[i]}: no sales logged yet, target ${f0(D.forecast[i])}`}>
                  <span className="adm-frame__mn">{m}</span>
                  <span className="adm-frame__plot"><span className="adm-frame__b" style={{ height: rep ? Math.max(2, (revAll(i) / mx) * 46) : 0 }} /><span className="adm-frame__t" style={{ bottom: (D.forecast[i] / mx) * 46 }} /></span>
                  <span className="adm-frame__v">{rep ? f0(revAll(i)) : '–'}</span>
                  <span className="adm-frame__n">target {f0(D.forecast[i])}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="adm-toolbar">
          <div className="adm-seg" role="group" aria-label="Quick ranges">
            {quick.map(([n, m]) => <button key={n} type="button" aria-pressed={m.join(',') === selKey} onClick={() => setSel(new Set(m))}>{n}</button>)}
          </div>
          <span className="adm-note">Revenue streams</span>
          <div className="adm-chips" role="group" aria-label="Revenue streams">
            {CATS.map((c) => (
              <button key={c} type="button" className={cats.has(c) ? 'is-on' : ''} aria-pressed={cats.has(c)} style={{ ['--c' as string]: streamColor(c) }}
                onClick={() => setCats((s) => { const n = new Set(s); if (n.has(c)) { if (n.size > 1) n.delete(c) } else n.add(c); return n })}>
                <i className="adm-dot" />{c}
              </button>
            ))}
          </div>
        </div>
        <p className="adm-note" aria-live="polite">
          <b>{nameOf(ms)}.</b> {beat} of {ms.length} month{ms.length > 1 ? 's' : ''} beat the revenue target. Strongest revenue month was <b>{MFULL[best]}</b> at {f0(revAll(best))}; best profit month was <b>{MFULL[bestN]}</b> at {f0(D.nop[bestN])}.
        </p>
      </section>

      <div className="adm-cards" aria-label="Key figures">
        <div className="adm-card adm-card--static"><b>{f0(k.rev)}</b><span>Revenue{full ? '' : ' (selected streams)'}</span></div>
        <div className="adm-card adm-card--static"><b className={full ? cls(k.revT - k.fc) : ''}>{full ? sg(k.revT - k.fc) : 'n/a'}</b><span>{full ? `Against target (${f0(k.fc)})` : 'Targets cover all streams'}</span></div>
        <div className="adm-card adm-card--static"><b className={full ? cls(k.revT - k.ly) : ''}>{full ? sg(k.revT - k.ly) : 'n/a'}</b><span>{full ? `Against 2025 (${f0(k.ly)})` : 'Turn all streams on'}</span></div>
        <div className="adm-card adm-card--static"><b>{f0(k.ex)}</b><span>Expenses{k.revT ? `, ${f0((k.ex / k.revT) * 100)}% of revenue` : ''}</span></div>
        <div className="adm-card adm-card--static"><b>{f0(k.kl)}</b><span>KLPJ and salary</span></div>
        <div className="adm-card adm-card--static"><b className={cls(k.nop)}>{sg(k.nop)}</b><span>Net operating profit{k.revT ? `, ${f0((k.nop / k.revT) * 100)}%` : ''}</span></div>
      </div>

      <div className="adm-fgrid">
        <section className="adm-panel adm-fc8">
          <div className="adm-ph"><h2>Month by month</h2>
            <div className="adm-seg" role="group" aria-label="Metric">
              {(['revenue', 'expenses', 'net'] as const).map((m) => <button key={m} type="button" aria-pressed={metric === m} onClick={() => setMetric(m)}>{m === 'net' ? 'Net profit' : m === 'revenue' ? 'Revenue' : 'Expenses'}</button>)}
            </div>
          </div>
          <ChartBox config={mainCfg} label="Monthly bar chart" height={330} />
          <Legend items={metric === 'revenue' ? [['Selected months', bar], ['Other months', alpha(bar, 0.3)], ...(full ? [['Target', css('--f-s3'), true], ['Same month 2025', css('--a-muted'), true]] as [string, string, boolean][] : [])] : metric === 'expenses' ? [['Selected', css('--f-neg')]] : [['Profit', css('--f-pos')], ['Loss', css('--f-neg')]]} />
          <p className="adm-note">Click a bar to add or remove that month.</p>
        </section>
        <section className="adm-panel adm-fc4">
          <div className="adm-ph"><h2>Profit walk</h2><span className="adm-note">Selected months</span></div>
          <ChartBox config={walkCfg} label="Revenue to net operating profit" height={330} />
        </section>

        <section className="adm-panel adm-fc7">
          <div className="adm-ph"><h2>Revenue by stream</h2></div>
          <ChartBox config={mixCfg} label="Stacked revenue by stream" />
          <Legend items={activeCats.map((c) => [c, streamColor(c)])} />
        </section>
        <section className="adm-panel adm-fc5">
          <div className="adm-ph"><h2>Where the money goes</h2><span className="adm-note">Selected months</span></div>
          <ChartBox config={costCfg} label="Expense types" height={230} />
          {topExp.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p className="adm-note">Largest single expenses</p>
              {topExp.map((e, i) => <div className="adm-toprow" key={i}><span>{e.item}</span><span>{f0(e.amt)}</span></div>)}
            </div>
          )}
        </section>

        <section className="adm-panel adm-fc8">
          <div className="adm-ph"><h2>Daily takings</h2><span className="adm-note">Only days with sales</span></div>
          <ChartBox config={dailyCfg} label="Daily revenue" />
        </section>
        <section className="adm-panel adm-fc4">
          <div className="adm-ph"><h2>Busiest weekdays</h2></div>
          <ChartBox config={weekCfg} label="Revenue by weekday" />
        </section>

        <section className="adm-panel adm-fc7">
          <div className="adm-ph"><h2>Pace against target</h2><span className="adm-note">{sg(paceGap)} against target so far{paceVs == null ? '' : `, ${sg(paceVs)}% on 2025`}</span></div>
          <ChartBox config={paceCfg} label="Running revenue against target and 2025" />
          <Legend items={[['Revenue, all streams', bar], ['Target', css('--f-s3'), true], ['2025', css('--a-muted'), true]]} />
        </section>
        <section className="adm-panel adm-fc5">
          <div className="adm-ph"><h2>What stands out</h2><span className="adm-note">Selected months</span></div>
          <ul className="adm-ins">{insights.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </section>

        <section className="adm-panel adm-fc5">
          <div className="adm-ph"><h2>Top clients and venues</h2><span className="adm-note">By revenue</span></div>
          {clients.length === 0 ? <p className="adm-empty">No sales in this selection.</p> : clients.slice(0, 9).map((r) => {
            const main = Object.entries(r.cats).sort((a, b) => b[1] - a[1])[0][0]
            return (
              <div className="adm-client" key={r.name}>
                <div className="adm-toprow"><span>{r.name} <small>{r.n} booking{r.n > 1 ? 's' : ''}</small></span><span>{f0(r.amt)} <small>{incTotal ? f0((r.amt / incTotal) * 100) : 0}%</small></span></div>
                <div className="adm-meter"><span style={{ width: `${(r.amt / clients[0].amt) * 100}%`, background: streamColor(main) }} /></div>
              </div>
            )
          })}
        </section>
        <section className="adm-panel adm-fc7">
          <div className="adm-ph"><h2>Years</h2><span className="adm-note">Full-year revenue against target, and against expenses</span></div>
          <ChartBox config={yearsCfg} label="Annual revenue and expenses" />
          <Legend items={[['Revenue', bar], ['Expenses', css('--f-neg')], ['Target', css('--f-s3'), true]]} />
        </section>
      </div>

      <section className="adm-panel">
        <div className="adm-ph">
          <div className="adm-seg" role="group" aria-label="Table">
            <button type="button" aria-pressed={tab === 'income'} onClick={() => { setTab('income'); setSortKey('date'); setSortDir(1) }}>Income entries</button>
            <button type="button" aria-pressed={tab === 'expense'} onClick={() => { setTab('expense'); setSortKey('date'); setSortDir(1) }}>Expense entries</button>
          </div>
          <label className="adm-search"><input type="search" placeholder="Search client, item or stream" aria-label="Search entries" value={q} onChange={(e) => setQ(e.target.value.trim().toLowerCase())} /></label>
        </div>
        {rows.length ? (
          <div className="adm-tablewrap">
            <table className="adm-table">
              <thead><tr>{cols.map(([c, l, num]) => (
                <th key={c} className={num ? 'is-num' : ''} aria-sort={sortKey === c ? (sortDir > 0 ? 'ascending' : 'descending') : undefined} onClick={() => sortBy(c)} style={{ cursor: 'pointer' }}>{l}{sortKey === c ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}</th>
              ))}</tr></thead>
              <tbody>{rows.slice(0, 250).map((r, i) => (
                <tr key={i}>{cols.map(([c, l, num]) => c === 'date' ? <td key={c} data-label={l}>{fmtDate(r.date)}</td>
                  : c === 'cat' ? <td key={c} data-label={l}><i className="adm-dot" style={{ ['--c' as string]: streamColor(r.cat ?? '') }} />{r.cat}</td>
                  : c === 'amt' ? <td key={c} className="is-num" data-label={l}>{f0(r.amt)}</td>
                  : <td key={c} data-label={l} className={num ? 'is-num' : ''}>{(r as Record<string, string | number | undefined>)[c]}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="adm-empty">Nothing matches. Clear the search or pick more months.</p>}
        <p className="adm-note" style={{ marginTop: 8 }}>{rows.length} entr{rows.length === 1 ? 'y' : 'ies'}, total {f0(sum(rows.map((r) => r.amt)))}{rows.length > 250 ? '. Showing the first 250.' : ''}</p>
      </section>
    </div>
  )
}
