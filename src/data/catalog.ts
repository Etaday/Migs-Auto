import { Sparkle, ArrowsClockwise, Cake, Aperture, VideoCamera, ForkKnife, Printer, type Icon } from '@/components/slab'

/**
 * Confirmed services, prices (KWD), codes, payment policy and location
 * charges. Every price on the site and in the booking calculator comes from
 * this file, so change a number here and it changes everywhere.
 */

export const CURRENCY = 'KWD'
export const DEPOSIT_RATE = 0.3
export const PAYMENT_METHODS = ['WAMD', 'Cash'] as const

export type Option = {
  id: string
  code: string
  name: string
  detail: string
  /** Sub-heading the option is listed under inside its service (e.g. the booth style). */
  group?: string
  /** null = discussed personally, not priced here. */
  price: number | null
}

export type CatalogService = {
  id: string
  name: string
  Icon: Icon
  blurb: string
  /** An add-on shown in its own step, not as a headline service. */
  addon?: boolean
  options: Option[]
}

/**
 * Booth styles priced exactly like the Glass Photo Booth (same guest tiers and
 * print sizes). Each option remembers which glass option it follows, so a price
 * changed for the glass booth changes here too.
 */
const GLASS_TIERS: Option[] = [
  { group: 'Glass Photo Booth', id: 'GPB-3R', code: 'GPB', name: 'Basic', detail: '1-50 guests, 3.5x5 inch prints', price: 75 },
  { group: 'Glass Photo Booth', id: 'GPB-4R', code: 'GPB', name: 'Basic', detail: '1-50 guests, 4x6 inch prints', price: 85 },
  { group: 'Glass Photo Booth', id: 'GPC-3R', code: 'GPC', name: 'Classic', detail: '50-100 guests, 3.5x5 inch prints', price: 95 },
  { group: 'Glass Photo Booth', id: 'GPC-4R', code: 'GPC', name: 'Classic', detail: '50-100 guests, 4x6 inch prints', price: 105 },
  { group: 'Glass Photo Booth', id: 'GPH-3R', code: 'GPH', name: 'High-End', detail: '100-200 guests, 3.5x5 inch prints', price: 120 },
  { group: 'Glass Photo Booth', id: 'GPH-4R', code: 'GPH', name: 'High-End', detail: '100-200 guests, 4x6 inch prints', price: 135 },
]
/** variant option id -> the glass option whose price it follows */
const PRICE_FOLLOWS = new Map<string, string>()
const likeGlass = (prefix: string, group: string): Option[] =>
  GLASS_TIERS.map((o) => {
    const id = `${prefix}${o.id.slice(2)}` // GPB-3R -> OSBB-3R
    PRICE_FOLLOWS.set(id, o.id)
    return { ...o, id, group, code: o.code.replace('GP', prefix) }
  })

export const SERVICES: CatalogService[] = [
  {
    id: 'glass-booth',
    name: 'Booths and Prints',
    Icon: Sparkle,
    blurb: 'Pick a booth style, then guest count and print size.',
    options: [...GLASS_TIERS, ...likeGlass('OSB', 'Onsite Studio Booth'), ...likeGlass('LUB', 'Look Up Booth'), ...likeGlass('RPM', 'Roving Photoman')],
  },
  {
    id: 'booth-360',
    name: '360 Photo Booth',
    Icon: ArrowsClockwise,
    blurb: 'Three hours of slow-motion spin videos.',
    options: [
      { id: '360B', code: '360B', name: 'Basic', detail: '3 hours, photo booth only', price: 95 },
      { id: '360C', code: '360C', name: 'Classic', detail: '3 hours, includes light setup', price: 120 },
      { id: '360H', code: '360H', name: 'High-End', detail: '3 hours, includes light setup and golden stanchion', price: 150 },
    ],
  },
  {
    id: 'cake-mapping',
    name: 'Cake Mapping',
    Icon: Cake,
    blurb: 'Three hours of projection mapping on your cake.',
    options: [
      { id: 'WC', code: 'WC', name: 'Wedding', detail: '3 hours, 6 layers, with photo booth package', price: 120 },
      { id: 'DC', code: 'DC', name: 'Debut', detail: '3 hours, 6 layers', price: 75 },
      { id: 'KBC', code: 'KBC', name: 'Kids Birthday', detail: '3 hours, 4 layers', price: 65 },
    ],
  },
  {
    id: 'studio',
    name: 'Studio shots',
    Icon: Aperture,
    blurb: 'Quick studio portraits, with or without a photographer. A 25-minute session at our studio in Farwaniya, Block 6.',
    options: [
      { id: 'SSP', code: 'SSP', name: 'Studio shot with photographer', detail: '', price: 45 },
      { id: 'SSS', code: 'SSS', name: 'Studio shot, self portrait', detail: '', price: 20 },
    ],
  },
  {
    id: 'coverage',
    name: 'Photo and video coverage',
    Icon: VideoCamera,
    blurb: 'Details and pricing are discussed personally with the team.',
    options: [{ id: 'PVC', code: 'PVC', name: 'Request a quote', detail: 'Discussed personally', price: null }],
  },
  {
    id: 'food',
    name: 'Food photography',
    Icon: ForkKnife,
    blurb: 'Details and pricing are discussed personally with the team.',
    options: [{ id: 'FP', code: 'FP', name: 'Request a quote', detail: 'Discussed personally', price: null }],
  },
  {
    id: 'prints',
    name: 'Extra prints in folders',
    Icon: Printer,
    blurb: 'Add extra prints to any booking.',
    addon: true,
    options: [
      { id: 'EP3-50', code: 'EP3', name: '3R, 3.5x5 inch', detail: '50 pieces', price: 15 },
      { id: 'EP3-100', code: 'EP3', name: '3R, 3.5x5 inch', detail: '100 pieces', price: 18 },
      { id: 'EP3-250', code: 'EP3', name: '3R, 3.5x5 inch', detail: '250 pieces', price: 30 },
      { id: 'EP4-50', code: 'EP4', name: '4R, 4x6 inch', detail: '50 pieces', price: 20 },
      { id: 'EP4-100', code: 'EP4', name: '4R, 4x6 inch', detail: '100 pieces', price: 20 },
      { id: 'EP4-250', code: 'EP4', name: '4R, 4x6 inch', detail: '250 pieces', price: 35 },
    ],
  },
]

/** Studio shots are a fixed 25-minute session at the studio, so no duration, area or venue is asked for. */
export const STUDIO = { duration: '25 minutes', area: 'Farwaniya', venue: 'Studio, Farwaniya Block 6' }
export const isStudioOnly = (optionIds: string[]) => optionIds.length > 0 && optionIds.every((id) => serviceOf(id)?.id === 'studio')

/** The styles a service comes in (e.g. the booth types), in order. Empty when it has none. */
export const stylesOf = (s: CatalogService): string[] => [...new Set(s.options.map((o) => o.group).filter((g): g is string => !!g))]
/** The packages of a service shown once: the options of its first style (all styles share the same packages and prices). */
export const packagesOf = (s: CatalogService): Option[] => {
  const first = stylesOf(s)[0]
  return first ? s.options.filter((o) => o.group === first) : s.options
}

export const ALL_OPTIONS: Option[] = SERVICES.flatMap((s) => s.options)
export const optionById = (id: string) => ALL_OPTIONS.find((o) => o.id === id)
export const serviceOf = (optionId: string) => SERVICES.find((s) => s.options.some((o) => o.id === optionId))

/* ---------- Location charges ---------- */

const zone = (charge: number, names: string) => ({ charge, areas: names.split('|') })

export const ZONES = [
  zone(0, "Abdulla Al-Salem|Abdullah Al-Mubarak|Adailiya|Airport District|Al-Bida'a|Al-Dajeej|Al-Rai|Al-Riggai|Al-Siddiq|Al-Sour Gardens|Andalus|Anjafa|Ardiya|Bayan|Bnaid Al-Qar|Daiya|Dasma|Doha|Faiha|Farwaniya|Ferdous|Granada|Hawalli|Hitteen|Ishbiliya|Jabriya|Jibla|Jleeb Al-Shuyoukh|Kaifan|Khaitan|Khaldiya|Mansouriya|Ministries Area|Mirqab|Mishrif|Mubarak Al-Abdullah|Nahdha|North West Sulaibikhat|Nuzha|Omariya|Qadsiya|Qairawan|Qortuba|Rabiya|Rawda|Rehab|Rumaithiya|Sabah Al-Nasser|Sabah Al-Salem University|Salam|Salmiya|Salwa|Shaab|Shamiya|Sharq|Shuhada|Shuwaikh|South Abdullah Al-Mubarak|Sulaibikhat|Surra|West Abdullah Al-Mubarak|Yarmouk|Zahra"),
  zone(20, 'Abu Al Hasaniya|Abu Ftaira|Abu Halifa|Al Qurain|Al-Adan|Al-Fnaitees|Al-Masayel|Al-Nahda|Al-Qusour|Al-Sheqaya|Bahra|Fahaheel|Fintas|Jaber Al-Ahmad|Jahra|Kabd|Kazma|Mahboula|Mangaf|Messila|Mubarak Al-Kabeer|Naeem|Nasseem|Oyoun|Qasr|Saad Al Abdullah|Sabah Al-Salem|Salmi|Shuwaikh Industrial Area|Shuwaikh Port|Subiya|Sulaibiya|Sulaibiya Residential|Taima|Waha|Wista'),
  zone(30, "Abdali|Ahmadi|Al Shadadiya Industrial|Al-Julaia'a|Al-Mutlaa|Al-Nuwaiseeb|Ali Sabah Al-Salem|Amghara Industrial|Ardiya Herafiya|Bar Al-Ahmadi|Bar Al-Jahra|Bnaider|Dhaher|Doha Port|Egaila|Fahad Al-Ahmad|Hadiya|Jaber Al-Ali|Jahra Industrial Herafiya|Khairan|Magwa|Mina Abdulla|Riqqa|Sabah Al Ahmad|Sabah Al Ahmad Sea City|Sabahiya|Shuaiba Industrial|South Sabahiya|Subhan Industrial|Sulaibiya Agricultural Area|Sulaibiya Industrial|Wafra|Wafra Residential|West Abu Ftaira Herafiya|Zoor"),
  zone(50, 'Bubiyan Island|Failaka Island|Miskan Island|Ouha Island|Umm an Namil Island|Warbah Island'),
]

export const AREAS: { name: string; charge: number }[] = ZONES.flatMap((z) => z.areas.map((name) => ({ name, charge: z.charge })))
export const chargeFor = (area: string) => AREAS.find((a) => a.name === area)?.charge

/**
 * Update prices and the location table from the studio's Google Doc (see
 * src/lib/knowledgeClient.ts). Values that are missing keep their built-in
 * value, so a partial or failed read never breaks the site.
 */
export function applyKnowledge(k: { prices?: Record<string, number>; zones?: { charge: number; areas: string[] }[] }) {
  if (k.prices) {
    for (const o of ALL_OPTIONS) {
      const v = k.prices[o.id]
      if (typeof v === 'number' && v > 0 && v <= 1000) o.price = v
    }
    // Booth styles that follow the glass booth's prices.
    for (const o of ALL_OPTIONS) {
      const base = PRICE_FOLLOWS.get(o.id)
      const glass = base ? ALL_OPTIONS.find((x) => x.id === base) : undefined
      if (glass) o.price = glass.price
    }
  }
  if (k.zones && k.zones.length) {
    ZONES.splice(0, ZONES.length, ...k.zones.map((z) => ({ charge: z.charge, areas: [...z.areas] })))
    AREAS.splice(0, AREAS.length, ...ZONES.flatMap((z) => z.areas.map((name) => ({ name, charge: z.charge }))))
  }
}

/* ---------- The calculator ---------- */

const round = (n: number) => Math.round(n * 1000) / 1000

export type Quote = {
  items: Option[]
  subtotal: number
  location: number
  total: number
  deposit: number
  balance: number
  /** True when a selected service is priced personally and not in the total. */
  hasQuoteOnly: boolean
}

/** The location charge is added once, then the 30% deposit and 70% balance are taken from the total. */
export function quote(optionIds: string[], area: string): Quote {
  const items = optionIds.map(optionById).filter((o): o is Option => !!o)
  const subtotal = items.reduce((s, o) => s + (o.price ?? 0), 0)
  const hasPriced = items.some((o) => o.price !== null)
  const location = hasPriced ? (chargeFor(area) ?? 0) : 0
  const total = round(subtotal + location)
  const deposit = round(total * DEPOSIT_RATE)
  return { items, subtotal, location, total, deposit, balance: round(total - deposit), hasQuoteOnly: items.some((o) => o.price === null) }
}

export const money = (n: number) => `${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} ${CURRENCY}`

export const POLICY = {
  deposit: 'A 30% deposit of the total booking price is required to confirm your booking.',
  balance: 'The remaining 70% balance is paid at the venue on the event date.',
  location: 'The deposit is calculated from the total, including any location charge.',
}
