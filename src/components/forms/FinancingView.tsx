import { useState } from 'react'
import { monthlyPayment } from '@/lib/financing'
import { formatPeso } from '@/lib/inventory'
import { Link } from 'react-router-dom'
import { FINANCING_AVAILABLE } from '@/data/profile'
import InquiryForm from './InquiryForm'

const num = (s: string) => Number(s.replace(/\D/g, '')) || 0

/** Shown while financing is not offered. */
function ComingSoon() {
  return (
    <section className="mpage">
      <h1 className="mpage__title">Financing</h1>
      <p className="msoon" role="status"><span className="msoon__tag">Coming soon</span> We are not offering financing yet, and we will announce it here when it starts.</p>
      <p className="mpage__note">For now, vehicles are sold for cash or bank transfer. Message us and we will help you with a purchase or a trade-in.</p>
      <div className="mcontact">
        <Link className="mbtn" to="/inventory">Browse inventory</Link>
        <Link className="mbtn" to="/trade-in">Trade-in</Link>
        <Link className="mbtn" to="/contact">Contact us</Link>
      </div>
    </section>
  )
}

export default function FinancingView() {
  if (!FINANCING_AVAILABLE) return <ComingSoon />
  return <FinancingCalculator />
}

function FinancingCalculator() {
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
