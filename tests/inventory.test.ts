import { describe, it, expect } from 'vitest'
import { filterVehicles } from '../src/lib/inventory'
import type { Vehicle } from '../src/types/vehicle'

const v = (o: Partial<Vehicle>): Vehicle => ({
  id: 'x', type: 'car', brand: 'Toyota', model: 'Vios', year: 2020, price: 600000, mileage: 30000,
  transmission: 'Automatic', fuel: 'Gasoline', color: 'White', description: '', photos: [],
  status: 'available', featured: false, vin: '', engine: '', body: '', modifications: [], cost: 0,
  sold_price: null, sold_at: null, created_at: '2026-01-01', ...o,
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

import { withDefaults } from '../src/lib/inventory'

describe('withDefaults', () => {
  it('fills the fields a record saved by an older version is missing', () => {
    const old = { id: 'o', type: 'car', brand: 'Toyota', model: 'Vios', year: 2020, price: 1, mileage: 0, status: 'available', photos: [], created_at: '2026-01-01' } as unknown as Vehicle
    const v = withDefaults(old)
    expect(v.modifications).toEqual([])
    expect(v.vin).toBe('')
    expect(v.cost).toBe(0)
    expect(v.sold_price).toBeNull()
    expect(v.photos).toEqual([])
  })
  it('keeps values that are already there', () => {
    expect(withDefaults(v({ modifications: ['Exhaust'], cost: 5 })).modifications).toEqual(['Exhaust'])
  })
})

import { formatPeso } from '../src/lib/inventory'

describe('formatPeso', () => {
  it('shows whole amounts without decimals and with commas', () => {
    expect(formatPeso(640000)).toBe('₱640,000')
    expect(formatPeso(0)).toBe('₱0')
    expect(formatPeso(1234567)).toBe('₱1,234,567')
  })
  it('shows centavos when there are any, never rounding them away', () => {
    expect(formatPeso(150000.5)).toBe('₱150,000.50')
    expect(formatPeso(99.99)).toBe('₱99.99')
  })
  it('does not show float noise', () => {
    expect(formatPeso(0.1 + 0.2)).toBe('₱0.30')
    expect(formatPeso(19.999)).toBe('₱20')
  })
})
