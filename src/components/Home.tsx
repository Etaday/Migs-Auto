import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Car, Motorcycle, Gear } from '@/components/slab'
import { profile } from '@/data/profile'
import { listVehicles } from '@/lib/db'
import type { Vehicle } from '@/types/vehicle'
import VehicleCard from '@/components/inventory/VehicleCard'
import { HomeProfile } from './HomeMobile'
import { useIsPhone } from '@/hooks/useMediaQuery'

/**
 * Home: the headline the intro writes (`.home__title` is the intro's landing
 * target), a Cars / Motorcycles switch and the featured vehicles.
 */
export default function Home() {
  const phone = useIsPhone()
  const { displayName, hero } = profile
  const [featured, setFeatured] = useState<Vehicle[]>([])

  useEffect(() => {
    let live = true
    listVehicles()
      .then((l) => live && setFeatured(l.filter((v) => v.featured).slice(0, 6)))
      .catch(() => undefined)
    return () => { live = false }
  }, [])

  return (
    <section className="home home--dealer" aria-labelledby="home-title">
      {phone && <HomeProfile />}
      <div className="home__head">
        <div className="home__headline">
          <h1 className="home__title" id="home-title">
            <span className="home__line">{displayName.line1} {displayName.line2}</span>
          </h1>
          <Link className="home__cta" to="/inventory">
            Browse inventory
            <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
          </Link>
        </div>
        <p className="home__lede">{hero.body}</p>
      </div>

      <div className="mswitch">
        <Link to="/inventory?type=car" className="mswitch__card"><Car size={40} weight="duotone" aria-hidden="true" /><b>Cars</b><span>Sedans, SUVs and vans</span></Link>
        <Link to="/inventory?type=motorcycle" className="mswitch__card"><Motorcycle size={40} weight="duotone" aria-hidden="true" /><b>Motorcycles</b><span>Scooters to sport bikes</span></Link>
        <Link to="/accessories" className="mswitch__card"><Gear size={40} weight="duotone" aria-hidden="true" /><b>Mags &amp; Accessories</b><span>Wheels, dash cams and more</span></Link>
      </div>

      {featured.length > 0 && (
        <div className="mfeatured">
          <h2 className="mpage__sub">Featured</h2>
          <ul className="vgrid" role="list">
            {featured.map((v) => <li key={v.id}><VehicleCard v={v} /></li>)}
          </ul>
        </div>
      )}
    </section>
  )
}
