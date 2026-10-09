import { useEffect, useMemo, useState } from 'react'
import { Plus, Printer, Trash, Receipt as ReceiptIcon, X, EnvelopeSimple, WhatsappLogo, LinkSimple, Copy, Check } from '@/components/slab'
import { useData } from '@/components/admin/data'
import { shortDate, todayIso, downloadCsv } from '@/components/admin/ui'
import { formatPeso } from '@/lib/inventory'
import { draftFromVehicle, mailtoLink, nextNumber, paidToDate, receiptDraft, shareMessage, totals, validateDocument, whatsappShareLink } from '@/lib/documents'
import { SITE_URL } from '@/data/profile'
import { sanitize } from '@/lib/contact'
import { parseMoneyInput } from '@/lib/money'
import MoneyInput from '@/components/MoneyInput'
import type { DocKind, SaleDocument } from '@/types/document'
import DocumentPaper from './DocumentPaper'

const METHODS = ['Cash', 'Bank transfer', 'GCash', 'Check']
type Draft = Omit<SaleDocument, 'id' | 'created_at' | 'number'>

const blank = (kind: DocKind): Draft => ({
  kind, issued_on: todayIso(), vehicle_id: null, vehicle_title: '', vin: '', color: '', engine: '', mileage: 0, buyer_name: '', buyer_phone: '', buyer_email: '',
  buyer_address: '', price: 0, discount: 0, paid_before: 0, amount_paid: 0, method: 'Cash', notes: '',
})

/** Where the Sales tab sends the owner: a new document for this vehicle. */
export type DocRequest = { vehicleId: string; kind: DocKind } | null

/** Send the document to the buyer: a private link by email or WhatsApp, or copy it. */
function SendPanel({ doc }: { doc: SaleDocument }) {
  const [copied, setCopied] = useState<'' | 'link' | 'message'>('')
  const link = doc.share_token ? `${SITE_URL}/d/${doc.share_token}` : ''
  const copy = async (what: 'link' | 'message') => {
    try { await navigator.clipboard.writeText(what === 'link' ? link : shareMessage(doc, link)); setCopied(what); window.setTimeout(() => setCopied(''), 1800) } catch { /* clipboard blocked */ }
  }
  return (
    <section className="adm-panel doc-noprint adm-send" aria-label="Send to the buyer">
      <h2>Send to {doc.buyer_name || 'the buyer'}</h2>
      <div className="adm-actions">
        <a className="adm-btn" href={mailtoLink(doc, link)}><EnvelopeSimple size={15} aria-hidden="true" /> Email{doc.buyer_email ? '' : ' (add address)'}</a>
        <a className="adm-btn" href={whatsappShareLink(doc, link)} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={15} aria-hidden="true" /> WhatsApp{doc.buyer_phone ? '' : ' (choose contact)'}</a>
        {link && <button type="button" className="adm-btn adm-btn--ghost" onClick={() => void copy('link')}>{copied === 'link' ? <Check size={15} aria-hidden="true" /> : <LinkSimple size={15} aria-hidden="true" />} {copied === 'link' ? 'Link copied' : 'Copy link'}</button>}
        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => void copy('message')}>{copied === 'message' ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied === 'message' ? 'Message copied' : 'Copy message'}</button>
      </div>
      <p className="adm-note">{link ? `The buyer opens a private page with this ${doc.kind} and can print it or save it as a PDF. Only people with the link can see it.` : 'Private links are not switched on yet (the database update has not been applied). The message still has all the figures.'}</p>
    </section>
  )
}

export default function DocumentsView({ request, clearRequest }: { request: DocRequest; clearRequest: () => void }) {
  const { data, add, remove } = useData()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [viewing, setViewing] = useState<SaleDocument | null>(null)
  const [err, setErr] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | DocKind>('all')
  const now = useMemo(() => new Date(), [])

  useEffect(() => {
    if (!request) return
    const v = data.vehicles.find((x) => x.id === request.vehicleId)
    const prior = data.documents.find((d) => d.vehicle_id === request.vehicleId && d.kind === 'invoice')
    if (v) setDraft({ ...blank(request.kind), ...draftFromVehicle(v),
      ...(prior ? { buyer_name: prior.buyer_name, buyer_phone: prior.buyer_phone, buyer_email: prior.buyer_email, buyer_address: prior.buyer_address, discount: prior.discount, method: prior.method } : {}),
      paid_before: 0, amount_paid: request.kind === 'receipt' ? (prior ? totals(prior.price, prior.discount, prior.amount_paid + (prior.paid_before ?? 0)).balance : draftFromVehicle(v).price) : 0 })
    clearRequest()
  }, [request, data.vehicles, data.documents, clearRequest])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))
  const pickVehicle = (id: string) => {
    const v = data.vehicles.find((x) => x.id === id)
    setDraft((d) => (d ? { ...d, ...(v ? draftFromVehicle(v) : { vehicle_id: null }) } : d))
  }
  const t = draft ? totals(draft.price, draft.discount, paidToDate(draft)) : null

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!draft) return
    const clean: Draft = {
      ...draft, buyer_name: sanitize(draft.buyer_name.trim()), buyer_phone: sanitize(draft.buyer_phone.trim()), buyer_email: sanitize(draft.buyer_email.trim()),
      buyer_address: sanitize(draft.buyer_address.trim()), vehicle_title: sanitize(draft.vehicle_title.trim()), notes: sanitize(draft.notes.trim(), true),
    }
    const number = nextNumber(clean.kind, data.documents, now)
    const full = { ...clean, number, id: '', created_at: '' } as SaleDocument
    const bad = validateDocument(full)
    if (bad) return setErr(bad)
    setErr('')
    try {
      await add('documents', { ...clean, number })
      setDraft(null)
    } catch { setErr('Could not save. Please try again.') }
  }

  if (viewing) {
    return (
      <div className="adm-stack doc-print">
        <div className="adm-actions doc-noprint">
          <button type="button" className="adm-btn" onClick={() => window.print()}><Printer size={15} aria-hidden="true" /> Print / save as PDF</button>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setViewing(null)}><X size={15} aria-hidden="true" /> Close</button>
        </div>
        <SendPanel doc={viewing} />
        <DocumentPaper doc={viewing} />
      </div>
    )
  }

  if (draft && t) {
    const receipt = draft.kind === 'receipt'
    return (
      <form className="adm-panel adm-vform" onSubmit={save} noValidate>
        <h2>{receipt ? 'New receipt' : 'New invoice'}</h2>
        <div className="adm-chips">
          {(['invoice', 'receipt'] as const).map((k) => <button key={k} type="button" className={draft.kind === k ? 'is-on' : ''} onClick={() => set('kind', k)}>{k === 'invoice' ? 'Invoice' : 'Receipt'}</button>)}
        </div>
        <label className="adm-field"><span>Vehicle</span>
          <select value={draft.vehicle_id ?? ''} onChange={(e) => pickVehicle(e.target.value)}>
            <option value="">Choose a vehicle</option>
            {data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.year} {v.brand} {v.model}{v.status === 'sold' ? ' (sold)' : ''}</option>)}
          </select>
        </label>
        <div className="adm-vform__grid">
          <label className="adm-field"><span>Buyer name</span><input value={draft.buyer_name} onChange={(e) => set('buyer_name', e.target.value)} /></label>
          <label className="adm-field"><span>Phone</span><input value={draft.buyer_phone} onChange={(e) => set('buyer_phone', e.target.value)} /></label>
          <label className="adm-field"><span>Email</span><input value={draft.buyer_email} onChange={(e) => set('buyer_email', e.target.value)} /></label>
          <label className="adm-field"><span>Date</span><input type="date" value={draft.issued_on} onChange={(e) => set('issued_on', e.target.value)} /></label>
          <label className="adm-field"><span>Vehicle price (₱)</span><MoneyInput value={draft.price ? String(draft.price) : ''} onChange={(v) => set('price', parseMoneyInput(v))} /></label>
          <label className="adm-field"><span>Discount (₱)</span><MoneyInput value={draft.discount ? String(draft.discount) : ''} onChange={(v) => set('discount', parseMoneyInput(v))} /></label>
          <label className="adm-field"><span>{receipt ? 'Payment received (₱)' : 'Paid so far (₱)'}</span><MoneyInput value={draft.amount_paid ? String(draft.amount_paid) : ''} onChange={(v) => set('amount_paid', parseMoneyInput(v))} /></label>
          <label className="adm-field"><span>Payment method</span><select value={draft.method} onChange={(e) => set('method', e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
        </div>
        <label className="adm-field"><span>Buyer address</span><input value={draft.buyer_address} onChange={(e) => set('buyer_address', e.target.value)} /></label>
        <label className="adm-field"><span>Notes (shown on the document)</span><textarea className="adm-textarea" rows={2} value={draft.notes} onChange={(e) => set('notes', e.target.value)} /></label>
        <p className="adm-note" aria-live="polite">Total {formatPeso(t.total)}{draft.paid_before > 0 ? ` · paid before ${formatPeso(draft.paid_before)}` : ''} · paid to date {formatPeso(t.paid)} · balance {formatPeso(t.balance)}</p>
        {err && <p className="adm-error" role="alert">{err}</p>}
        <div className="adm-actions">
          <button type="submit" className="adm-btn">Create {receipt ? 'receipt' : 'invoice'}</button>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { setDraft(null); setErr('') }}>Cancel</button>
        </div>
      </form>
    )
  }

  const list = data.documents.filter((d) => kindFilter === 'all' || d.kind === kindFilter)
  return (
    <div className="adm-stack">
      <div className="adm-toolbar">
        <div className="adm-chips">
          {(['all', 'invoice', 'receipt'] as const).map((k) => (
            <button key={k} type="button" className={kindFilter === k ? 'is-on' : ''} onClick={() => setKindFilter(k)}>{k === 'all' ? 'All' : k === 'invoice' ? 'Invoices' : 'Receipts'} <small>{k === 'all' ? data.documents.length : data.documents.filter((d) => d.kind === k).length}</small></button>
          ))}
        </div>
        <button type="button" className="adm-btn" onClick={() => setDraft(blank('invoice'))}><Plus size={15} weight="bold" aria-hidden="true" /> New invoice</button>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setDraft(blank('receipt'))}><ReceiptIcon size={15} aria-hidden="true" /> New receipt</button>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadCsv('migs-auto-documents.csv', [['Number', 'Type', 'Date', 'Buyer', 'Vehicle', 'Total', 'Paid', 'Balance'], ...data.documents.map((d) => { const x = totals(d.price, d.discount, paidToDate(d)); return [d.number, d.kind, d.issued_on, d.buyer_name, d.vehicle_title, x.total, x.paid, x.balance] })])}>Export CSV</button>
      </div>
      {list.length === 0 ? <p className="adm-empty">No documents yet. Create an invoice when a buyer commits, then a receipt when payment arrives.</p> : (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Number</th><th>Date</th><th>Buyer</th><th>Vehicle</th><th>Total</th><th>Balance</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{list.map((d) => { const x = totals(d.price, d.discount, paidToDate(d)); return (
              <tr key={d.id}>
                <td><b>{d.number}</b><small>{d.kind === 'invoice' ? 'Invoice' : 'Receipt'}</small></td>
                <td>{shortDate(d.issued_on)}</td>
                <td>{d.buyer_name}<small>{d.buyer_phone}</small></td>
                <td>{d.vehicle_title}</td>
                <td>{formatPeso(x.total)}</td>
                <td>{x.balance === 0 ? <span className="adm-pill adm-pill--confirmed">paid</span> : formatPeso(x.balance)}</td>
                <td className="adm-actions-cell">
                  <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setViewing(d)}><Printer size={15} aria-hidden="true" /> Open / send</button>
                  {d.kind === 'invoice' && d.vehicle_id && <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setDraft(receiptDraft(d, todayIso()))}>Make receipt</button>}
                  <button type="button" className="adm-icon-btn" aria-label={`Delete ${d.number}`} onClick={() => window.confirm(`Delete ${d.number}?`) && void remove('documents', d.id)}><Trash size={16} /></button>
                </td>
              </tr>) })}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
