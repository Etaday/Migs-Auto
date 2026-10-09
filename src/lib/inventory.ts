import type { Vehicle, VehicleType } from '@/types/vehicle'

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

export const formatPeso = (n: number) => '₱' + Math.round(n).toLocaleString('en-PH')
