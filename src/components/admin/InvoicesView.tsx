import { useNavigate } from 'react-router-dom'
import { Plus, Trash } from '@/components/slab'
import { useData } from '@/components/admin/data'
import { HANDOFF_KEY } from '@/components/InvoiceStudio'
import { shortDate, money } from '@/components/admin/ui'
import { docLink, emailHref, whatsappHref } from '@/lib/share'
import type { Doc } from '@/lib/invoiceDoc'

export default function InvoicesView() {
  const { data, remove } = useData()
  const navigate = useNavigate()
  const open = (data_: Record<string, unknown> | null, bookingId?: string | null) => {
    try { if (data_) sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(bookingId ? { ...data_, bookingId } : data_)) } catch { /* storage unavailable */ }
    navigate('/invoice')
  }
  return (
    <div className="adm-stack">
      <div className="adm-toolbar">
        <p className="adm-note">Invoices, receipts and quotations. Make one from a booking (open the booking, then Documents), from the Quotation tab, or start a blank one.</p>
        <button type="button" className="adm-btn" onClick={() => open(null)}><Plus size={15} weight="bold" aria-hidden="true" /> New document</button>
      </div>
      {data.invoices.length === 0 ? (
        <p className="adm-empty">No saved documents yet. In the document tool press Save to dashboard to keep a copy here.</p>
      ) : (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Date</th><th>Number</th><th>Client</th><th>Type</th><th>Total</th><th /></tr></thead>
            <tbody>
              {data.invoices.map((i) => (
                <tr key={i.id}>
                  <td data-label="Date">{shortDate(i.created_at)}</td>
                  <td data-label="Number"><b>{i.number}</b></td>
                  <td data-label="Client">{i.client_name || '-'}</td>
                  <td data-label="Type">{i.kind === 'invoice' ? 'Invoice' : i.kind === 'receipt' ? 'Receipt' : 'Quotation'}</td>
                  <td data-label="Total">{money(i.total)}</td>
                  <td className="adm-actions-cell">
                    {i.share_token && (() => {
                      const d = i.data as unknown as Doc
                      const link = docLink(i.share_token)
                      return (
                        <>
                          <a className="adm-btn adm-btn--ghost" href={emailHref(d.clientEmail ?? '', d, link)}>Email</a>
                          <a className="adm-btn adm-btn--ghost" href={whatsappHref(d.clientPhone ?? '', d, link)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                        </>
                      )
                    })()}
                    {i.kind === 'quotation' && <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { const { number: _n, notes: _t, validUntil: _v, ...rest } = i.data as Record<string, unknown>; void _n; void _t; void _v; open({ ...rest, kind: 'invoice' }, i.booking_id) }}>Make invoice</button>}
                    <button type="button" className="adm-btn adm-btn--ghost" onClick={() => open(i.data, i.booking_id)}>Open</button>
                    <button type="button" className="adm-icon-btn" aria-label={`Delete ${i.number}`} onClick={() => window.confirm(`Delete ${i.number}?`) && void remove('invoices', i.id)}><Trash size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
