import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listVehicles } from '@/lib/db'
import { filterVehicles } from '@/lib/inventory'
import { parseMoneyInput } from '@/lib/money'
import { categoriesForType } from '@/lib/categories'
import type { Vehicle, VehicleType } from '@/types/vehicle'
import VehicleCard from './VehicleCard'
import MoneyInput from '@/components/MoneyInput'

const num = (s: string) => (s === '' ? undefined : parseMoneyInput(s))

export default function InventoryView() {
  const [params, setParams] = useSearchParams()
  const [all, setAll] = useState<Vehicle[] | null>(null)
  const [brand, setBrand] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minYear, setMinYear] = useState('')
  const t = params.get('type')
  const type: VehicleType | undefined = t === 'car' || t === 'motorcycle' ? t : undefined
  const category = params.get('category') ?? ''

  useEffect(() => {
    let live = true
    listVehicles().then((l) => live && setAll(l)).catch(() => live && setAll([]))
    return () => { live = false }
  }, [])

  const brands = useMemo(() => [...new Set((all ?? []).map((v) => v.brand))].sort(), [all])
  const styles = useMemo(() => {
    const pool = (all ?? []).filter((v) => !type || v.type === type)
    const n = new Map<string, number>()
    pool.forEach((v) => v.category && n.set(v.category, (n.get(v.category) ?? 0) + 1))
    const order = type ? categoriesForType(type) : [...categoriesForType('car'), ...categoriesForType('motorcycle')]
    return order.filter((c) => n.has(c.id)).map((c) => ({ ...c, n: n.get(c.id) ?? 0 }))
  }, [all, type])
  const setStyle = (id: string) => { const next = new URLSearchParams(params); if (id) next.set('category', id); else next.delete('category'); setParams(next) }
  const shown = useMemo(
    () => filterVehicles(all ?? [], { type, category: category || undefined, brand: brand || undefined, minPrice: num(minPrice), maxPrice: num(maxPrice), minYear: num(minYear) }),
    [all, type, category, brand, minPrice, maxPrice, minYear],
  )
  const clear = () => { setParams({}); setBrand(''); setMinPrice(''); setMaxPrice(''); setMinYear('') }

  return (
    <section className="mpage">
      <h1 className="mpage__title">Inventory</h1>
      <div className="mfilters">
        {([['', 'All'], ['car', 'Cars'], ['motorcycle', 'Motorcycles']] as const).map(([k, label]) => (
          <button key={k} type="button" className={`mchip${(type ?? '') === k ? ' is-on' : ''}`} onClick={() => setParams(k ? { type: k } : {})}>{label}</button>
        ))}
        <select aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">All brands</option>
          {brands.map((b) => <option key={b}>{b}</option>)}
        </select>
        <MoneyInput aria-label="Minimum price" placeholder="Min ₱" value={minPrice} onChange={setMinPrice} />
        <MoneyInput aria-label="Maximum price" placeholder="Max ₱" value={maxPrice} onChange={setMaxPrice} />
        <input aria-label="Minimum year" inputMode="numeric" placeholder="Year from" value={minYear} onChange={(e) => setMinYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
      </div>
      {styles.length > 0 && (
        <div className="mfilters mfilters--styles" role="group" aria-label="Filter by body style">
          <button type="button" className={`mchip mchip--sm${category === '' ? ' is-on' : ''}`} onClick={() => setStyle('')}>All styles</button>
          {styles.map((c) => <button key={c.id} type="button" className={`mchip mchip--sm${category === c.id ? ' is-on' : ''}`} onClick={() => setStyle(c.id)}>{c.label} <small>{c.n}</small></button>)}
        </div>
      )}
      {all === null ? (
        <p className="mpage__note">Loading inventory...</p>
      ) : shown.length === 0 ? (
        <p className="mpage__note">No vehicles match. <button type="button" className="mlink" onClick={clear}>Clear filters</button></p>
      ) : (
        <ul className="vgrid" role="list">
          {shown.map((v) => <li key={v.id}><VehicleCard v={v} /></li>)}
        </ul>
      )}
    </section>
  )
}
