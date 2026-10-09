import { Link } from 'react-router-dom'
import { formatPeso } from '@/lib/inventory'
import type { Vehicle } from '@/types/vehicle'

export const PLACEHOLDER = '/vehicle-placeholder.svg'

export default function VehicleCard({ v }: { v: Vehicle }) {
  return (
    <Link to={`/inventory/${v.id}`} className="vcard">
      <span className="vcard__media">
        <img src={v.photos[0] || PLACEHOLDER} alt={`${v.year} ${v.brand} ${v.model}`} loading="lazy" />
        {v.status !== 'available' && <span className={`vcard__tag vcard__tag--${v.status}`}>{v.status}</span>}
      </span>
      <span className="vcard__body">
        <span className="vcard__title">{v.year} {v.brand} {v.model}</span>
        <span className="vcard__meta">{v.mileage.toLocaleString('en-PH')} km · {v.transmission} · {v.fuel}</span>
        <span className="vcard__price">{formatPeso(v.price)}</span>
      </span>
    </Link>
  )
}
