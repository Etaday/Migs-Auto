import { chargeFor, DEPOSIT_RATE } from '@/data/catalog'

/** The shape of an invoice or receipt, and how its totals are worked out. */

export type Kind = 'invoice' | 'receipt' | 'quotation'
export type Line = { id: number; desc: string; qty: number; rate: number }

export type Doc = {
  kind: Kind
  number: string
  issued: string
  due: string
  /** Quotations only: the last day the price holds. */
  validUntil?: string
  paidOn: string
  method: string
  currency: string
  clientName: string
  clientEmail: string
  clientPhone: string
  clientAddress: string
  eventTitle: string
  eventDate: string
  eventVenue: string
  lines: Line[]
  area: string
  discount: number
  taxPct: number
  deposit: number
  notes: string
  studioPhone: string
  studioAddress: string
  payTo: string
}

export const pretty = (s: string) => {
  if (!s) return ''
  const d = new Date(`${s}T00:00:00`)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function totalsOf(doc: Doc) {
  const itemsTotal = doc.lines.reduce((s, l) => s + l.qty * l.rate, 0)
  const location = chargeFor(doc.area) ?? 0
  const subtotal = itemsTotal + location
  const afterDiscount = Math.max(0, subtotal - doc.discount)
  const tax = afterDiscount * (doc.taxPct / 100)
  const total = afterDiscount + tax
  const isQuotation = doc.kind === 'quotation'
  const paid = isQuotation ? 0 : doc.kind === 'receipt' ? Math.min(doc.deposit || total, total) : doc.deposit
  const balance = Math.max(0, total - paid)
  return { location, subtotal, tax, total, paid, balance, isReceipt: doc.kind === 'receipt', isQuotation, depositDue: Math.round(total * DEPOSIT_RATE * 1000) / 1000 }
}

export const moneyFor = (currency: string) => (n: number) =>
  `${currency === 'KWD' ? 'KWD ' : currency}${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`

/** Quotations no longer mention a deposit. Earlier drafts and saved documents carry the old default note, so swap it on the way in. */
export const QUOTE_NOTE = 'To confirm, reply to accept this quotation and we will reserve your date.'
const OLD_QUOTE_NOTE = 'To confirm, reply to accept this quotation and pay the 30% deposit. The remaining 70% is paid at the venue on the event date.'
export const quoteNote = (doc: Pick<Doc, 'kind' | 'notes'>) => (doc.kind === 'quotation' && doc.notes === OLD_QUOTE_NOTE ? QUOTE_NOTE : doc.notes)
