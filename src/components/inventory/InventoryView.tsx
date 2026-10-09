import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listVehicles } from '@/lib/db'
import { filterVehicles } from '@/lib/inventory'
import type { Vehicle, VehicleType } from '@/types/vehicle'
import VehicleCard from './VehicleCard'

const num = (s: string) => (s === '' ? undefined : Number(s))

export default function InventoryView() {
  const [params, setParams] = useSearchParams()
  const [all, setAll] = useState<Vehicle[] | null>(null)
  const [brand, setBrand] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minYear, setMinYear] = useState('')
  const t = params.get('type')
  const type: VehicleType | undefined = t === 'car' || t === 'motorcycle' ? t : undefined

  useEffect(() => {
    let live = true
    listVehicles().then((l) => live && setAll(l)).catch(() => live && setAll([]))
    return () => { live = false }
  }, [])

  const brands = useMemo(() => [...new Set((all ?? []).map((v) => v.brand))].sort(), [all])
  const shown = useMemo(
    () => filterVehicles(all ?? [], { type, brand: brand || undefined, minPrice: num(minPrice), maxPrice: num(maxPrice), minYear: num(minYear) }),
    [all, type, brand, minPrice, maxPrice, minYear],
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
        <input aria-label="Minimum price" inputMode="numeric" placeholder="Min ₱" value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))} />
        <input aria-label="Maximum price" inputMode="numeric" placeholder="Max ₱" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))} />
        <input aria-label="Minimum year" inputMode="numeric" placeholder="Year from" value={minYear} onChange={(e) => setMinYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
      </div>
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
