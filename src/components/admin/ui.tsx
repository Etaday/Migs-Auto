import type { BookingStatus, ReviewStatus, PaymentStatus } from '@/lib/db'
import { PAYMENT_LABEL } from '@/lib/payments'
import { formatDate as longDate, formatTime } from '@/lib/booking'
import { money } from '@/data/catalog'

export { longDate, formatTime, money }

export const STATUS_LABEL: Record<BookingStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function StatusPill({ status }: { status: BookingStatus | ReviewStatus | 'handled' | 'open' }) {
  const label =
    status in STATUS_LABEL ? STATUS_LABEL[status as BookingStatus] : status.charAt(0).toUpperCase() + status.slice(1)
  return <span className={`adm-pill adm-pill--${status}`}>{label}</span>
}

export function PaymentPill({ status }: { status: PaymentStatus }) {
  return <span className={`adm-pill adm-pill--pay-${status}`}>{PAYMENT_LABEL[status]}</span>
}

export const shortDate = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export const todayIso = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function whatsappLink(phone: string) {
  const digits = phone.replace(/[^\d]/g, '')
  return digits ? `https://wa.me/${digits}` : ''
}

export function downloadCsv(name: string, rows: (string | number | boolean)[][]) {
  const esc = (v: string | number | boolean) => `"${String(v).replace(/"/g, '""')}"`
  const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
