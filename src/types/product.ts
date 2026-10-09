export type ProductCategory = 'mags' | 'accessories'
export type ProductCondition = 'new' | 'used'

/** A mag wheel set or an accessory sold alongside the vehicles. */
export type Product = {
  id: string
  created_at: string
  category: ProductCategory
  name: string
  brand: string
  /** e.g. 17 inch, 5x114.3 */
  size: string
  /** What it fits, e.g. "Honda City, Civic" */
  fits: string
  condition: ProductCondition
  price: number
  stock: number
  description: string
  photos: string[]
  videos: string[]
  /** Hidden from the website when false. */
  listed: boolean
}
