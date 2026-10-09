import { DEPOSIT_RATE } from '@/data/catalog'
import type { BookingRow, BookingStatus, PaymentStatus } from '@/lib/db'

/** Payment status of a booking from how much has been paid against its total. */
export function paymentStatusFor(paid: number, total: number): PaymentStatus {
  if (paid > 0 && total > 0 && paid >= total - 0.001) return 'fully_paid'
  if (paid > 0 && paid >= total * DEPOSIT_RATE - 0.001) return 'deposit_paid'
  return 'pending'
}

/** The booking fields to update when a payment of `paid` has been recorded. A new booking becomes Confirmed once the deposit is in. */
export function paymentPatch(paid: number, total: number, current: BookingStatus): Partial<BookingRow> {
  const payment_status = paymentStatusFor(paid, total)
  return {
    amount_paid: paid,
    payment_status,
    deposit_paid: payment_status !== 'pending',
    ...(payment_status !== 'pending' && current === 'new' ? { status: 'confirmed' as const } : {}),
  }
}

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  pending: 'Payment pending',
  deposit_paid: 'Deposit paid',
  fully_paid: 'Fully paid',
}
