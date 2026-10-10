export type VehicleType = 'car' | 'motorcycle'
export type VehicleStatus = 'available' | 'reserved' | 'sold'
export type InquiryKind = 'inquiry' | 'trade_in' | 'financing' | 'test_drive'
export type InquiryStatus = 'new' | 'contacted' | 'closed'

export type Vehicle = {
  id: string
  type: VehicleType
  brand: string
  model: string
  year: number
  price: number
  mileage: number
  transmission: string
  fuel: string
  color: string
  description: string
  photos: string[]
  /** Walk-around videos: uploaded files or YouTube / other links. */
  videos: string[]
  status: VehicleStatus
  featured: boolean
  /** 17-character VIN, empty when unknown. */
  vin: string
  engine: string
  body: string
  /** Body style id from lib/categories (blank until chosen). */
  category: string
  /** Aftermarket or dealer modifications, one per entry. */
  modifications: string[]
  /** What Migs paid for it; admin only. */
  cost: number
  sold_price: number | null
  sold_at: string | null
  created_at: string
}

export type Inquiry = {
  id: string
  kind: InquiryKind
  vehicle_id: string | null
  name: string
  phone: string
  email: string
  message: string
  /** What it was about: a vehicle body style or a shop group (blank for general questions). */
  category: string
  details: Record<string, unknown>
  status: InquiryStatus
  created_at: string
}
