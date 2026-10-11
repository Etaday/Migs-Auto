import { Link } from 'react-router-dom'
import { formatPeso } from '@/lib/inventory'
import type { Vehicle } from '@/types/vehicle'

export const PLACEHOLDER = '/vehicle-placeholder.svg'

/** A listing card: photo on a dark panel, name and price, four spec rows and a button. */
export default function VehicleCard({ v }: { v: Vehicle }) {
  const specs: [string, string][] = [
    ['Condition', v.condition === 'new' ? 'Brand new' : 'Used'],
    ['Engine', v.engine],
    ['Mileage', `${v.mileage.toLocaleString('en-PH')} km`],
    ['Transmission', v.transmission],
    ['Model Year', String(v.year)],
  ]
  return (
    <Link to={`/inventory/${v.id}`} className="vcard">
      <span className="vcard__media">
        <img src={v.photos[0] || PLACEHOLDER} alt={`${v.year} ${v.brand} ${v.model}`} loading="lazy" />
        <img className="brandmark" src="/emblem.png" alt="" aria-hidden="true" />
        {v.status !== 'available' && <span className={`vcard__tag vcard__tag--${v.status}`}>{v.status}</span>}
      </span>
      <span className="vcard__body">
        <span className="vcard__row"><span className="vcard__title">{v.brand} {v.model}</span><span className="vcard__price">{formatPeso(v.price)}</span></span>
        {v.location && <span className="vcard__loc">&#128205; {v.location}</span>}
        <span className="vcard__specs">
          {specs.filter(([, val]) => val).map(([k, val]) => <span key={k}><i>{k}</i><b>{val}</b></span>)}
        </span>
        <span className="vcard__btn">View Details</span>
      </span>
    </Link>
  )
}
