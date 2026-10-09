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
  status: VehicleStatus
  featured: boolean
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
  details: Record<string, unknown>
  status: InquiryStatus
  created_at: string
}
