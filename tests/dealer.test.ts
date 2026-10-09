import { describe, it, expect } from 'vitest'
import { dealerStats, profitOf } from '../src/lib/dealer'
import type { Vehicle, Inquiry } from '../src/types/vehicle'

const v = (o: Partial<Vehicle>): Vehicle => ({
  id: 'x', type: 'car', brand: 'Toyota', model: 'Vios', year: 2020, price: 600000, mileage: 0, transmission: '', fuel: '', color: '',
  description: '', photos: [], status: 'available', featured: false, vin: '', engine: '', body: '', modifications: [], cost: 500000,
  sold_price: null, sold_at: null, created_at: '2026-09-01T00:00:00Z', ...o,
})
const q = (o: Partial<Inquiry>): Inquiry => ({
  id: 'q', kind: 'inquiry', vehicle_id: null, name: 'A', phone: '1', email: '', message: '', details: {}, status: 'new', created_at: '2026-10-01T00:00:00Z', ...o,
})
const NOW = new Date('2026-10-09T12:00:00Z')

describe('profitOf', () => {
  it('is sold price minus cost', () => expect(profitOf(v({ sold_price: 650000, cost: 580000 }))).toBe(70000))
  it('is 0 for an unsold vehicle', () => expect(profitOf(v({}))).toBe(0))
})

describe('dealerStats', () => {
  const vehicles = [
    v({ id: 'a', price: 600000 }),
    v({ id: 'b', price: 400000, status: 'reserved' }),
    v({ id: 'c', status: 'sold', sold_price: 650000, cost: 580000, sold_at: '2026-10-03' }),
    v({ id: 'd', status: 'sold', sold_price: 300000, cost: 250000, sold_at: '2026-09-20' }),
  ]
  const inquiries = [
    q({ id: '1' }),
    q({ id: '2', status: 'contacted' }),
    q({ id: '3', kind: 'test_drive', details: { date: '2026-10-12', time: '10:00' } }),
    q({ id: '4', kind: 'test_drive', details: { date: '2026-10-01', time: '10:00' } }),
    q({ id: '5', kind: 'test_drive', status: 'closed', details: { date: '2026-10-15', time: '10:00' } }),
  ]
  const s = dealerStats(vehicles, inquiries, NOW)
  it('counts stock by status', () => { expect(s.available).toBe(1); expect(s.reserved).toBe(1) })
  it('values the stock still on the lot', () => expect(s.inventoryValue).toBe(1000000))
  it('counts only this month for sales and profit', () => { expect(s.soldThisMonth).toBe(1); expect(s.profitThisMonth).toBe(70000) })
  it('counts every inquiry still marked new', () => expect(s.newLeads).toBe(3))
  it('lists only open future test drives, soonest first', () => expect(s.upcomingTestDrives.map((x) => x.id)).toEqual(['3']))
  it('handles an empty dealership', () => {
    const e = dealerStats([], [], NOW)
    expect(e).toMatchObject({ available: 0, inventoryValue: 0, soldThisMonth: 0, profitThisMonth: 0, newLeads: 0 })
  })
})
