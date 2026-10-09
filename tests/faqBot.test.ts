import { describe, it, expect } from 'vitest'
import { answer, looksFilipino } from '../src/lib/faqBot'
import { profile } from '../src/data/profile'
import type { Vehicle } from '../src/types/vehicle'

const v = (o: Partial<Vehicle>): Vehicle => ({
  id: 'x', type: 'car', brand: 'Toyota', model: 'Vios', year: 2021, price: 640000, mileage: 0, transmission: '', fuel: '', color: '',
  description: '', photos: [], status: 'available', featured: false, vin: '', engine: '', body: '', modifications: [], cost: 0,
  sold_price: null, sold_at: null, created_at: '2026-01-01', ...o,
})
const stock = [
  v({ id: 'c1' }),
  v({ id: 'm1', type: 'motorcycle', brand: 'Honda', model: 'Click 160', year: 2023, price: 118000 }),
  v({ id: 'm2', type: 'motorcycle', brand: 'Yamaha', model: 'NMAX 155', year: 2022, price: 135000, status: 'sold' }),
]

describe('answer', () => {
  it('lists available motorcycles with prices and never a sold one', () => {
    const r = answer('do you have a motorcycle', 'en', stock)
    expect(r.text).toContain('Honda Click 160')
    expect(r.text).toContain('₱118,000')
    expect(r.text).not.toContain('NMAX')
  })
  it('says so when no motorcycle is available', () => {
    expect(answer('any motorcycle?', 'en', [stock[0]]).text).toMatch(/no motorcycles/i)
  })
  it('answers a specific model by name', () => {
    expect(answer('how much is the vios', 'en', stock).text).toContain('₱640,000')
  })
  it('gives the opening hours from the profile', () => {
    expect(answer('what are your hours', 'en', stock).text).toContain(profile.hours)
  })
  it('points financing questions to the financing page', () => {
    expect(answer('can I pay in installments', 'en', stock).links?.some((l) => l.to === '/financing')).toBe(true)
  })
  it('points trade-in questions to the trade-in page', () => {
    expect(answer('can I trade in my old car', 'en', stock).links?.some((l) => l.to === '/trade-in')).toBe(true)
  })
  it('points test drive questions to the test drive page', () => {
    expect(answer('i want a test drive', 'en', stock).links?.some((l) => l.to === '/test-drive')).toBe(true)
  })
  it('answers in Filipino when asked in Filipino', () => {
    const r = answer('magkano po ang motor', 'en', stock)
    expect(r.lang).toBe('fil')
    expect(looksFilipino('magkano po ang motor')).toBe(true)
  })
  it('hands unknown questions to the team instead of guessing', () => {
    const r = answer('what is the airspeed velocity of a swallow', 'en', stock)
    expect(r.links?.some((l) => l.to === '/contact')).toBe(true)
  })
  it('never talks about photo booths or event bookings', () => {
    const all = ['hi', 'what do you do', 'hours', 'contact', 'xyz'].map((q) => answer(q, 'en', stock).text).join(' ')
    expect(all).not.toMatch(/photo booth|event booking|studio/i)
  })
})
