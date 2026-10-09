import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listProducts } from '@/lib/db'
import { stockLabel } from '@/lib/products'
import { formatPeso } from '@/lib/inventory'
import type { Product } from '@/types/product'
import InquiryForm from '@/components/forms/InquiryForm'
import { PLACEHOLDER } from './AccessoriesView'

export default function ProductDetail() {
  const { id } = useParams()
  const [list, setList] = useState<Product[] | null>(null)
  const [photo, setPhoto] = useState(0)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let live = true
    listProducts().then((l) => live && setList(l)).catch(() => live && setList([]))
    return () => { live = false }
  }, [])

  if (list === null) return <section className="mpage"><p className="mpage__note">Loading...</p></section>
  const p = list.find((x) => x.id === id)
  if (!p) {
    return (
      <section className="mpage">
        <h1 className="mpage__title">This item is no longer available</h1>
        <Link className="mbtn" to="/accessories">Back to Mags &amp; Accessories</Link>
      </section>
    )
  }
  const photos = p.photos.length ? p.photos : [PLACEHOLDER]
  const specs: [string, string][] = [
    ['Category', p.category === 'mags' ? 'Mags (wheels)' : 'Accessory'], ['Brand', p.brand], ['Size', p.size], ['Fits', p.fits],
    ['Condition', p.condition === 'new' ? 'Brand new' : 'Used'], ['Availability', stockLabel(p.stock)],
  ]
  return (
    <section className="mpage vdetail">
      <Link className="mlink" to="/accessories">&larr; Mags &amp; Accessories</Link>
      <div className="vdetail__grid">
        <div className="vdetail__gallery">
          <img className="vdetail__main" src={photos[Math.min(photo, photos.length - 1)]} alt={p.name} />
          {photos.length > 1 && (
            <div className="vdetail__thumbs">
              {photos.map((s, i) => <button key={s.slice(-30) + i} type="button" className={i === photo ? 'is-on' : ''} onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`}><img src={s} alt="" /></button>)}
            </div>
          )}
        </div>
        <div className="vdetail__info">
          <h1 className="mpage__title">{p.name}</h1>
          <p className="vdetail__price">{formatPeso(p.price)}</p>
          <dl className="vdetail__specs">{specs.map(([k, v]) => v && <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {p.description && <p>{p.description}</p>}
          {open ? (
            <InquiryForm kind="inquiry" details={{ product: p.name, product_id: p.id }} heading={`Ask about the ${p.name}`} submitLabel="Send inquiry" />
          ) : (
            <button type="button" className="mbtn" onClick={() => setOpen(true)}>{p.stock > 0 ? 'Inquire / Reserve' : 'Ask when it is back in stock'}</button>
          )}
        </div>
      </div>
    </section>
  )
}
