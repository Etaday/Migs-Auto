import { profile } from '@/data/profile'
import { formatPeso } from '@/lib/inventory'
import { paidToDate, totals } from '@/lib/documents'
import { shortDate } from '@/components/admin/ui'
import type { SaleDocument } from '@/types/document'

/** The printable invoice or receipt. Only this element is shown when printing (see .doc-print in admin.css). */
export default function DocumentPaper({ doc }: { doc: SaleDocument }) {
  const t = totals(doc.price, doc.discount, paidToDate(doc))
  const receipt = doc.kind === 'receipt'
  return (
    <article className="paper" aria-label={`${receipt ? 'Receipt' : 'Invoice'} ${doc.number}`}>
      <header className="paper__head">
        <img src="/logo-wide.png" alt="Migs Auto" width={150} />
        <div className="paper__id">
          <h1>{receipt ? 'RECEIPT' : 'INVOICE'}</h1>
          <p><b>{doc.number}</b></p>
          <p>Date: {shortDate(doc.issued_on)}</p>
        </div>
      </header>

      <section className="paper__parties">
        <div>
          <h2>Seller</h2>
          <p><b>{profile.name}</b></p>
          <p>{profile.location}</p>
          <p>{profile.phone}</p>
          <p>{profile.email}</p>
        </div>
        <div>
          <h2>Buyer</h2>
          <p><b>{doc.buyer_name}</b></p>
          {doc.buyer_address && <p>{doc.buyer_address}</p>}
          {doc.buyer_phone && <p>{doc.buyer_phone}</p>}
          {doc.buyer_email && <p>{doc.buyer_email}</p>}
        </div>
      </section>

      <table className="paper__table">
        <thead><tr><th>Vehicle</th><th className="r">Amount</th></tr></thead>
        <tbody>
          <tr>
            <td>
              <b>{doc.vehicle_title}</b>
              <small>{[doc.color, doc.engine, doc.mileage ? `${doc.mileage.toLocaleString('en-PH')} km` : ''].filter(Boolean).join(' · ')}</small>
              {doc.vin && <small>VIN / chassis: {doc.vin}</small>}
            </td>
            <td className="r">{formatPeso(doc.price)}</td>
          </tr>
        </tbody>
      </table>

      <dl className="paper__sum">
        {doc.discount > 0 && <div><dt>Discount</dt><dd>- {formatPeso(doc.discount)}</dd></div>}
        <div><dt>Total</dt><dd>{formatPeso(t.total)}</dd></div>
        {receipt && (doc.paid_before ?? 0) > 0 && <div><dt>Paid before</dt><dd>{formatPeso(doc.paid_before)}</dd></div>}
        <div><dt>{receipt ? 'Payment received' : 'Paid so far'}{doc.method ? ` (${doc.method})` : ''}</dt><dd>{formatPeso(Math.min(doc.amount_paid, t.total))}</dd></div>
        {receipt && <div><dt>Total paid to date</dt><dd>{formatPeso(t.paid)}</dd></div>}
        <div className="paper__bal"><dt>{t.balance === 0 ? 'Balance' : 'Balance due'}</dt><dd>{formatPeso(t.balance)}</dd></div>
      </dl>
      <p className={`paper__stamp paper__stamp--${t.status}`}>{t.status === 'paid' ? 'PAID IN FULL' : t.status === 'partial' ? 'PARTIAL PAYMENT' : 'UNPAID'}</p>

      {doc.notes && <p className="paper__notes">{doc.notes}</p>}

      <footer className="paper__foot">
        <div><span /><small>Buyer signature</small></div>
        <div><span /><small>Authorized by {profile.name}</small></div>
      </footer>
      <p className="paper__thanks">{receipt ? 'This receipt confirms the payment received. ' : ''}Thank you for choosing {profile.name}.</p>
    </article>
  )
}
