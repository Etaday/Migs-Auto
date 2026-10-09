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
