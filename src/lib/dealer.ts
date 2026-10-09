import type { Vehicle, Inquiry } from '@/types/vehicle'

/** Profit on a sale. 0 until the cost is entered, so a missing cost is never counted as 100% profit. */
export const profitOf = (v: Vehicle) => (v.sold_price == null || !(v.cost > 0) ? 0 : v.sold_price - v.cost)

const monthKey = (iso: string) => iso.slice(0, 7)

/** Dashboard numbers. `now` is a parameter so the result is repeatable. */
export function dealerStats(vehicles: Vehicle[], inquiries: Inquiry[], now: Date) {
  const month = now.toISOString().slice(0, 7)
  const today = now.toISOString().slice(0, 10)
  const onLot = vehicles.filter((v) => v.status !== 'sold')
  const soldNow = vehicles.filter((v) => v.status === 'sold' && v.sold_at && monthKey(v.sold_at) === month)
  return {
    available: vehicles.filter((v) => v.status === 'available').length,
    reserved: vehicles.filter((v) => v.status === 'reserved').length,
    inventoryValue: onLot.reduce((s, v) => s + v.price, 0),
    soldThisMonth: soldNow.length,
    profitThisMonth: soldNow.reduce((s, v) => s + profitOf(v), 0),
    newLeads: inquiries.filter((i) => i.status === 'new').length,
    upcomingTestDrives: inquiries
      .filter((i) => i.kind === 'test_drive' && i.status !== 'closed' && String(i.details.date ?? '') >= today)
      .sort((a, b) => String(a.details.date).localeCompare(String(b.details.date)) || String(a.details.time ?? '').localeCompare(String(b.details.time ?? ''))),
  }
}

/** Whole days a vehicle has been in stock. */
export const daysInStock = (v: Vehicle, now: Date) => Math.max(0, Math.floor((now.getTime() - new Date(v.created_at).getTime()) / 864e5))
