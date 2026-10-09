import { profile } from '@/data/profile'
import { formatPeso } from '@/lib/inventory'
import type { Vehicle } from '@/types/vehicle'

/**
 * The FAQ assistant, in English and Filipino. It is a rule-based helper, not an
 * AI: it answers from the live inventory and from the dealership's own details
 * (src/data/profile.ts), so it can only say things that are on the site.
 * Anything it cannot answer is handed to the team. A visitor writing in
 * Filipino/Tagalog gets Filipino answers automatically, or the language switch
 * can force it.
 */

export type Lang = 'en' | 'fil'
export type BotLink = { label: string; to?: string; href?: string }
export type BotReply = { text: string; links?: BotLink[]; lang?: Lang }

export const STARTERS: Record<Lang, string[]> = {
  en: ['What cars do you have?', 'Do you have motorcycles?', 'Can I pay in installments?', 'Can I trade in my vehicle?', 'How do I book a test drive?'],
  fil: ['Anong mga kotse ang meron kayo?', 'Meron ba kayong motor?', 'Pwede ba hulugan?', 'Pwede ko bang i-trade in ang sasakyan ko?', 'Paano mag-test drive?'],
}

export const WELCOME: Record<Lang, string> = {
  en: 'Hi! I am the Migs Auto assistant. Ask me about our cars and motorcycles, prices, financing, trade-ins or test drives. Pwede rin po sa Filipino.',
  fil: 'Kumusta po! Ako ang assistant ng Migs Auto. Magtanong po kayo tungkol sa mga kotse at motor, presyo, financing, trade-in o test drive. English is okay too.',
}

const norm = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const has = (t: string, ws: string[]) => ws.some((w) => t.includes(w))

/** Words that only appear in Filipino/Tagalog (matched as whole words). */
const FIL_WORDS = [
  'magkano', 'presyo', 'ilan', 'paano', 'saan', 'pwede', 'puwede', 'po', 'opo', 'kayo', 'ninyo', 'niyo', 'namin', 'kami', 'ako', 'mag', 'bayad', 'bayaran',
  'hindi', 'ano', 'anong', 'meron', 'mayroon', 'gusto', 'salamat', 'kumusta', 'kamusta', 'musta', 'ang', 'ng', 'sa', 'ba', 'lang', 'din', 'rin', 'lugar',
  'hulog', 'hulugan', 'sasakyan', 'kotse', 'motor', 'tawag', 'numero', 'gaano', 'oras', 'tulong', 'sige', 'magandang',
]
export function looksFilipino(input: string): boolean {
  const words = new Set(norm(input).split(' '))
  const hits = FIL_WORDS.filter((w) => words.has(w)).length
  return hits >= 2 || ['magkano', 'presyo', 'bayad', 'paano', 'salamat', 'kumusta', 'kamusta', 'po', 'hulog', 'hulugan'].some((w) => words.has(w))
}

const EN_WORDS = new Set([
  'the', 'is', 'are', 'what', 'how', 'much', 'do', 'you', 'your', 'can', 'i', 'we', 'my', 'me', 'to', 'for', 'and', 'with', 'price', 'cost', 'have', 'need', 'want',
  'please', 'thanks', 'thank', 'hello', 'hi', 'contact', 'phone', 'available', 'car', 'cars', 'any',
])

/** Which language a message is written in, or null when it is too short to tell (a model name, a number). */
export function detectLang(input: string): Lang | null {
  if (looksFilipino(input)) return 'fil'
  return norm(input).split(' ').some((w) => EN_WORDS.has(w)) ? 'en' : null
}

const L = (lang: Lang, en: string, fil: string) => (lang === 'fil' ? fil : en)
const title = (v: Vehicle) => `${v.year} ${v.brand} ${v.model}`

function linksFor(lang: Lang) {
  return {
    inventory: { label: L(lang, 'View inventory', 'Tingnan ang inventory'), to: '/inventory' } as BotLink,
    testDrive: { label: L(lang, 'Book a test drive', 'Mag-book ng test drive'), to: '/test-drive' } as BotLink,
    financing: { label: L(lang, 'Financing calculator', 'Financing calculator'), to: '/financing' } as BotLink,
    tradeIn: { label: L(lang, 'Request a trade-in value', 'Humingi ng trade-in value'), to: '/trade-in' } as BotLink,
    contact: [
      { label: L(lang, `Call ${profile.phone}`, `Tawagan ang ${profile.phone}`), href: `tel:${profile.phoneTel}` },
      { label: L(lang, 'Message us', 'Mag-message sa amin'), to: '/contact' },
    ] as BotLink[],
  }
}

/** `current` is the language the chat is in; it only changes when the visitor clearly writes in the other one. */
export function answer(input: string, current: Lang = 'en', vehicles: Vehicle[] = []): BotReply {
  const lang: Lang = detectLang(input) ?? current
  return { ...reply(input, lang, vehicles), lang }
}

function listOf(list: Vehicle[], lang: Lang, noun: string): string {
  if (list.length === 0) return L(lang, `We have no ${noun} listed right now. Check back soon or message us.`, `Wala pa pong ${noun} sa listahan ngayon. Subukan ulit mamaya o mag-message po sa amin.`)
  const lines = list.slice(0, 4).map((v) => `• ${title(v)}: ${formatPeso(v.price)}${v.status === 'reserved' ? L(lang, ' (reserved)', ' (reserved na)') : ''}`)
  const more = list.length > 4 ? L(lang, `\nand ${list.length - 4} more.`, `\nat ${list.length - 4} pa.`) : ''
  return `${L(lang, `Available ${noun}:`, `Mga available na ${noun}:`)}\n${lines.join('\n')}${more}`
}

function reply(input: string, lang: Lang, vehicles: Vehicle[]): BotReply {
  const t = norm(input)
  const k = linksFor(lang)
  const onLot = vehicles.filter((v) => v.status !== 'sold')
  if (!t) return { text: L(lang, 'Type a question and I will do my best to help.', 'Mag-type po ng tanong at tutulong ako.') }

  if (/^(hi|hello|hey|kumusta|kamusta|musta|magandang|good (morning|afternoon|evening))\b/.test(t) && t.split(' ').length <= 5) {
    return { text: L(lang, 'Hello! I can help with our cars and motorcycles, prices, financing, trade-ins and test drives. What would you like to know?', 'Kumusta po! Matutulungan ko kayo sa mga kotse at motor, presyo, financing, trade-in at test drive. Ano po ang gusto ninyong malaman?') }
  }
  if (/\b(thanks|thank you|bye|salamat|paalam)\b/.test(t)) return { text: L(lang, 'You are welcome! If you need anything else, just ask.', 'Walang anuman po! Magtanong lang po kayo kung may kailangan pa.') }

  if (has(t, ['hours', 'open', 'close', 'schedule', 'oras', 'bukas'])) {
    return { text: L(lang, `We are open ${profile.hours}.`, `Bukas po kami ${profile.hours}.`), links: k.contact }
  }
  if (has(t, ['address', 'where are you', 'located', 'location', 'directions', 'saan kayo', 'lokasyon'])) {
    return { text: L(lang, `Find us at: ${profile.location}.`, `Matatagpuan po kami sa: ${profile.location}.`), links: k.contact }
  }
  if (has(t, ['contact', 'phone', 'call', 'email', 'whatsapp', 'number', 'reach', 'human', 'person', 'tawag', 'numero', 'makausap'])) {
    return { text: L(lang, `You can reach us at ${profile.phone} or ${profile.email}.`, `Maaabot po ninyo kami sa ${profile.phone} o ${profile.email}.`), links: [...k.contact, { label: 'WhatsApp', href: `https://wa.me/${profile.whatsapp}` }] }
  }
  if (has(t, ['test drive', 'try the', 'try it', 'test-drive', 'testdrive'])) {
    return { text: L(lang, 'You can book a test drive online: pick the vehicle, a date and a time, and we will confirm.', 'Pwede pong mag-book ng test drive online: piliin ang sasakyan, petsa at oras, at kukumpirmahin namin.'), links: [k.testDrive] }
  }
  if (has(t, ['trade in', 'trade-in', 'tradein', 'sell my', 'swap', 'palit', 'ibenta'])) {
    return { text: L(lang, 'Yes, we take trade-ins. Tell us about your vehicle and we will reply with an offer.', 'Opo, tumatanggap kami ng trade-in. Ikuwento ninyo ang sasakyan ninyo at magpapadala kami ng offer.'), links: [k.tradeIn] }
  }
  if (has(t, ['financ', 'installment', 'instalment', 'loan', 'down payment', 'downpayment', 'monthly', 'hulog', 'hulugan', 'amortization'])) {
    return { text: L(lang, 'Yes, financing is available. Use the calculator to estimate the monthly payment, then send a request and we will confirm the plan.', 'Opo, may financing. Gamitin ang calculator para sa tantiyang buwanang hulog, tapos magpadala ng request at kukumpirmahin namin ang plano.'), links: [k.financing] }
  }

  // A specific vehicle by brand or model.
  const named = onLot.filter((v) => t.includes(norm(v.model)) || t.split(' ').some((w) => w.length > 3 && norm(v.model).split(' ').includes(w)))
  if (named.length) {
    const v = named[0]
    return {
      text: L(lang, `${title(v)}: ${formatPeso(v.price)}, ${v.mileage.toLocaleString('en-PH')} km${v.engine ? `, ${v.engine}` : ''}${v.status === 'reserved' ? ' (currently reserved)' : ''}.`, `${title(v)}: ${formatPeso(v.price)}, ${v.mileage.toLocaleString('en-PH')} km${v.engine ? `, ${v.engine}` : ''}${v.status === 'reserved' ? ' (reserved ngayon)' : ''}.`),
      links: [{ label: L(lang, 'See details', 'Tingnan ang detalye'), to: `/inventory/${v.id}` }, k.testDrive],
    }
  }
  if (has(t, ['motorcycle', 'motorbike', 'motor', 'scooter', 'bike'])) {
    return { text: listOf(onLot.filter((v) => v.type === 'motorcycle'), lang, L(lang, 'motorcycles', 'motor')), links: [{ label: k.inventory.label, to: '/inventory?type=motorcycle' }] }
  }
  if (has(t, ['car', 'sedan', 'suv', 'van', 'kotse', 'sasakyan', 'vehicle'])) {
    return { text: listOf(onLot.filter((v) => v.type === 'car'), lang, L(lang, 'cars', 'kotse')), links: [{ label: k.inventory.label, to: '/inventory?type=car' }] }
  }
  if (has(t, ['price', 'cost', 'how much', 'cheap', 'budget', 'magkano', 'presyo', 'halaga'])) {
    const prices = onLot.map((v) => v.price)
    return {
      text: prices.length
        ? L(lang, `Our vehicles range from ${formatPeso(Math.min(...prices))} to ${formatPeso(Math.max(...prices))}. Filter the inventory by price to find your budget.`, `Ang mga sasakyan namin ay mula ${formatPeso(Math.min(...prices))} hanggang ${formatPeso(Math.max(...prices))}. I-filter ang inventory ayon sa presyo para sa budget ninyo.`)
        : L(lang, 'Prices are listed on each vehicle. Message us for the latest.', 'Nakalista ang presyo sa bawat sasakyan. Mag-message po sa amin para sa pinakabago.'),
      links: [k.inventory, k.financing],
    }
  }
  if (has(t, ['available', 'inventory', 'stock', 'for sale', 'what do you have', 'what do you sell', 'what do you do', 'meron kayo', 'mayroon kayo', 'ibinebenta'])) {
    const cars = onLot.filter((v) => v.type === 'car').length
    const bikes = onLot.filter((v) => v.type === 'motorcycle').length
    return { text: L(lang, `We have ${cars} car${cars === 1 ? '' : 's'} and ${bikes} motorcycle${bikes === 1 ? '' : 's'} listed right now.`, `Meron po kaming ${cars} kotse at ${bikes} motor ngayon.`), links: [k.inventory] }
  }
  if (has(t, ['reserve', 'reservation', 'book', 'hold'])) {
    return { text: L(lang, 'Open the vehicle you like and press Inquire / Reserve. We will contact you to confirm.', 'Buksan ang sasakyang gusto ninyo at pindutin ang Inquire / Reserve. Kokontakin namin kayo para kumpirmahin.'), links: [k.inventory] }
  }

  return { text: L(lang, 'I am not sure about that one. The team can answer it personally.', 'Hindi po ako sigurado diyan. Ang team na lang po ang makakasagot nang personal.'), links: k.contact }
}
