import type { Vehicle, VehicleType } from '../types/vehicle'

export type VehicleFilter = {
  type?: VehicleType
  brand?: string
  minPrice?: number
  maxPrice?: number
  minYear?: number
  includeSold?: boolean
}

export function filterVehicles(list: Vehicle[], f: VehicleFilter): Vehicle[] {
  return list.filter(
    (v) =>
      (f.includeSold || v.status !== 'sold') &&
      (!f.type || v.type === f.type) &&
      (!f.brand || v.brand === f.brand) &&
      (f.minPrice == null || v.price >= f.minPrice) &&
      (f.maxPrice == null || v.price <= f.maxPrice) &&
      (f.minYear == null || v.year >= f.minYear),
  )
}

/** ₱640,000 for whole amounts; centavos are shown only when there are some (₱150,000.50). */
export function formatPeso(n: number): string {
  const v = Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
  return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })
}

/** Gives a stored or fetched vehicle every field, so records saved by an older version never crash a screen. */
export function withDefaults(v: Partial<Vehicle>): Vehicle {
  return {
    id: '', type: 'car', brand: '', model: '', year: new Date().getFullYear(), price: 0, mileage: 0, transmission: '', fuel: '', color: '',
    description: '', status: 'available', featured: false, vin: '', engine: '', body: '', cost: 0, sold_price: null, sold_at: null, created_at: '',
    ...v,
    photos: Array.isArray(v.photos) ? v.photos : [],
    videos: Array.isArray(v.videos) ? v.videos : [],
    modifications: Array.isArray(v.modifications) ? v.modifications : [],
  }
}
