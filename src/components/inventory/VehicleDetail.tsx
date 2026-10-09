import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listVehicles } from '@/lib/db'
import { formatPeso } from '@/lib/inventory'
import type { Vehicle } from '@/types/vehicle'
import { PLACEHOLDER } from './VehicleCard'
import InquiryForm from '@/components/forms/InquiryForm'
import { FINANCING_AVAILABLE } from '@/data/profile'

export default function VehicleDetail() {
  const { id } = useParams()
  const [list, setList] = useState<Vehicle[] | null>(null)
  const [photo, setPhoto] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let live = true
    listVehicles().then((l) => live && setList(l)).catch(() => live && setList([]))
    return () => { live = false }
  }, [])

  if (list === null) return <section className="mpage"><p className="mpage__note">Loading...</p></section>
  const v = list.find((x) => x.id === id)
  if (!v) {
    return (
      <section className="mpage">
        <h1 className="mpage__title">This vehicle is no longer available</h1>
        <Link className="mbtn" to="/inventory">Back to inventory</Link>
      </section>
    )
  }
  const photos = v.photos.length ? v.photos : [PLACEHOLDER]
  const specs: [string, string][] = [
    ['Year', String(v.year)], ['Body', v.body], ['Engine', v.engine], ['Mileage', `${v.mileage.toLocaleString('en-PH')} km`], ['Transmission', v.transmission],
    ['Fuel', v.fuel], ['Color', v.color], ['Status', v.status],
  ]
  return (
    <section className="mpage vdetail">
      <Link className="mlink" to="/inventory">&larr; Inventory</Link>
      <div className="vdetail__grid">
        <div className="vdetail__gallery">
          <img className="vdetail__main" src={photos[Math.min(photo, photos.length - 1)]} alt={`${v.year} ${v.brand} ${v.model}`} />
          {photos.length > 1 && (
            <div className="vdetail__thumbs">
              {photos.map((p, i) => (
                <button key={p} type="button" className={i === photo ? 'is-on' : ''} onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`}><img src={p} alt="" /></button>
              ))}
            </div>
          )}
        </div>
        <div className="vdetail__info">
          <h1 className="mpage__title">{v.year} {v.brand} {v.model}</h1>
          <p className="vdetail__price">{formatPeso(v.price)}</p>
          <dl className="vdetail__specs">
            {specs.map(([k, val]) => val && <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}
          </dl>
          {v.description && <p>{v.description}</p>}
          {v.modifications.length > 0 && (
            <div>
              <h2 className="mpage__sub">Modifications</h2>
              <ul className="vdetail__mods">{v.modifications.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
          )}
          {open ? (
            <InquiryForm vehicleId={v.id} kind="inquiry" heading={`Inquire about the ${v.brand} ${v.model}`} />
          ) : (
            <button type="button" className="mbtn" onClick={() => setOpen(true)}>{v.status === 'reserved' ? 'Ask about this vehicle' : 'Inquire / Reserve'}</button>
          )}
          <p className="vdetail__more">
            <Link className="mlink" to={`/test-drive?vehicle=${v.id}`}>Book a test drive</Link>{FINANCING_AVAILABLE && <> · <Link className="mlink" to="/financing">Financing</Link></>}
          </p>
        </div>
      </div>
    </section>
  )
}
