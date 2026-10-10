import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Car, CheckCircle, Gear, Motorcycle, Tire, Wrench } from '@/components/slab'
import { profile } from '@/data/profile'
import { listProducts, listVehicles } from '@/lib/db'
import type { Vehicle } from '@/types/vehicle'
import type { Product } from '@/types/product'
import VehicleCard from '@/components/inventory/VehicleCard'
import { PRODUCT_GROUPS, VEHICLE_CATEGORIES } from '@/lib/categories'

/**
 * The picture on the hero: the Migs Auto logo on the stripes. To feature a motorcycle photo instead
 * (a cut-out with a transparent background looks best), save it as public/hero-bike.png and it is used automatically.
 */
const HERO_PHOTO = '/hero-bike.png'
const HERO_LOGO = '/logo.png'

function useHeroImage(): { src: string; w: number; h: number } {
  const [photo, setPhoto] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    const img = new Image()
    img.onload = () => img.naturalWidth > 0 && setPhoto({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = HERO_PHOTO
  }, [])
  return photo ? { src: HERO_PHOTO, ...photo } : { src: HERO_LOGO, w: 512, h: 512 }
}

/**
 * Home, in the Ridenix style: a dark hero with the big bike and diagonal stripes, a collection row,
 * an About block, the featured rides, and a closing call to action. `.home__title`, `.home__lede`
 * and `.home__cta` keep their names: the intro animation lands its headline on `.home__title`.
 */
export default function Home() {
  const { displayName, hero } = profile
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [tab, setTab] = useState<'all' | 'car' | 'motorcycle'>('all')
  const hero_ = useHeroImage()

  useEffect(() => {
    let live = true
    listVehicles().then((l) => live && setVehicles(l)).catch(() => undefined)
    listProducts().then((l) => live && setProducts(l)).catch(() => undefined)
    return () => { live = false }
  }, [])

  const count = {
    cars: vehicles.filter((v) => v.type === 'car').length,
    bikes: vehicles.filter((v) => v.type === 'motorcycle').length,
    mags: products.filter((p) => p.category === 'mags').length,
    acc: products.filter((p) => p.category === 'accessories').length,
  }
  const featured = useMemo(
    () => [...vehicles].filter((v) => tab === 'all' || v.type === tab).sort((a, b) => Number(b.featured) - Number(a.featured) || b.created_at.localeCompare(a.created_at)).slice(0, 6),
    [vehicles, tab],
  )
  const brands = new Set(vehicles.map((v) => v.brand)).size
  const styleChips = [
    ...[...VEHICLE_CATEGORIES.car, ...VEHICLE_CATEGORIES.motorcycle].map((c) => ({ ...c, n: vehicles.filter((v) => v.category === c.id).length, to: `/inventory?category=${c.id}` })),
    ...[...PRODUCT_GROUPS.mags, ...PRODUCT_GROUPS.accessories].map((g) => ({ ...g, n: products.filter((p) => p.subcategory === g.id).length, to: `/accessories?group=${g.id}` })),
  ].filter((c) => c.n > 0)

  const categories = [
    { to: '/inventory?type=car', label: 'Cars', n: count.cars, Icon: Car },
    { to: '/inventory?type=motorcycle', label: 'Motorcycles', n: count.bikes, Icon: Motorcycle },
    { to: '/accessories?category=mags', label: 'Mags', n: count.mags, Icon: Tire },
    { to: '/accessories?category=accessories', label: 'Accessories', n: count.acc, Icon: Wrench },
  ]

  return (
    <div className="rx-home">
      <section className="rx-hero" aria-labelledby="home-title">
        <span className="rx-stripe rx-stripe--red" aria-hidden="true" />
        <span className="rx-stripe rx-stripe--white" aria-hidden="true" />
        <div className="rx-hero__copy">
          <p className="rx-eyebrow">Born to ride</p>
          <h1 className="home__title" id="home-title"><span className="home__line">{displayName.line1} {displayName.line2}</span></h1>
          <p className="home__lede">{hero.body}</p>
          <div className="rx-hero__actions">
            <Link className="home__cta" to="/inventory">Browse inventory</Link>
            <Link className="rx-ghost" to="/test-drive">Book a test drive</Link>
          </div>
        </div>
        <img className="rx-hero__bike is-photo" src={hero_.src} alt="Migs Auto" width={hero_.w} height={hero_.h} />
        <div className="rx-hero__dots" aria-hidden="true"><i /><i className="is-on" /><i /></div>
      </section>

      <section className="rx-section" aria-labelledby="rx-cat">
        <p className="rx-eyebrow rx-eyebrow--center">Category</p>
        <h2 className="rx-h2 rx-h2--center" id="rx-cat">Explore Our Collection</h2>
        <ul className="rx-cats" role="list">
          {categories.map(({ to, label, n, Icon }) => (
            <li key={label}>
              <Link to={to} className="rx-cat">
                <span className="rx-cat__icon"><Icon size={34} weight="duotone" aria-hidden="true" /></span>
                <span className="rx-cat__label">{label}</span>
                <span className="rx-cat__count">{n} {n === 1 ? 'listing' : 'listings'}</span>
              </Link>
            </li>
          ))}
        </ul>
        {styleChips.length > 0 && (
          <ul className="rx-styles" role="list" aria-label="Browse by style">
            {styleChips.map((c) => <li key={c.id}><Link to={c.to}>{c.label} <small>{c.n}</small></Link></li>)}
          </ul>
        )}
      </section>

      <section className="rx-section rx-about" aria-labelledby="rx-about">
        <span className="rx-ghostword" aria-hidden="true">About Us</span>
        <div className="rx-about__copy">
          <p className="rx-eyebrow">About Us</p>
          <h2 className="rx-h2" id="rx-about">Honest Deals, Built to Last</h2>
          <p>{profile.name} sells cars and motorcycles with the real specifications on every listing, plus mags and accessories to make the ride yours. Trade in what you drive now, and book a test drive before you decide.</p>
          <ul className="rx-checks" role="list">
            <li><CheckCircle size={18} weight="fill" aria-hidden="true" /> Real specs on every listing</li>
            <li><CheckCircle size={18} weight="fill" aria-hidden="true" /> Trade-ins welcome</li>
            <li><CheckCircle size={18} weight="fill" aria-hidden="true" /> Test drives by appointment</li>
          </ul>
          <ul className="rx-stats" role="list">
            <li><b>{vehicles.filter((v) => v.status === 'available').length}</b><span>Vehicles<br />available</span></li>
            <li><b>{products.filter((p) => p.stock > 0).length}</b><span>Mags &amp; accessories<br />in stock</span></li>
            <li><b>{brands}</b><span>Brands<br />to choose from</span></li>
          </ul>
          <Link className="home__cta" to="/about">About Migs Auto</Link>
        </div>
        <div className="rx-about__art" aria-hidden="true">
          <img src="/logo.png" alt="" width={360} height={360} />
        </div>
      </section>

      <section className="rx-section" aria-labelledby="rx-feat">
        <p className="rx-eyebrow rx-eyebrow--center">Featured</p>
        <h2 className="rx-h2 rx-h2--center" id="rx-feat">Top Features, Top Rides</h2>
        <div className="rx-tabs" role="tablist" aria-label="Filter featured vehicles">
          {([['all', 'All'], ['car', 'Cars'], ['motorcycle', 'Motorcycles']] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        {featured.length === 0 ? (
          <p className="rx-empty">New vehicles are on the way. <Link to="/contact">Ask us what is coming in</Link>.</p>
        ) : (
          <ul className="vgrid" role="list">{featured.map((v) => <li key={v.id}><VehicleCard v={v} /></li>)}</ul>
        )}
        <p className="rx-center"><Link className="rx-ghost" to="/inventory">View all inventory <ArrowRight size={16} aria-hidden="true" /></Link></p>
      </section>

      <section className="rx-section rx-cta" aria-labelledby="rx-cta">
        <img className="rx-cta__bike is-photo" src={hero_.src} alt="" aria-hidden="true" width={Math.round(340 * hero_.w / hero_.h)} height={340} loading="lazy" />
        <div className="rx-cta__copy">
          <h2 className="rx-h2" id="rx-cta">Ready to Ride? Book a Test Drive</h2>
          <p>Pick a vehicle, choose a date and time, and we will confirm. Questions first? Message us and we will help you find the right fit.</p>
          <div className="rx-hero__actions">
            <Link className="home__cta" to="/test-drive">Book a test drive</Link>
            <a className="rx-ghost" href={`https://wa.me/${profile.whatsapp}`} target="_blank" rel="noopener noreferrer"><Gear size={16} aria-hidden="true" /> Message on WhatsApp</a>
          </div>
        </div>
      </section>
    </div>
  )
}
