import { describe, it, expect } from 'vitest'
import { filterVehicles } from '../src/lib/inventory'
import type { Vehicle } from '../src/types/vehicle'

const v = (o: Partial<Vehicle>): Vehicle => ({
  id: 'x', type: 'car', brand: 'Toyota', model: 'Vios', year: 2020, price: 600000, mileage: 30000,
  transmission: 'Automatic', fuel: 'Gasoline', color: 'White', description: '', photos: [],
  status: 'available', featured: false, created_at: '2026-01-01', ...o,
})
const list = [
  v({ id: 'a' }),
  v({ id: 'b', type: 'motorcycle', brand: 'Honda', year: 2022, price: 120000 }),
  v({ id: 'c', status: 'sold' }),
  v({ id: 'd', brand: 'Honda', year: 2018, price: 400000, status: 'reserved' }),
]
const ids = (l: Vehicle[]) => l.map((x) => x.id)

describe('filterVehicles', () => {
  it('hides sold vehicles by default', () => {
    expect(ids(filterVehicles(list, {}))).toEqual(['a', 'b', 'd'])
  })
  it('shows sold vehicles with includeSold', () => {
    expect(ids(filterVehicles(list, { includeSold: true }))).toContain('c')
  })
  it('filters by type', () => {
    expect(ids(filterVehicles(list, { type: 'motorcycle' }))).toEqual(['b'])
  })
  it('filters by brand', () => {
    expect(ids(filterVehicles(list, { brand: 'Honda' }))).toEqual(['b', 'd'])
  })
  it('filters by price range', () => {
    expect(ids(filterVehicles(list, { minPrice: 300000, maxPrice: 500000 }))).toEqual(['d'])
  })
  it('filters by minimum year', () => {
    expect(ids(filterVehicles(list, { minYear: 2021 }))).toEqual(['b'])
  })
  it('returns an empty list when nothing matches', () => {
    expect(filterVehicles(list, { brand: 'Ferrari' })).toEqual([])
  })
})
