import { describe, it, expect } from 'vitest'
import { totals, nextNumber, validateDocument, draftFromVehicle, paidToDate, receiptDraft } from '../src/lib/documents'
import type { SaleDocument } from '../src/types/document'
import type { Vehicle } from '../src/types/vehicle'

const doc = (o: Partial<SaleDocument> = {}): SaleDocument => ({
  id: 'd', created_at: '', kind: 'invoice', number: 'MA-INV-2026-0001', issued_on: '2026-10-09', vehicle_id: null, vehicle_title: '2021 Toyota Vios', vin: '', color: '',
  engine: '', mileage: 0, buyer_name: 'Ana Cruz', buyer_phone: '0917', buyer_email: '', buyer_address: '', price: 640000, discount: 0, paid_before: 0, amount_paid: 0, method: 'Cash', notes: '', ...o,
})

describe('totals', () => {
  it('subtracts the discount and reports an unpaid balance', () => {
    expect(totals(640000, 40000, 0)).toEqual({ total: 600000, paid: 0, balance: 600000, status: 'unpaid' })
  })
  it('reports a partial payment', () => {
    expect(totals(600000, 0, 150000)).toEqual({ total: 600000, paid: 150000, balance: 450000, status: 'partial' })
  })
  it('reports fully paid', () => {
    expect(totals(600000, 0, 600000).status).toBe('paid')
  })
  it('never lets a payment exceed the total or a discount exceed the price', () => {
    expect(totals(500000, 0, 900000)).toMatchObject({ paid: 500000, balance: 0, status: 'paid' })
    expect(totals(500000, 900000, 0)).toMatchObject({ total: 0 })
  })
  it('treats bad numbers as zero', () => {
    expect(totals(NaN, NaN, NaN)).toEqual({ total: 0, paid: 0, balance: 0, status: 'unpaid' })
  })
})

describe('nextNumber', () => {
  const now = new Date('2026-10-09T10:00:00Z')
  it('starts at 0001 for the year and kind', () => {
    expect(nextNumber('invoice', [], now)).toBe('MA-INV-2026-0001')
    expect(nextNumber('receipt', [], now)).toBe('MA-REC-2026-0001')
  })
  it('continues after the highest number, even if one was deleted', () => {
    const existing = [doc({ number: 'MA-INV-2026-0001' }), doc({ number: 'MA-INV-2026-0004' }), doc({ kind: 'receipt', number: 'MA-REC-2026-0009' })]
    expect(nextNumber('invoice', existing, now)).toBe('MA-INV-2026-0005')
  })
  it('restarts each year', () => {
    expect(nextNumber('invoice', [doc({ number: 'MA-INV-2025-0030' })], now)).toBe('MA-INV-2026-0001')
  })
})

describe('validateDocument', () => {
  it('needs a buyer name', () => expect(validateDocument(doc({ buyer_name: ' ' }))).toMatch(/buyer/i))
  it('needs a price', () => expect(validateDocument(doc({ price: 0 }))).toMatch(/price/i))
  it('needs a payment on a receipt', () => expect(validateDocument(doc({ kind: 'receipt', amount_paid: 0 }))).toMatch(/payment/i))
  it('rejects a discount above the price', () => expect(validateDocument(doc({ discount: 700000 }))).toMatch(/discount/i))
  it('accepts a normal invoice and a normal receipt', () => {
    expect(validateDocument(doc())).toBeNull()
    expect(validateDocument(doc({ kind: 'receipt', amount_paid: 100000 }))).toBeNull()
  })
})

describe('draftFromVehicle', () => {
  const car = { id: 'v1', year: 2021, brand: 'Toyota', model: 'Vios', vin: 'ABC', color: 'White', engine: '1.3L', mileage: 28000, price: 640000, sold_price: 620000 } as Vehicle
  it('copies the vehicle and uses the sold price when there is one', () => {
    const d = draftFromVehicle(car)
    expect(d).toMatchObject({ vehicle_id: 'v1', vehicle_title: '2021 Toyota Vios', vin: 'ABC', price: 620000 })
  })
  it('falls back to the asking price', () => {
    expect(draftFromVehicle({ ...car, sold_price: null }).price).toBe(640000)
  })
})

describe('payments across an invoice and its receipts', () => {
  it('adds earlier payments to this one', () => {
    expect(paidToDate(doc({ paid_before: 100000, amount_paid: 220000 }))).toBe(320000)
    expect(paidToDate({ ...doc({ amount_paid: 5 }), paid_before: undefined as unknown as number })).toBe(5)
  })
  it('a receipt for the rest of an invoice leaves a zero balance', () => {
    const invoice = doc({ price: 320000, amount_paid: 100000 })
    const r = receiptDraft(invoice, '2026-10-20')
    expect(r).toMatchObject({ kind: 'receipt', paid_before: 100000, amount_paid: 220000, issued_on: '2026-10-20' })
    expect(totals(r.price, r.discount, paidToDate(r)).balance).toBe(0)
  })
  it('a receipt after a receipt keeps counting', () => {
    const first = receiptDraft(doc({ price: 300000, amount_paid: 50000 }), '2026-10-10')
    const second = receiptDraft({ ...first, id: 'r1', created_at: '', number: 'MA-REC-2026-0001', amount_paid: 100000 }, '2026-10-12')
    expect(second.paid_before).toBe(150000)
    expect(second.amount_paid).toBe(150000)
  })
  it('does not carry the old document id or number', () => {
    const r = receiptDraft(doc(), '2026-10-20') as Record<string, unknown>
    expect(r.id).toBeUndefined(); expect(r.number).toBeUndefined()
  })
})
