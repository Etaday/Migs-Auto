import { describe, it, expect } from 'vitest'
import { filterProducts, stockLabel, enhanceProductDescription, productWithDefaults } from '../src/lib/products'
import type { Product } from '../src/types/product'

const p = (o: Partial<Product>): Product => ({
  id: 'x', created_at: '2026-01-01', category: 'mags', name: 'Enkei 17" Mags', brand: 'Enkei', size: '17 inch, 5x114.3', fits: 'Honda Civic', condition: 'new',
  price: 38000, stock: 4, description: '', photos: [], listed: true, ...o,
})
const list = [
  p({ id: 'a' }),
  p({ id: 'b', category: 'accessories', name: 'Dash cam', brand: 'Viofo', size: '', fits: '', price: 4500, stock: 10 }),
  p({ id: 'c', name: 'Rays 18" Mags', brand: 'Rays', stock: 0 }),
  p({ id: 'd', name: 'Hidden set', listed: false }),
]
const ids = (l: Product[]) => l.map((x) => x.id)

describe('filterProducts', () => {
  it('hides unlisted products and keeps sold-out ones visible by default', () => {
    expect(ids(filterProducts(list, {}))).toEqual(['a', 'b', 'c'])
  })
  it('can hide sold-out items', () => {
    expect(ids(filterProducts(list, { inStockOnly: true }))).toEqual(['a', 'b'])
  })
  it('filters by category', () => {
    expect(ids(filterProducts(list, { category: 'accessories' }))).toEqual(['b'])
  })
  it('searches name, brand, size and fits, ignoring case', () => {
    expect(ids(filterProducts(list, { query: 'viofo' }))).toEqual(['b'])
    expect(ids(filterProducts(list, { query: 'CIVIC' }))).toEqual(['a', 'c'])
    expect(ids(filterProducts(list, { query: 'zzz' }))).toEqual([])
  })
  it('admin view can include unlisted items', () => {
    expect(ids(filterProducts(list, { includeUnlisted: true }))).toContain('d')
  })
})

describe('stockLabel', () => {
  it('says out of stock at zero or below', () => { expect(stockLabel(0)).toBe('Out of stock'); expect(stockLabel(-2)).toBe('Out of stock') })
  it('warns when only a few are left', () => { expect(stockLabel(1)).toBe('Only 1 left'); expect(stockLabel(3)).toBe('Only 3 left') })
  it('says in stock otherwise', () => expect(stockLabel(4)).toBe('In stock'))
  it('copes with bad numbers', () => expect(stockLabel(NaN)).toBe('Out of stock'))
})

describe('enhanceProductDescription', () => {
  it('writes the facts from the fields when nothing was typed', () => {
    const t = enhanceProductDescription(p({}), '')
    expect(t).toContain('Enkei')
    expect(t).toContain('17 inch, 5x114.3')
    expect(t).toContain('Honda Civic')
    expect(t).toContain('₱38,000')
    expect(t).toMatch(/brand new|new/i)
  })
  it('tidies the owner notes and keeps them', () => {
    const t = enhanceProductDescription(p({}), 'set of 4 .  with lug nuts,no scratches')
    expect(t).toContain('Set of 4.')
    expect(t).toContain('With lug nuts, no scratches.')
  })
  it('says used for used items and omits what is unknown', () => {
    const t = enhanceProductDescription(p({ condition: 'used', fits: '', size: '' }), '')
    expect(t).toMatch(/used/i)
    expect(t).not.toMatch(/fits|undefined|NaN/i)
  })
  it('is stable when run twice', () => {
    const once = enhanceProductDescription(p({}), 'set of 4')
    expect(enhanceProductDescription(p({}), once)).toBe(once)
  })
})

describe('productWithDefaults', () => {
  it('fills missing fields', () => {
    const v = productWithDefaults({ id: 'z', name: 'Cover' } as Partial<Product>)
    expect(v.photos).toEqual([]); expect(v.stock).toBe(0); expect(v.listed).toBe(true)
  })
})
