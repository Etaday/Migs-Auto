import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listProducts } from '@/lib/db'
import { filterProducts, stockLabel } from '@/lib/products'
import { formatPeso } from '@/lib/inventory'
import type { Product, ProductCategory } from '@/types/product'

export const PLACEHOLDER = '/vehicle-placeholder.svg'

export function ProductCard({ p }: { p: Product }) {
  return (
    <Link to={`/accessories/${p.id}`} className="vcard">
      <span className="vcard__media">
        <img src={p.photos[0] || PLACEHOLDER} alt={p.name} loading="lazy" />
        {p.stock <= 0 && <span className="vcard__tag vcard__tag--sold">Out of stock</span>}
      </span>
      <span className="vcard__body">
        <span className="vcard__title">{p.name}</span>
        <span className="vcard__meta">{[p.brand, p.size, p.condition === 'new' ? 'Brand new' : 'Used'].filter(Boolean).join(' · ')}</span>
        <span className="vcard__price">{formatPeso(p.price)}</span>
        <span className="vcard__meta">{stockLabel(p.stock)}</span>
      </span>
    </Link>
  )
}

export default function AccessoriesView() {
  const [params, setParams] = useSearchParams()
  const [all, setAll] = useState<Product[] | null>(null)
  const [query, setQuery] = useState('')
  const c = params.get('category')
  const category: ProductCategory | undefined = c === 'mags' || c === 'accessories' ? c : undefined

  useEffect(() => {
    let live = true
    listProducts().then((l) => live && setAll(l)).catch(() => live && setAll([]))
    return () => { live = false }
  }, [])
  const shown = useMemo(() => filterProducts(all ?? [], { category, query }), [all, category, query])

  return (
    <section className="mpage">
      <h1 className="mpage__title">Mags &amp; Accessories</h1>
      <div className="mfilters">
        {([['', 'All'], ['mags', 'Mags'], ['accessories', 'Accessories']] as const).map(([k, label]) => (
          <button key={k} type="button" className={`mchip${(category ?? '') === k ? ' is-on' : ''}`} onClick={() => setParams(k ? { category: k } : {})}>{label}</button>
        ))}
        <input aria-label="Search" placeholder="Search brand, size or what it fits" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 'min(320px, 100%)' }} />
      </div>
      {all === null ? <p className="mpage__note">Loading...</p> : shown.length === 0 ? (
        <p className="mpage__note">Nothing matches. <button type="button" className="mlink" onClick={() => { setParams({}); setQuery('') }}>Clear filters</button></p>
      ) : (
        <ul className="vgrid" role="list">{shown.map((p) => <li key={p.id}><ProductCard p={p} /></li>)}</ul>
      )}
    </section>
  )
}
