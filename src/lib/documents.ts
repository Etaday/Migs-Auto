import type { DocKind, SaleDocument } from '@/types/document'
import type { Vehicle } from '@/types/vehicle'

const num = (n: number) => (Number.isFinite(n) ? n : 0)
const cents = (n: number) => Math.round(n * 100) / 100

/** Money for one sale. A discount cannot exceed the price and a payment cannot exceed the total. */
export function totals(price: number, discount: number, amountPaid: number) {
  const p = Math.max(0, num(price))
  const total = cents(p - Math.min(Math.max(0, num(discount)), p))
  const paid = cents(Math.min(Math.max(0, num(amountPaid)), total))
  const balance = cents(total - paid)
  const status: 'paid' | 'partial' | 'unpaid' = total > 0 && balance === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
  return { total, paid, balance, status }
}

const PREFIX: Record<DocKind, string> = { invoice: 'MA-INV', receipt: 'MA-REC' }

/** MA-INV-2026-0001 style. Continues after the highest number used that year, so deleting a document never reuses a number. */
export function nextNumber(kind: DocKind, existing: Pick<SaleDocument, 'number'>[], now: Date): string {
  const head = `${PREFIX[kind]}-${now.getUTCFullYear()}-`
  const used = existing.filter((d) => d.number.startsWith(head)).map((d) => Number(d.number.slice(head.length)) || 0)
  return head + String(Math.max(0, ...used) + 1).padStart(4, '0')
}

export function validateDocument(d: SaleDocument): string | null {
  if (!d.buyer_name.trim()) return 'Enter the buyer name.'
  if (!(d.price > 0)) return 'Enter the vehicle price.'
  if (d.discount < 0 || d.discount > d.price) return 'The discount cannot be more than the price.'
  if (d.amount_paid < 0) return 'The payment cannot be negative.'
  if (d.kind === 'receipt' && !(d.amount_paid > 0)) return 'A receipt needs the payment received.'
  return null
}

/** The vehicle part of a new document, copied from the listing. */
export function draftFromVehicle(v: Vehicle): Pick<SaleDocument, 'vehicle_id' | 'vehicle_title' | 'vin' | 'color' | 'engine' | 'mileage' | 'price'> {
  return { vehicle_id: v.id, vehicle_title: `${v.year} ${v.brand} ${v.model}`, vin: v.vin, color: v.color, engine: v.engine, mileage: v.mileage, price: v.sold_price ?? v.price }
}

/** Everything paid for this sale up to and including this document. Records saved before `paid_before` existed count as 0. */
export const paidToDate = (d: Pick<SaleDocument, 'paid_before' | 'amount_paid'>) => num(d.paid_before ?? 0) + num(d.amount_paid)

/** A receipt draft for the rest of a sale: same buyer and vehicle, payment defaults to what is still owed. No id or number carries over. */
export function receiptDraft(d: SaleDocument, issuedOn: string): Omit<SaleDocument, 'id' | 'created_at' | 'number'> {
  const { id: _id, created_at: _c, number: _n, ...rest } = d
  void _id; void _c; void _n
  const before = paidToDate(d)
  const owed = totals(d.price, d.discount, before).balance
  return { ...rest, kind: 'receipt', issued_on: issuedOn, paid_before: before, amount_paid: owed }
}
