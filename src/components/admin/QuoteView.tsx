import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus, FileText } from '@/components/slab'
import { HANDOFF_KEY } from '@/components/InvoiceStudio'
import { useData } from '@/components/admin/data'
import { knownNames } from '@/lib/revenue'

/**
 * Quotation builder: price a job, see profit and margin before sending it,
 * copy a client quote, and keep a list of saved quotes in this browser.
 * Amounts are KD. The percentage fees come out of the price.
 */

/** `per: 'unit'` costs are multiplied by the quantity (ink per print); the rest are charged once. */
type Line = { label: string; amt: number; per?: 'unit' }
type Preset = { name: string; price: number; lines: Line[]; note: string; qty?: number; unit?: string; fees?: number[] }
type Saved = { qty?: number; unit?: string; id: string; name: string; at: number; preset: string; price: number; lines: Line[]; fees: number[]; target: number; client: string; date: string; desc: string; valid: string }

const PRESETS: Record<string, Preset> = {
  prod: { name: 'Production shoot', price: 250, note: 'Costs from the client quote sheet: price 250, total cost 205, profit 45.', lines: [['Payroll main shooter', 35], ['Photo shooter', 35], ['Assistant', 25], ['Booth operator', 25], ['Transport', 10], ['Misc', 15], ['Camera rent / lens', 10]].map(([label, amt]) => ({ label: label as string, amt: amt as number })) },
  event: { name: 'Event or product shoot', price: 100, note: 'Costs from the template in the production quotation sheet: price 100, total cost 85, profit 15.', lines: [['Payroll main shooter', 20], ['Transport', 10], ['Booth operator', 15], ['Misc', 10], ['Cake', 10]].map(([label, amt]) => ({ label: label as string, amt: amt as number })) },
  head: {
    name: 'Per head or per piece job', price: 1, qty: 45, unit: 'head', fees: [0, 0, 0],
    note: 'Per-head costing: quantity x price per head, per-unit costs (paper, ink, cutter) multiply by the quantity, fixed costs count once.',
    lines: [{ label: 'Transport', amt: 2.5 }, { label: 'Photo paper per print', amt: 0.12, per: 'unit' }, { label: 'Ink per print', amt: 0.045, per: 'unit' }, { label: 'Master cutter per print', amt: 0.00625, per: 'unit' }, { label: 'Subscription share', amt: 4 }, { label: 'Venue', amt: 7.5 }, { label: 'Manning', amt: 0 }, { label: 'Frame', amt: 0 }, { label: 'Folder', amt: 0 }],
  },
  blank: { name: '', price: 0, note: 'Start from nothing. The three percentage fees still apply.', lines: [{ label: '', amt: 0 }] },
}
const PRESET_LABEL: Record<string, string> = { prod: 'Production shoot', event: 'Event or product', head: 'Per head', blank: 'Blank' }
const UNITS = ['head', 'pcs', 'hour', 'day', 'job']
const FEE_NAMES = ['KLPJ', 'JP royalty fee', 'MFees']
const DEFAULT_FEES = [10, 5, 5]
const CREW = /payroll|shooter|assistant|operator|editor|photog|\bvo\b/i
const SV_KEY = 'jd-quotes'

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
const fm = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const kd = (n: number) => (n < -0.004 ? '−' : '') + 'KD ' + fm(n)
const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

const readSaved = (): Saved[] | null => {
  try { const a = JSON.parse(localStorage.getItem(SV_KEY) || '[]'); return Array.isArray(a) ? a : [] } catch { return null }
}
const writeSaved = (a: Saved[]) => { try { localStorage.setItem(SV_KEY, JSON.stringify(a)); return true } catch { return false } }

export default function QuoteView() {
  const navigate = useNavigate()
  const { add } = useData()
  const names = useMemo(knownNames, [])
  const [fin, setFin] = useState({ open: false, date: inDays(0), stream: names.streams[0], type: names.expenseTypes.includes('Miscellaneous') ? 'Miscellaneous' : names.expenseTypes[0], rev: true, exp: true, busy: false })
  const [preset, setPreset] = useState('prod')
  const [price, setPrice] = useState(PRESETS.prod.price) // price per unit; the client pays price x quantity
  const [qty, setQty] = useState(1)
  const [unit, setUnit] = useState('head')
  const [lines, setLines] = useState<Line[]>(PRESETS.prod.lines.map((l) => ({ ...l })))
  const [fees, setFees] = useState<number[]>(DEFAULT_FEES)
  const [target, setTarget] = useState(15)
  const [client, setClient] = useState('')
  const [date, setDate] = useState('')
  const [desc, setDesc] = useState('')
  const [valid, setValid] = useState(() => inDays(14))
  const [svName, setSvName] = useState('')
  const [saved, setSaved] = useState<Saved[] | null>(readSaved)
  const [flash, setFlash] = useState('')
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(''), 3500); return () => clearTimeout(t) }, [flash])

  const load = (k: string) => {
    const p = PRESETS[k]
    setPreset(k); setPrice(p.price); setLines(p.lines.map((l) => ({ ...l }))); setFees(p.fees ?? DEFAULT_FEES)
    setQty(p.qty ?? 1); setUnit(p.unit ?? 'head')
  }

  const perHead = preset === 'head'
  const calc = useMemo(() => {
    const Q = perHead ? Math.max(1, qty || 1) : 1
    const P = Math.max(0, (price || 0) * Q)
    const feeAmts = fees.map((p) => (P * (p || 0)) / 100)
    const feeTotal = sum(feeAmts)
    const lineCost = (l: Line) => (l.amt || 0) * (l.per === 'unit' ? Q : 1)
    const fixed = sum(lines.map(lineCost))
    const crew = sum(lines.filter((l) => CREW.test(l.label)).map(lineCost))
    const cost = fixed + feeTotal
    const profit = P - cost
    const margin = P > 0 ? profit / P : 0
    const T = target / 100
    const r = sum(fees.map((x) => x || 0)) / 100
    const den = 1 - r - T, den0 = 1 - r
    const sugg = den > 0.001 && fixed > 0 ? Math.ceil((fixed / den) * 2) / 2 : null
    const breakEven = den0 > 0.001 && fixed > 0 ? fixed / den0 : null
    return { Q, P, feeAmts, feeTotal, fixed, crew, other: fixed - crew, cost, profit, margin, T, r, sugg, breakEven }
  }, [price, qty, lines, fees, target, perHead])

  const tone = calc.profit < 0 ? 'is-neg' : calc.P > 0 && calc.margin < calc.T ? 'is-warn' : 'is-pos'
  const verdictMsg = calc.P <= 0 ? 'Enter a price to see the margin.'
    : calc.profit < 0 ? `Costs are ${kd(-calc.profit)} higher than the price.`
    : calc.margin < calc.T ? `${(calc.margin * 100).toFixed(1)}% margin, below your ${target}% target.`
    : `${(calc.margin * 100).toFixed(1)}% margin, on or above your ${target}% target.`

  const total = Math.max(calc.P, calc.cost)
  const segs: [string, number, string][] = [['Fees', calc.feeTotal, 'var(--f-s3)'], ['Crew', calc.crew, 'var(--f-s2)'], ['Other costs', calc.other, 'var(--f-s4)'], ['Profit', Math.max(0, calc.profit), 'var(--f-pos)']]

  const scen = useMemo(() => (calc.P > 0 ? [-20, -10, 0, 10, 20].map((s) => {
    const p = s === 0 ? calc.P : Math.round(calc.P * (1 + s / 100) * 2) / 2
    const profit = p * (1 - calc.r) - calc.fixed
    return { s, price: p, profit, margin: p > 0 ? (profit / p) * 100 : 0 }
  }) : []), [calc])

  const quoteText = useMemo(() => {
    const svc = desc || (preset === 'blank' ? 'To be confirmed' : PRESETS[preset].name)
    return ['Quotation', 'Judeng Production Studio', '', 'Client: ' + (client || 'To be confirmed'), 'Event date: ' + (date ? longDate(date) : 'To be confirmed'), 'Service: ' + svc, '', 'Price: ' + kd(calc.P) + (calc.Q > 1 ? ` (${calc.Q} ${unit} x ${kd(price)})` : '')]
      .concat(valid ? ['Valid until: ' + longDate(valid)] : []).join('\n')
  }, [client, date, desc, valid, preset, calc.P, calc.Q, unit, price])

  const copy = async () => {
    try { await navigator.clipboard.writeText(quoteText); setFlash('Copied.') } catch { setFlash('Copy did not work here. Select the text and copy it.') }
  }

  /** Turn this quote into a numbered quotation document: the client sees one price, never the costs. */
  const makeDocument = () => {
    const doc = {
      kind: 'quotation',
      clientName: client,
      eventTitle: desc || (preset === 'blank' ? '' : PRESETS[preset].name),
      eventDate: date,
      validUntil: valid || undefined,
      lines: [{ id: 1, desc: (desc || (preset === 'blank' ? 'Service' : PRESETS[preset].name)) + (calc.Q > 1 ? ` (per ${unit})` : ''), qty: calc.Q, rate: price }],
    }
    try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(doc)) } catch { /* storage unavailable */ }
    navigate('/invoice')
  }

  /** Post this job to Finance: the price as revenue, each cost line as an expense. */
  const postToFinance = async () => {
    const label = client || desc || PRESETS[preset].name || 'Quote'
    const note = calc.Q > 1 ? `${calc.Q} ${unit} x ${kd(price)}` : ''
    setFin((f) => ({ ...f, busy: true }))
    try {
      let n = 0
      if (fin.rev && calc.P > 0) {
        // The quote's own fee percentages decide whether the studio fees apply to this revenue.
        await add('revenue', { entry_date: fin.date, stream: fin.stream, client: label.slice(0, 120), amount: Math.round(calc.P * 1000) / 1000, method: 'Other', fees: sum(fees) > 0, note: note.slice(0, 500) })
        n++
      }
      if (fin.exp) {
        for (const l of lines) {
          const amount = Math.round((l.amt || 0) * (l.per === 'unit' ? calc.Q : 1) * 1000) / 1000
          if (amount > 0 && l.label.trim()) { await add('expenses', { entry_date: fin.date, category: fin.type, item: `${label}: ${l.label.trim()}`.slice(0, 200), amount, note: note.slice(0, 500) }); n++ }
        }
      }
      setFin((f) => ({ ...f, busy: false, open: false }))
      setFlash(n ? `Added ${n} ${n === 1 ? 'entry' : 'entries'} to Finance.` : 'Nothing to add.')
    } catch (e) {
      setFin((f) => ({ ...f, busy: false }))
      setFlash(e instanceof Error ? e.message : 'Could not add to Finance.')
    }
  }

  const save = () => {
    if (saved === null) return
    const nm = (svName.trim() || client || desc || PRESETS[preset].name || 'Quote').slice(0, 60)
    const rec: Saved = { id: Date.now().toString(36), name: nm, at: Date.now(), preset, price, lines: lines.map((l) => ({ ...l })), fees: fees.slice(), target, client, date, desc, valid, qty, unit }
    const next = [rec, ...saved].slice(0, 30)
    if (writeSaved(next)) { setSaved(next); setSvName(''); setFlash('Quote saved.') } else setFlash('Could not save in this browser.')
  }
  const open = (x: Saved) => {
    setPreset(PRESETS[x.preset] ? x.preset : 'blank'); setPrice(Number(x.price) || 0)
    setLines((x.lines?.length ? x.lines : [{ label: '', amt: 0 }]).map((l) => ({ label: String(l?.label ?? ''), amt: Number(l?.amt) || 0, ...(l?.per === 'unit' ? { per: 'unit' as const } : {}) })))
    setFees([0, 1, 2].map((i) => Number(x.fees?.[i] ?? DEFAULT_FEES[i]) || 0))
    setTarget(Math.min(50, Math.max(5, Number(x.target) || 15)))
    setQty(x.preset === 'head' ? Number(x.qty) || 1 : 1); setUnit(x.unit || 'head')
    setClient(x.client || ''); setDate(x.date || ''); setDesc(x.desc || ''); setValid(x.valid || '')
    setFlash(`Opened "${x.name}".`)
  }
  const remove = (id: string) => { if (!saved) return; const next = saved.filter((x) => x.id !== id); writeSaved(next); setSaved(next); setFlash('Quote deleted.') }

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)))

  return (
    <div className="adm-qgrid">
      <section className="adm-panel adm-stack">
        <div className="adm-ph">
          <h2>Build a quote</h2>
          <div className="adm-seg" role="group" aria-label="Start from">
            {Object.keys(PRESETS).map((k) => <button key={k} type="button" aria-pressed={preset === k} onClick={() => load(k)}>{PRESET_LABEL[k]}</button>)}
          </div>
        </div>
        <p className="adm-note">{PRESETS[preset].note}</p>
        {!perHead && (
          <label className="adm-field"><span>Price to client (KD)</span>
            <input className="adm-big" type="number" min={0} step={1} inputMode="decimal" value={price || ''} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} />
          </label>
        )}
        {perHead && (
        <div className="adm-row">
          <label className="adm-field"><span>Quantity</span>
            <input type="number" min={1} step={1} inputMode="numeric" value={qty || ''} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))} />
          </label>
          <label className="adm-field"><span>Per</span>
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
          </label>
          <label className="adm-field"><span>{qty > 1 ? `Price per ${unit} (KD)` : 'Price to client (KD)'}</span>
            <input className="adm-big" type="number" min={0} step={0.5} inputMode="decimal" value={price || ''} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} />
          </label>
        </div>
        )}
        {perHead && qty > 1 && <p className="adm-note">Client pays <b>{kd(calc.P)}</b> ({qty} {unit} x {kd(price)}).</p>}
        <h3 className="adm-sh">Crew and other costs</h3>
        {lines.map((l, i) => (
          <div className="adm-qrow" key={i}>
            <input className="adm-in" value={l.label} placeholder="Cost item" aria-label={`Cost item ${i + 1}`} onChange={(e) => setLine(i, { label: e.target.value })} />
            <input className="adm-in is-num" type="number" min={0} step="any" inputMode="decimal" value={l.amt || ''} placeholder="0" aria-label={`Amount for cost item ${i + 1}`} onChange={(e) => setLine(i, { amt: parseFloat(e.target.value) || 0 })} />
            {perHead && (
            <label className="adm-note adm-qrow__per" title="Multiply this cost by the quantity">
              <input type="checkbox" checked={l.per === 'unit'} onChange={(e) => setLine(i, { per: e.target.checked ? 'unit' : undefined })} /> per {unit}
            </label>
            )}
            <button type="button" className="adm-icon-btn" aria-label={`Remove cost item ${i + 1}`} onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, k) => k !== i) : [{ label: '', amt: 0 }]))}><X size={14} aria-hidden="true" /></button>
          </div>
        ))}
        <div><button type="button" className="adm-btn adm-btn--ghost" onClick={() => setLines((ls) => [...ls, { label: '', amt: 0 }])}><Plus size={14} aria-hidden="true" /> Add a cost line</button></div>
        <h3 className="adm-sh">Percentage fees, taken from the price</h3>
        {FEE_NAMES.map((n, i) => (
          <div className="adm-qrow is-fee" key={n}>
            <span>{n}</span>
            <input className="adm-in is-num" type="number" min={0} max={100} step={0.5} inputMode="decimal" value={fees[i]} aria-label={`${n} percent`} onChange={(e) => setFees((f) => f.map((v, k) => (k === i ? parseFloat(e.target.value) || 0 : v)))} />
            <span className="adm-note" style={{ textAlign: 'right' }}>{kd(calc.feeAmts[i])}</span>
          </div>
        ))}
      </section>

      <div className="adm-stack">
        <section className="adm-panel" aria-live="polite">
          <h2 style={{ marginBottom: 6 }}>Result</h2>
          <div className={`adm-verdict ${calc.P > 0 ? tone : ''}`}>
            {calc.P > 0 ? (calc.profit >= 0 ? `${kd(calc.profit)} profit` : `${kd(-calc.profit)} loss`) : '–'}
            <small>{verdictMsg}</small>
          </div>
          <div className="adm-metrics">
            {([['Price', kd(calc.P)], ['Total cost', kd(calc.cost)], ['Profit margin', calc.P > 0 ? `${calc.margin < 0 ? '−' : ''}${Math.abs(calc.margin * 100).toFixed(1)}%` : '–'], perHead ? ['Each share (profit ÷ 2)', calc.P > 0 ? kd(calc.profit / 2) : '–'] : ['Fees', kd(calc.feeTotal)]] as const).map(([k, v]) => (
              <div key={k}><div className="adm-note">{k}</div><div className="adm-metrics__v">{v}</div></div>
            ))}
          </div>
          <div className="adm-pbar" role="img" aria-label="Where the price goes">
            {total > 0 && segs.filter((s) => s[1] > 0).map((s) => <span key={s[0]} style={{ flex: s[1], background: s[2] }} title={`${s[0]}: ${kd(s[1])}`} />)}
          </div>
          {total > 0 && <div className="adm-legend">{segs.map((s) => <span key={s[0]}><i style={{ ['--c' as string]: s[2] }} />{s[0]} {kd(s[1])} ({Math.round((s[1] / total) * 100)}%)</span>)}</div>}

          <div className="adm-suggest">
            <label className="adm-note" htmlFor="q-target" style={{ display: 'block' }}>Target profit margin: <b>{target}%</b></label>
            <input id="q-target" type="range" min={5} max={50} step={1} value={target} onChange={(e) => setTarget(+e.target.value)} style={{ width: '100%', accentColor: 'var(--a-pink)' }} />
            <p className="adm-note">A {target}% margin is the same as a {((calc.T / (1 - calc.T)) * 100).toFixed(1)}% markup on cost.</p>
            <div className="adm-suggest__row">
              <span><span className="adm-note">Price needed</span><br /><b className="adm-suggest__pv">{calc.sugg == null ? '–' : kd(calc.sugg)}</b></span>
              <button type="button" className="adm-btn" disabled={calc.sugg == null} onClick={() => calc.sugg != null && setPrice(calc.sugg / calc.Q)}>Use this price</button>
            </div>
            <p className="adm-note">{calc.breakEven != null ? `Break-even price: ${kd(calc.breakEven)}. Anything lower loses money. The price is rounded up to the nearest 0.5 KD.` : 'Add cost lines to see the price needed.'}</p>
          </div>

          {scen.length > 0 && (
            <table className="adm-scen">
              <caption>If the price were different</caption>
              <thead><tr><th>Price</th><th className="is-num">Profit</th><th className="is-num">Margin</th></tr></thead>
              <tbody>
                {scen.map((r) => (
                  <tr key={r.s} className={r.s === 0 ? 'is-cur' : ''} title="Use this price" onClick={() => setPrice(r.price / calc.Q)}>
                    <td>{kd(r.price)} <small>{r.s === 0 ? 'now' : `${r.s > 0 ? '+' : '−'}${Math.abs(r.s)}%`}</small></td>
                    <td className={`is-num ${r.profit < 0 ? 'is-neg' : ''}`}>{r.profit < 0 ? '−' : ''}{fm(Math.abs(r.profit))}</td>
                    <td className={`is-num ${r.profit < 0 ? 'is-neg' : ''}`}>{r.profit < 0 ? '−' : ''}{Math.abs(r.margin).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="adm-panel">
          <div className="adm-ph"><h2>Client quote</h2><span className="adm-note">Price only, no costs. The document has a number, a private link and a printable page.</span></div>
          <div className="adm-row">
            <label className="adm-field"><span>Client</span><input value={client} placeholder="Client or company" onChange={(e) => setClient(e.target.value)} /></label>
            <label className="adm-field"><span>Event date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label className="adm-field"><span>Service</span><input value={desc} placeholder="For example, product shoot" onChange={(e) => setDesc(e.target.value)} /></label>
            <label className="adm-field"><span>Valid until</span><input type="date" value={valid} onChange={(e) => setValid(e.target.value)} /></label>
          </div>
          {perHead && fin.open && (
            <div className="adm-request" role="group" aria-label="Add this job to Finance">
              <h3>Add this job to Finance</h3>
              <div className="adm-row">
                <label className="adm-field"><span>Date</span><input type="date" value={fin.date} onChange={(e) => setFin((f) => ({ ...f, date: e.target.value }))} /></label>
                <label className="adm-field"><span>Revenue stream</span><select value={fin.stream} onChange={(e) => setFin((f) => ({ ...f, stream: e.target.value }))}>{names.streams.map((x) => <option key={x}>{x}</option>)}</select></label>
                <label className="adm-field"><span>Expense type</span><select value={fin.type} onChange={(e) => setFin((f) => ({ ...f, type: e.target.value }))}>{names.expenseTypes.map((x) => <option key={x}>{x}</option>)}</select></label>
              </div>
              <label className="adm-check"><input type="checkbox" checked={fin.rev} onChange={(e) => setFin((f) => ({ ...f, rev: e.target.checked }))} /><span>Revenue: <b>{kd(calc.P)}</b>{sum(fees) > 0 ? ` (the ${sum(fees)}% fees are deducted)` : ' (no fees on this quote)'}</span></label>
              <label className="adm-check"><input type="checkbox" checked={fin.exp} onChange={(e) => setFin((f) => ({ ...f, exp: e.target.checked }))} /><span>Expenses: <b>{kd(calc.fixed)}</b> as {lines.filter((l) => l.label.trim() && (l.amt || 0) > 0).length} separate items</span></label>
              <div className="adm-actions"><button type="button" className="adm-btn" disabled={fin.busy || (!fin.rev && !fin.exp)} onClick={() => void postToFinance()}>{fin.busy ? 'Adding' : 'Add to Finance'}</button></div>
              <p className="adm-note">It appears in the Finance tab straight away, with the revenue, expenses and net profit updated.</p>
            </div>
          )}
          <textarea className="adm-textarea" rows={9} readOnly value={quoteText} aria-label="Client quote text" style={{ marginTop: 10 }} />
          <div className="adm-actions"><button type="button" className="adm-btn" disabled={calc.P <= 0} onClick={makeDocument}><FileText size={15} aria-hidden="true" /> Make quotation document</button><button type="button" className="adm-btn adm-btn--ghost" onClick={() => void copy()}>Copy quote text</button>{perHead && <button type="button" className="adm-btn adm-btn--ghost" disabled={calc.P <= 0} onClick={() => setFin((f) => ({ ...f, open: !f.open }))}>Add to revenue and expenses</button>}<span className="adm-note" role="status">{flash}</span></div>
        </section>

        <section className="adm-panel">
          <div className="adm-ph"><h2>Saved quotes</h2><span className="adm-note">Kept in this browser</span></div>
          <div className="adm-actions" style={{ flexWrap: 'nowrap' }}>
            <input className="adm-in" placeholder="Name this quote" aria-label="Quote name" value={svName} onChange={(e) => setSvName(e.target.value)} />
            <button type="button" className="adm-btn" onClick={save} disabled={saved === null}>Save</button>
          </div>
          {saved === null ? <p className="adm-note" style={{ marginTop: 8 }}>Saving is not available in this browser.</p> : saved.length === 0 ? <p className="adm-note" style={{ marginTop: 8 }}>Nothing saved yet. Build a quote, name it and press Save.</p> : (
            <div style={{ marginTop: 10 }}>
              {saved.map((x) => (
                <div className="adm-saved" key={x.id}>
                  <div className="adm-saved__nm"><b>{x.name}</b><small>{kd(x.price || 0)}, {new Date(x.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></div>
                  <div className="adm-actions">
                    <button type="button" className="adm-btn adm-btn--ghost" onClick={() => open(x)}>Open</button>
                    <button type="button" className="adm-icon-btn" aria-label={`Delete ${x.name}`} onClick={() => remove(x.id)}><X size={14} aria-hidden="true" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
