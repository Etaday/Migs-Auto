import { useState } from 'react'
import { monthlyPayment } from '@/lib/financing'
import { formatPeso } from '@/lib/inventory'
import InquiryForm from './InquiryForm'

const num = (s: string) => Number(s.replace(/\D/g, '')) || 0

export default function FinancingView() {
  const [price, setPrice] = useState('600000')
  const [down, setDown] = useState('120000')
  const [rate, setRate] = useState('12')
  const [months, setMonths] = useState('48')
  const monthly = monthlyPayment(num(price), num(down), Number(rate) || 0, Number(months))
  return (
    <section className="mpage">
      <h1 className="mpage__title">Financing</h1>
      <div className="mform">
        <label>Vehicle price (₱)<input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" /></label>
        <label>Down payment (₱)<input value={down} onChange={(e) => setDown(e.target.value)} inputMode="numeric" /></label>
        <label>Interest per year (%)<input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" /></label>
        <label>Term<select value={months} onChange={(e) => setMonths(e.target.value)}>{[12, 24, 36, 48, 60].map((m) => <option key={m} value={m}>{m} months</option>)}</select></label>
        <p className="vdetail__price" aria-live="polite">{monthly > 0 ? `${formatPeso(monthly)} / month` : 'Enter a price above the down payment'}</p>
        <p className="mpage__note">An estimate only. The final rate depends on the approved plan.</p>
      </div>
      <InquiryForm kind="financing" details={{ price: num(price), down: num(down), rate: Number(rate) || 0, months: Number(months), monthly }} heading="Ask about financing" submitLabel="Request financing" />
    </section>
  )
}
