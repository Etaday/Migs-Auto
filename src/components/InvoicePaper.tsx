import { profile } from '@/data/profile'
import { pretty, totalsOf, moneyFor, quoteNote, type Doc } from '@/lib/invoiceDoc'

const SITE = 'https://judengproduction.com'

/** The A5 paper for an invoice or receipt. Used by the editor and the shared link page. */
export default function InvoicePaper({ doc }: { doc: Doc }) {
  const { location, subtotal, tax, total, paid, balance, isReceipt, isQuotation } = totalsOf(doc)
  const name = isQuotation ? 'Quotation' : isReceipt ? 'Receipt' : 'Invoice'
  const money = moneyFor(doc.currency)
  return (
    <article className="inv__paper" aria-label={`${name} preview`}>
      <header className="inv__head">
        <div className="inv__brand">
          <img src="/emblem.png" alt="" width={72} height={72} />
          <div>
            <strong>{profile.name}</strong>
            <span>{profile.email}</span>
            <a href={SITE} target="_blank" rel="noopener noreferrer">judengproduction.com</a>
            {doc.studioPhone && <span>{doc.studioPhone}</span>}
            {doc.studioAddress && <span>{doc.studioAddress}</span>}
          </div>
        </div>
        <div className="inv__title">
          <h2>{name.toUpperCase()}</h2>
          <span>{doc.number}</span>
          {isReceipt && <b className="inv__stamp">{balance <= 0 ? 'PAID' : 'PARTIAL'}</b>}
        </div>
      </header>

      <section className="inv__meta">
        <div>
          <h3>{isReceipt ? 'Received from' : isQuotation ? 'Prepared for' : 'Bill to'}</h3>
          <p><strong>{doc.clientName || 'Client name'}</strong></p>
          {doc.clientAddress && <p>{doc.clientAddress}</p>}
          {doc.clientEmail && <p>{doc.clientEmail}</p>}
          {doc.clientPhone && <p>{doc.clientPhone}</p>}
        </div>
        <div>
          <h3>Details</h3>
          <p>Issued: {pretty(doc.issued)}</p>
          {isReceipt ? (<><p>Paid on: {pretty(doc.paidOn)}</p><p>Method: {doc.method}</p></>) : isQuotation ? <p>Valid until: {pretty(doc.validUntil ?? '')}</p> : <p>Due: {pretty(doc.due)}</p>}
        </div>
        {(doc.eventTitle || doc.eventDate || doc.eventVenue) && (
          <div>
            <h3>Event</h3>
            {doc.eventTitle && <p><strong>{doc.eventTitle}</strong></p>}
            {doc.eventDate && <p>{pretty(doc.eventDate)}</p>}
            {doc.eventVenue && <p>{doc.eventVenue}</p>}
          </div>
        )}
      </section>

      <table className="inv__table">
        <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
          {doc.lines.map((l) => (
            <tr key={l.id}>
              <td>{l.desc || '-'}</td>
              <td>{l.qty}</td>
              <td>{money(l.rate)}</td>
              <td>{money(l.qty * l.rate)}</td>
            </tr>
          ))}
          {location > 0 && (
            <tr><td>Location charge ({doc.area})</td><td>1</td><td>{money(location)}</td><td>{money(location)}</td></tr>
          )}
        </tbody>
      </table>

      <dl className="inv__totals">
        <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
        {doc.discount > 0 && <div><dt>Discount</dt><dd>-{money(doc.discount)}</dd></div>}
        {doc.taxPct > 0 && <div><dt>Tax ({doc.taxPct}%)</dt><dd>{money(tax)}</dd></div>}
        <div className="is-strong"><dt>Total</dt><dd>{money(total)}</dd></div>
        {!isQuotation && (isReceipt || paid > 0) && <div><dt>{isReceipt ? 'Amount received' : 'Deposit paid'}</dt><dd>{money(paid)}</dd></div>}
        {!isQuotation && <div className="is-due"><dt>{isReceipt ? 'Balance remaining' : 'Balance due'}</dt><dd>{money(balance)}</dd></div>}
      </dl>

      {!isReceipt && doc.payTo && (
        <section className="inv__pay"><h3>{isQuotation ? 'How to confirm' : 'How to pay'}</h3><p>{doc.payTo}</p></section>
      )}
      {quoteNote(doc) && <p className="inv__notes">{quoteNote(doc)}</p>}
      <footer className="inv__foot">{profile.name}{isReceipt ? ' - this receipt confirms payment received.' : isQuotation ? ` - this quotation is valid until ${pretty(doc.validUntil ?? '') || 'the date shown'}.` : ''}<br /><a href={SITE} target="_blank" rel="noopener noreferrer">judengproduction.com</a></footer>
    </article>
  )
}
