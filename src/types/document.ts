export type DocKind = 'invoice' | 'receipt'

/** An invoice or receipt for a vehicle sale. The vehicle is copied in, so the document stays right if the listing is edited or deleted. */
export type SaleDocument = {
  id: string
  created_at: string
  kind: DocKind
  /** e.g. MA-INV-2026-0001 */
  number: string
  /** Private, unguessable id for the link sent to the buyer. Empty on records made before links existed. */
  share_token?: string
  /** YYYY-MM-DD */
  issued_on: string
  vehicle_id: string | null
  vehicle_title: string
  /** The vehicle's body style when the document was made. */
  category?: string
  vin: string
  color: string
  engine: string
  mileage: number
  buyer_name: string
  buyer_phone: string
  buyer_email: string
  buyer_address: string
  price: number
  discount: number
  /** Paid on earlier documents for the same sale (0 on a first invoice). */
  paid_before: number
  /** Paid up to this invoice, or the payment this receipt confirms. */
  amount_paid: number
  method: string
  notes: string
}
