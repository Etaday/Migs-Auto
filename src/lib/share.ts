import { totalsOf, moneyFor, pretty, type Doc } from '@/lib/invoiceDoc'
import { profile } from '@/data/profile'

/** Links and message text for sending an invoice or receipt by email or WhatsApp. */

export const docLink = (token: string) => `${window.location.origin}/d/${token}`

/** Kuwait numbers are 8 digits; add the country code when it is missing. */
export function waDigits(phone: string): string {
  const d = phone.replace(/\D/g, '').replace(/^00/, '')
  return d.length === 8 ? `965${d}` : d
}

export function shareText(doc: Doc, link: string): { subject: string; body: string } {
  const t = totalsOf(doc)
  const money = moneyFor(doc.currency)
  const what = t.isQuotation ? 'quotation' : t.isReceipt ? 'receipt' : 'invoice'
  const name = doc.clientName ? ` ${doc.clientName}` : ''
  const lines = [
    `Hello${name},`,
    '',
    `Here is your ${what} ${doc.number} from ${profile.name}.`,
    `Total: ${money(t.total)}${t.isQuotation ? `${doc.validUntil ? ` | Valid until ${pretty(doc.validUntil)}` : ''}` : t.isReceipt ? ` | Received: ${money(t.paid)} | Balance: ${money(t.balance)}` : t.paid > 0 ? ` | Deposit paid: ${money(t.paid)} | Balance due: ${money(t.balance)}` : ''}`,
    '',
    `View or download it here: ${link}`,
    '',
    `Thank you,`,
    profile.name,
  ]
  return { subject: `${t.isQuotation ? 'Quotation' : t.isReceipt ? 'Receipt' : 'Invoice'} ${doc.number} - ${profile.name}`, body: lines.join('\n') }
}

export function emailHref(to: string, doc: Doc, link: string) {
  const { subject, body } = shareText(doc, link)
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function whatsappHref(phone: string, doc: Doc, link: string) {
  const { body } = shareText(doc, link)
  const d = waDigits(phone)
  return `https://wa.me/${d}?text=${encodeURIComponent(body)}`
}
