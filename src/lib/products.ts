import { cleanNotes } from './enhance'
import { formatPeso } from './inventory'
import type { Product, ProductCategory } from '../types/product'

export type ProductFilter = { category?: ProductCategory; query?: string; inStockOnly?: boolean; includeUnlisted?: boolean }

export function filterProducts(list: Product[], f: ProductFilter): Product[] {
  const q = (f.query ?? '').trim().toLowerCase()
  return list.filter(
    (p) =>
      (f.includeUnlisted || p.listed) &&
      (!f.category || p.category === f.category) &&
      (!f.inStockOnly || p.stock > 0) &&
      (!q || `${p.name} ${p.brand} ${p.size} ${p.fits}`.toLowerCase().includes(q)),
  )
}

export function stockLabel(stock: number): string {
  if (!Number.isFinite(stock) || stock <= 0) return 'Out of stock'
  return stock <= 3 ? `Only ${stock} left` : 'In stock'
}

/** Gives a stored product every field, so a record from an older version never crashes a screen. */
export function productWithDefaults(p: Partial<Product>): Product {
  return {
    id: '', created_at: '', category: 'accessories', name: '', brand: '', size: '', fits: '', condition: 'new', price: 0, stock: 0, description: '', listed: true,
    ...p,
    photos: Array.isArray(p.photos) ? p.photos : [],
    videos: Array.isArray(p.videos) ? p.videos : [],
  }
}

/** Tidies the owner's notes and writes the factual parts from the product's own fields. Never invents anything. Stable when run twice. */
export function enhanceProductDescription(p: Product, text: string): string {
  const title = p.brand && !p.name.toLowerCase().includes(p.brand.toLowerCase()) ? `${p.brand} ${p.name}` : p.name
  const parts: string[] = []
  if (title && !text.includes(title)) {
    parts.push(`${title} in ${p.condition === 'new' ? 'brand new' : 'used'} condition.`)
    if (p.size.trim()) parts.push(`Size: ${p.size.trim()}.`)
    if (p.fits.trim()) parts.push(`Fits: ${p.fits.trim()}.`)
  }
  parts.push(...cleanNotes(text))
  if (p.price > 0 && !/Price ₱/.test(text)) parts.push(`Price ${formatPeso(p.price)}.`, 'Message us to reserve yours.')
  return parts.join(' ')
}
