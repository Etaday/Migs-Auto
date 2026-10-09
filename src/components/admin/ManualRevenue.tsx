import { useState, type FormEvent } from 'react'
import { Plus, Trash } from '@/components/slab'
import { useData } from '@/components/admin/data'
import { shortDate, todayIso } from '@/components/admin/ui'
import { FEE_RATE, OTHER } from '@/lib/revenue'

/** Revenue earned outside the website: cash jobs, walk-ins, direct deals. Added to the finance figures below. */

const METHODS = ['Cash', 'WAMD', 'Bank transfer', 'Other']
const kd = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 3 })} KWD`

export default function ManualRevenue({ streams, year, skipped }: { streams: string[]; year: number; skipped: number }) {
  const { data, add, remove } = useData()
  const [date, setDate] = useState(todayIso())
  const [stream, setStream] = useState(streams[0] ?? OTHER)
  const [client, setClient] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState(METHODS[0])
  const [fees, setFees] = useState(true)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const options = streams.includes(OTHER) ? streams : [...streams, OTHER]
  const n = Number(amount)
  const yearTotal = data.revenue.filter((r) => r.entry_date.startsWith(String(year))).reduce((t, r) => t + r.amount, 0)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!(n > 0)) return setErr('Enter the amount you received.')
    if (!date) return setErr('Pick the date you received it.')
    setBusy(true); setErr('')
    try {
      await add('revenue', { entry_date: date, stream, client: client.trim().slice(0, 120), amount: Math.round(n * 1000) / 1000, method, fees, note: note.trim().slice(0, 500) })
      setAmount(''); setClient(''); setNote('')
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'That did not save.')
    } finally {
      setBusy(false)
    }
  }

  const rows = [...data.revenue].sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at))

  return (
    <section className="adm-panel adm-stack">
      <div className="adm-ph">
        <h2>Revenue outside the website</h2>
        <span className="adm-note">{year}: <b>{kd(yearTotal)}</b> added</span>
      </div>
      <p className="adm-note">Cash jobs, walk-ins and direct deals that never went through a booking. Each entry is added to the charts, the income list and the yearly total below.</p>
      <form onSubmit={submit} noValidate className="adm-stack">
        <div className="adm-row">
          <label className="adm-field"><span>Date received</span><input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="adm-field"><span>Stream</span>
            <select value={stream} onChange={(e) => setStream(e.target.value)}>{options.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <label className="adm-field"><span>Amount (KWD)</span><input type="number" min="0" step="0.5" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></label>
          <label className="adm-field"><span>Paid by</span>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
          </label>
        </div>
        <div className="adm-row">
          <label className="adm-field"><span>Client or venue</span><input type="text" maxLength={120} value={client} onChange={(e) => setClient(e.target.value)} placeholder="Who paid" /></label>
          <label className="adm-field"><span>Note (optional)</span><input type="text" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Job, event or reference" /></label>
        </div>
        <label className="adm-check">
          <input type="checkbox" checked={fees} onChange={(e) => setFees(e.target.checked)} />
          <span>Deduct the {FEE_RATE * 100}% fees (KLPJ 10%, JP royalty 5%, MFees 5%) from this entry{n > 0 && fees ? `: ${kd(n * FEE_RATE)} fees, ${kd(n * (1 - FEE_RATE))} net` : ''}</span>
        </label>
        {err && <p className="adm-error" role="alert">{err}</p>}
        <div className="adm-actions"><button type="submit" className="adm-btn" disabled={busy}><Plus size={15} weight="bold" aria-hidden="true" /> {busy ? 'Adding' : 'Add revenue'}</button></div>
      </form>

      {rows.length > 0 && (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Date</th><th>Stream</th><th>Client</th><th>Paid by</th><th>Amount</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="Date">{shortDate(r.entry_date)}</td>
                  <td data-label="Stream">{r.stream}</td>
                  <td data-label="Client">{r.client || '-'}{r.note && <small>{r.note}</small>}</td>
                  <td data-label="Paid by">{r.method}{!r.fees && <small>No fees</small>}</td>
                  <td data-label="Amount"><b>{kd(r.amount)}</b></td>
                  <td className="adm-actions-cell"><button type="button" className="adm-icon-btn" aria-label={`Delete ${r.client || 'entry'} ${kd(r.amount)}`} onClick={() => window.confirm('Delete this revenue entry?') && void remove('revenue', r.id)}><Trash size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.expenses.length > 0 && (
        <>
          <h3 className="adm-sh">Expenses added from quotes</h3>
          <div className="adm-tablewrap">
            <table className="adm-table">
              <thead><tr><th>Date</th><th>Type</th><th>Item</th><th>Amount</th><th /></tr></thead>
              <tbody>
                {[...data.expenses].sort((a, b) => b.entry_date.localeCompare(a.entry_date)).map((x) => (
                  <tr key={x.id}>
                    <td data-label="Date">{shortDate(x.entry_date)}</td>
                    <td data-label="Type">{x.category}</td>
                    <td data-label="Item">{x.item}{x.note && <small>{x.note}</small>}</td>
                    <td data-label="Amount"><b>{kd(x.amount)}</b></td>
                    <td className="adm-actions-cell"><button type="button" className="adm-icon-btn" aria-label={`Delete ${x.item} ${kd(x.amount)}`} onClick={() => window.confirm('Delete this expense?') && void remove('expenses', x.id)}><Trash size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {skipped > 0 && <p className="adm-note">{skipped} {skipped === 1 ? 'entry is' : 'entries are'} from a different year than the figures ({year}) and not counted in the charts.</p>}
    </section>
  )
}
