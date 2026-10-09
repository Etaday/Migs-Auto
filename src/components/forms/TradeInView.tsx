import { useState } from 'react'
import InquiryForm from './InquiryForm'
import MoneyInput from '@/components/MoneyInput'

export default function TradeInView() {
  const [d, setD] = useState({ vehicle: '', year: '', mileage: '', asking: '', photos: '' })
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement>) => setD((x) => ({ ...x, [k]: e.target.value }))
  return (
    <section className="mpage">
      <h1 className="mpage__title">Trade-in</h1>
      <p className="mpage__note">Tell us about the car or motorcycle you want to trade. We will reply with an offer.</p>
      <InquiryForm kind="trade_in" details={d} submitLabel="Request trade-in value" messageRequired={false}>
        <label>Your vehicle (brand, model)<input value={d.vehicle} onChange={set('vehicle')} maxLength={120} /></label>
        <label>Year<input value={d.year} onChange={set('year')} inputMode="numeric" maxLength={4} /></label>
        <label>Mileage (km)<input value={d.mileage} onChange={set('mileage')} inputMode="numeric" maxLength={9} /></label>
        <label>Asking price (₱, optional)<MoneyInput value={d.asking} onChange={(v) => setD((x) => ({ ...x, asking: v }))} maxLength={16} /></label>
        <label>Link to photos (optional)<input value={d.photos} onChange={set('photos')} maxLength={300} /></label>
      </InquiryForm>
    </section>
  )
}
