import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SERVICES, AREAS, POLICY, PAYMENT_METHODS, money, packagesOf, stylesOf } from '@/data/catalog'

/**
 * PriceList - every confirmed price in one place, generated from
 * src/data/catalog.ts, plus a lookup for the location charge.
 */
export default function PriceList() {
  const [q, setQ] = useState('')
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? AREAS.filter((a) => a.name.toLowerCase().includes(t)).slice(0, 6) : []
  }, [q])

  return (
    <div className="plist" id="prices">
      <div className="sgrid__offers-head">
        <h2 className="sgrid__offers-title">Price list</h2>
        <p className="sgrid__offers-sub">All prices in KWD.</p>
      </div>

      <div className="plist__grid">
        {SERVICES.map((s) => (
          <section key={s.id} className="plist__card" aria-labelledby={`pl-${s.id}`}>
            <h3 id={`pl-${s.id}`}><s.Icon size={18} weight="duotone" aria-hidden="true" /> {s.name}</h3>
            <table>
              <tbody>
                {packagesOf(s).map((o) => (
                  <Fragment key={o.id}>
                  <tr>
                    <th scope="row">
                      {o.name}
                      {o.detail && <small>{o.detail}</small>}
                    </th>
                    <td>{o.price === null ? 'Quote' : money(o.price)}</td>
                  </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
            {stylesOf(s).length > 0 && <p className="plist__note">Same packages and prices for every style: {stylesOf(s).join(', ')}.</p>}
          </section>
        ))}

        <section className="plist__card plist__card--wide" aria-labelledby="pl-loc">
          <h3 id="pl-loc">Location charge</h3>
          <p className="plist__note">Added once to the booking price. Type your area to see its charge.</p>
          <label className="plist__find">
            <span>Check your area</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Salmiya" />
          </label>
          {q.trim() && (
            <ul className="plist__hits" role="list" aria-live="polite">
              {matches.length ? matches.map((a) => <li key={a.name}>{a.name}: <strong>{a.charge === 0 ? 'no charge' : money(a.charge)}</strong></li>) : <li>No match. Ask us and we will confirm.</li>}
            </ul>
          )}
        </section>

        <section className="plist__card plist__card--wide" aria-labelledby="pl-pay">
          <h3 id="pl-pay">Payment</h3>
          <p>{POLICY.deposit}</p>
          <p>{POLICY.balance}</p>
          <p>{POLICY.location}</p>
          <p>Payment methods: <strong>{PAYMENT_METHODS.join(' and ')}</strong>.</p>
          <Link className="sgrid__book" to="/book">Book now</Link>
        </section>
      </div>
    </div>
  )
}
