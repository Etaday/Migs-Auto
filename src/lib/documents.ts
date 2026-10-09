import type { DocKind, SaleDocument } from '@/types/document'
import { formatPeso as peso } from './inventory'
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


/** WhatsApp wants the country code and digits only. Philippine numbers (09xx, +63 9xx, 9xx) all become 639xx. */
export function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('63')) return d
  if (d.startsWith('0')) return '63' + d.slice(1)
  if (d.length === 10 && d.startsWith('9')) return '63' + d
  return d
}

/** The message sent with a document: who, which, how much, and where to open it. */
export function shareMessage(d: SaleDocument, link: string): string {
  const t = totals(d.price, d.discount, paidToDate(d))
  const receipt = d.kind === 'receipt'
  const lines = [
    `Hello ${d.buyer_name.trim() || 'there'},`,
    receipt
      ? `Here is your receipt ${d.number} from Migs Auto for the ${d.vehicle_title}.`
      : `Here is your invoice ${d.number} from Migs Auto for the ${d.vehicle_title}.`,
    `Total: ${peso(t.total)}`,
    receipt ? `Payment received: ${peso(d.amount_paid)}` : `Paid so far: ${peso(t.paid)}`,
    `Balance: ${peso(t.balance)}`,
  ]
  if (link) lines.push('', `View or save it here: ${link}`)
  lines.push('', 'Thank you for choosing Migs Auto.')
  return lines.join('\n')
}

const subject = (d: SaleDocument) => `${d.kind === 'receipt' ? 'Receipt' : 'Invoice'} ${d.number} from Migs Auto`

export function mailtoLink(d: SaleDocument, link: string): string {
  return `mailto:${encodeURIComponent(d.buyer_email.trim())}?subject=${encodeURIComponent(subject(d))}&body=${encodeURIComponent(shareMessage(d, link))}`
}

export function whatsappShareLink(d: SaleDocument, link: string): string {
  return `https://wa.me/${waNumber(d.buyer_phone)}?text=${encodeURIComponent(shareMessage(d, link))}`
}
