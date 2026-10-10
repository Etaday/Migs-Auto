import type { VehicleType } from '../types/vehicle'
import type { ProductCategory } from '../types/product'

export type Cat = { id: string; label: string }

/** Body styles, per vehicle type. The id is what is stored; the label is what people read. */
export const VEHICLE_CATEGORIES: Record<VehicleType, Cat[]> = {
  car: [
    { id: 'sedan', label: 'Sedan' },
    { id: 'hatchback', label: 'Hatchback' },
    { id: 'suv', label: 'SUV / Crossover' },
    { id: 'pickup', label: 'Pickup' },
    { id: 'van', label: 'Van / MPV' },
    { id: 'coupe', label: 'Coupe / Sports' },
  ],
  motorcycle: [
    { id: 'scooter', label: 'Scooter' },
    { id: 'underbone', label: 'Underbone' },
    { id: 'sport', label: 'Sport' },
    { id: 'naked', label: 'Naked / Standard' },
    { id: 'cruiser', label: 'Cruiser' },
    { id: 'adventure', label: 'Adventure / Touring' },
    { id: 'offroad', label: 'Off-road / Dual-sport' },
  ],
}

/** Groups inside the shop, per product category. */
export const PRODUCT_GROUPS: Record<ProductCategory, Cat[]> = {
  mags: [
    { id: 'car-mags', label: 'Car mags' },
    { id: 'motorcycle-mags', label: 'Motorcycle mags' },
  ],
  accessories: [
    { id: 'safety-gear', label: 'Safety & gear' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'interior', label: 'Interior' },
    { id: 'exterior-lighting', label: 'Exterior & lighting' },
    { id: 'tools-care', label: 'Tools & care' },
  ],
}

const ALL: Cat[] = [...VEHICLE_CATEGORIES.car, ...VEHICLE_CATEGORIES.motorcycle, ...PRODUCT_GROUPS.mags, ...PRODUCT_GROUPS.accessories]

export const categoriesForType = (t: VehicleType): Cat[] => VEHICLE_CATEGORIES[t]
export const groupsForCategory = (c: ProductCategory): Cat[] => PRODUCT_GROUPS[c]
export const categoryLabel = (id: string): string => ALL.find((c) => c.id === id)?.label ?? 'Uncategorized'
/** A blank category is fine (not chosen yet); otherwise it must belong to the vehicle's type. */
export const isValidVehicleCategory = (t: VehicleType, id: string): boolean => id === '' || VEHICLE_CATEGORIES[t].some((c) => c.id === id)

/** A category suggested from the body style the VIN lookup returns. Blank when it is not clear: never a guess. */
export function suggestVehicleCategory(type: VehicleType, body: string): string {
  const b = body.toLowerCase()
  if (!b.trim()) return ''
  if (type === 'car') {
    if (/sedan|saloon/.test(b)) return 'sedan'
    if (/hatch/.test(b)) return 'hatchback'
    if (/sport utility|\bsuv\b|crossover/.test(b)) return 'suv'
    if (/pickup|truck/.test(b)) return 'pickup'
    if (/\bvan\b|minivan|\bmpv\b|multi-purpose/.test(b)) return 'van'
    if (/coupe|convertible|roadster|cabriolet/.test(b)) return 'coupe'
    return ''
  }
  if (/scooter|moped/.test(b)) return 'scooter'
  if (/underbone|\bcub\b|step-through/.test(b)) return 'underbone'
  if (/cruiser|chopper/.test(b)) return 'cruiser'
  if (/dual|adventure|touring/.test(b)) return 'adventure'
  if (/off.?road|motocross|enduro|trail/.test(b)) return 'offroad'
  if (/naked|standard|street|roadster/.test(b)) return 'naked'
  if (/sport|race|fairing/.test(b)) return 'sport'
  return ''
}
