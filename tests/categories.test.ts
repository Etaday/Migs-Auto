import { describe, it, expect } from 'vitest'
import { VEHICLE_CATEGORIES, PRODUCT_GROUPS, categoryLabel, suggestVehicleCategory, categoriesForType, groupsForCategory, isValidVehicleCategory } from '../src/lib/categories'
import { filterVehicles } from '../src/lib/inventory'
import { filterProducts } from '../src/lib/products'
import { salesByCategory } from '../src/lib/dealer'
import type { Vehicle } from '../src/types/vehicle'
import type { Product } from '../src/types/product'

describe('category lists', () => {
  it('have cars and motorcycles, each with unique ids', () => {
    for (const t of ['car', 'motorcycle'] as const) {
      const ids = VEHICLE_CATEGORIES[t].map((c) => c.id)
      expect(ids.length).toBeGreaterThanOrEqual(5); expect(new Set(ids).size).toBe(ids.length)
    }
  })
  it('have groups for mags and for accessories', () => {
    expect(PRODUCT_GROUPS.mags.length).toBeGreaterThanOrEqual(2); expect(PRODUCT_GROUPS.accessories.length).toBeGreaterThanOrEqual(4)
  })
  it('list the categories of one type, or of a product category', () => {
    expect(categoriesForType('car').map((c) => c.id)).toContain('suv')
    expect(categoriesForType('motorcycle').map((c) => c.id)).toContain('scooter')
    expect(groupsForCategory('accessories').map((g) => g.id)).toContain('electronics')
  })
})

describe('categoryLabel', () => {
  it('turns an id into the words people read', () => {
    expect(categoryLabel('suv')).toBe('SUV / Crossover'); expect(categoryLabel('car-mags')).toBe('Car mags')
  })
  it('says Uncategorized for blank or unknown', () => { expect(categoryLabel('')).toBe('Uncategorized'); expect(categoryLabel('zzz')).toBe('Uncategorized') })
})

describe('isValidVehicleCategory', () => {
  it('only accepts a category that belongs to the vehicle type', () => {
    expect(isValidVehicleCategory('car', 'suv')).toBe(true); expect(isValidVehicleCategory('car', 'scooter')).toBe(false); expect(isValidVehicleCategory('motorcycle', '')).toBe(true)
  })
})

describe('suggestVehicleCategory (from the body style the VIN lookup returns)', () => {
  it('maps car bodies', () => {
    expect(suggestVehicleCategory('car', 'Sedan/Saloon')).toBe('sedan'); expect(suggestVehicleCategory('car', 'Hatchback/Liftback/Notchback')).toBe('hatchback')
    expect(suggestVehicleCategory('car', 'Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)')).toBe('suv'); expect(suggestVehicleCategory('car', 'Pickup')).toBe('pickup')
    expect(suggestVehicleCategory('car', 'Minivan')).toBe('van'); expect(suggestVehicleCategory('car', 'Coupe')).toBe('coupe')
  })
  it('maps motorcycle styles', () => {
    expect(suggestVehicleCategory('motorcycle', 'Cruiser')).toBe('cruiser'); expect(suggestVehicleCategory('motorcycle', 'Motorcycle - Custom')).toBe('cruiser'); expect(suggestVehicleCategory('motorcycle', 'Sport Bike')).toBe('sport'); expect(suggestVehicleCategory('motorcycle', 'Scooter')).toBe('scooter')
    expect(suggestVehicleCategory('motorcycle', 'Dual Sport')).toBe('adventure'); expect(suggestVehicleCategory('motorcycle', 'Off-road')).toBe('offroad')
  })
  it('suggests nothing rather than guess', () => {
    expect(suggestVehicleCategory('car', '')).toBe(''); expect(suggestVehicleCategory('car', 'Spaceship')).toBe(''); expect(suggestVehicleCategory('motorcycle', 'Sedan')).toBe('')
  })
})

const v = (o: Partial<Vehicle>): Vehicle => ({ id: 'x', type: 'car', brand: 'T', model: 'M', year: 2020, price: 100000, mileage: 0, transmission: '', fuel: '', color: '', description: '', photos: [], videos: [], status: 'available', featured: false, vin: '', engine: '', body: '', category: '', modifications: [], cost: 0, sold_price: null, sold_at: null, created_at: '2026-01-01', ...o })
describe('filter by category', () => {
  const list = [v({ id: 'a', category: 'sedan' }), v({ id: 'b', category: 'suv' }), v({ id: 'c', type: 'motorcycle', category: 'scooter' }), v({ id: 'd', category: '' })]
  it('vehicles', () => { expect(filterVehicles(list, { category: 'suv' }).map((x) => x.id)).toEqual(['b']); expect(filterVehicles(list, {}).length).toBe(4) })
  it('products by group', () => {
    const p = (id: string, subcategory: string): Product => ({ id, created_at: '', category: 'accessories', name: id, brand: '', size: '', fits: '', condition: 'new', price: 1, stock: 1, description: '', photos: [], videos: [], listed: true, subcategory })
    expect(filterProducts([p('a', 'electronics'), p('b', 'interior')], { subcategory: 'interior' }).map((x) => x.id)).toEqual(['b'])
  })
})

describe('salesByCategory', () => {
  const sold = (o: Partial<Vehicle>) => v({ status: 'sold', ...o })
  const rows = salesByCategory([sold({ category: 'suv', sold_price: 500000, cost: 400000 }), sold({ category: 'suv', sold_price: 300000, cost: 0 }), sold({ category: 'scooter', type: 'motorcycle', sold_price: 100000, cost: 80000 }), sold({ category: '', sold_price: 50000, cost: 40000 }), v({ category: 'suv', status: 'available' })])
  it('totals count, revenue and profit per category, biggest revenue first', () => {
    expect(rows[0]).toMatchObject({ category: 'suv', count: 2, revenue: 800000, profit: 100000 })
    expect(rows.map((r) => r.category)).toEqual(['suv', 'scooter', ''])
  })
  it('ignores unsold vehicles and counts a missing cost as no profit', () => { expect(rows.reduce((s, r) => s + r.count, 0)).toBe(4) })
})
