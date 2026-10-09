import { SERVICES, AREAS, POLICY, PAYMENT_METHODS, money, DEPOSIT_RATE } from '@/data/catalog'
import { FAQS } from '@/data/faqs'
import { profile } from '@/data/profile'

/**
 * The FAQ assistant, in English and Filipino. It is a rule-based helper, not
 * an AI: it matches the visitor's words against the studio's real prices,
 * policies and FAQs (src/data/catalog.ts, src/data/faqs.ts), so its answers
 * can only be things the studio has confirmed. Anything it cannot answer is
 * handed to the team. A visitor writing in Filipino/Tagalog gets Filipino
 * answers automatically, or the language switch can force it.
 */

export type Lang = 'en' | 'fil'
export type BotLink = { label: string; to?: string; href?: string }
export type BotReply = { text: string; links?: BotLink[]; lang?: Lang }

export const STARTERS: Record<Lang, string[]> = {
  en: ['What services do you offer?', 'How much is a 360 photo booth?', 'How does payment work?', 'Do you cover my area?', 'How do I book?'],
  fil: ['Anong mga serbisyo ang meron kayo?', 'Magkano ang 360 photo booth?', 'Paano ang bayad?', 'Sakop ba ang lugar namin?', 'Paano mag-book?'],
}

export const WELCOME: Record<Lang, string> = {
  en: 'Hi! I am the Judeng assistant. Ask me about our services, prices, payment, areas or how to book. Pwede rin po sa Filipino.',
  fil: 'Kumusta po! Ako ang assistant ng Judeng. Magtanong po kayo tungkol sa serbisyo, presyo, bayad, lugar o kung paano mag-book. English is okay too.',
}

const norm = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const has = (t: string, ws: string[]) => ws.some((w) => t.includes(w))

/** Words that only appear in Filipino/Tagalog (matched as whole words). */
const FIL_WORDS = [
  'magkano', 'presyo', 'ilan', 'paano', 'saan', 'pwede', 'puwede', 'po', 'opo', 'kayo', 'ninyo', 'niyo', 'namin', 'kami', 'ako', 'mag', 'magbook', 'bayad', 'bayaran',
  'hindi', 'ano', 'anong', 'meron', 'mayroon', 'gusto', 'salamat', 'kumusta', 'kamusta', 'musta', 'ang', 'ng', 'sa', 'ba', 'lang', 'din', 'rin', 'lugar', 'serbisyo',
  'kasal', 'binyag', 'handaan', 'tawag', 'numero', 'larawan', 'litrato', 'gaano', 'katagal', 'oras', 'sakop', 'tulong', 'pakiusap', 'sige', 'hello po', 'magandang',
]
export function looksFilipino(input: string): boolean {
  const words = new Set(norm(input).split(' '))
  const hits = FIL_WORDS.filter((w) => !w.includes(' ') && words.has(w)).length
  return hits >= 2 || ['magkano', 'presyo', 'bayad', 'paano', 'salamat', 'kumusta', 'kamusta', 'serbisyo', 'po'].some((w) => words.has(w))
}

const EN_WORDS = new Set([
  'the', 'is', 'are', 'what', 'how', 'much', 'do', 'you', 'your', 'can', 'i', 'we', 'my', 'me', 'to', 'for', 'and', 'with', 'price', 'cost', 'book', 'booking', 'services', 'service', 'offer',
  'payment', 'pay', 'where', 'when', 'does', 'have', 'need', 'want', 'please', 'thanks', 'thank', 'hello', 'hi', 'long', 'cover', 'area', 'contact', 'phone', 'available',
])

/** Which language a message is written in, or null when it is too short to tell (a place name, a number). */
export function detectLang(input: string): Lang | null {
  if (looksFilipino(input)) return 'fil'
  const ws = norm(input).split(' ')
  return ws.some((w) => EN_WORDS.has(w)) ? 'en' : null
}

const SERVICE_WORDS: Record<string, string[]> = {
  'glass-booth': ['glass'],
  'onsite-studio-booth': ['onsite', 'on site studio', 'studio booth'],
  'look-up-booth': ['look up', 'lookup', 'overhead'],
  'roaming-photoman': ['roving', 'roaming', 'photoman', 'photo man'],
  'booth-360': ['360', 'three sixty', 'spin'],
  'cake-mapping': ['cake', 'mapping', 'projection'],
  studio: ['studio'],
  coverage: ['coverage', 'video', 'videographer', 'photographer', 'photo and video', 'event photo'],
  food: ['food', 'menu', 'restaurant', 'pagkain'],
  prints: ['print', 'folder'],
}

const L = (lang: Lang, en: string, fil: string) => (lang === 'fil' ? fil : en)

function linksFor(lang: Lang) {
  return {
    book: { label: L(lang, 'Book now', 'Mag-book na'), to: '/book' } as BotLink,
    prices: { label: L(lang, 'See the price list', 'Tingnan ang presyo'), to: '/services' } as BotLink,
    contact: [
      { label: L(lang, `Call ${profile.phone}`, `Tawagan ang ${profile.phone}`), href: `tel:${profile.phoneTel}` },
      { label: L(lang, 'Message us', 'Mag-message sa amin'), to: '/contact' },
    ] as BotLink[],
  }
}

function priceOf(serviceId: string, lang: Lang): BotReply {
  const s = SERVICES.find((x) => x.id === serviceId)!
  const k = linksFor(lang)
  if (serviceId === 'coverage' || serviceId === 'food') {
    return {
      text: L(lang, `${s.name}: details and pricing are discussed personally with the team.`, `${s.name}: ang detalye at presyo ay personal na pinag-uusapan kasama ang team.`),
      links: [{ label: L(lang, 'Request a quote', 'Humingi ng quote'), to: `/book?service=${serviceId}` }, ...k.contact],
    }
  }
  const lines = s.options.map((o) => `${o.name}${o.detail ? ` (${o.detail})` : ''}: ${o.price === null ? L(lang, 'quoted personally', 'personal na quote') : money(o.price)}`)
  return {
    text: `${s.name}\n${lines.join('\n')}`,
    links: [{ label: L(lang, `Book ${s.name}`, `Mag-book ng ${s.name}`), to: `/book?service=${serviceId}` }, k.prices],
  }
}

function areaIn(t: string) {
  const padded = ` ${t} `
  return AREAS.filter((a) => padded.includes(` ${norm(a.name)} `)).sort((a, b) => b.name.length - a.name.length)[0]
}

/** Filipino versions of the studio's FAQ answers (matched by the question's position). */
const FAQ_FIL: { q: string[]; a: string }[] = [
  { q: ['what do you do', 'anong ginagawa'], a: 'Nag-aalok kami ng glass at 360 photo booth, cake mapping, studio shots, photo at video coverage, at food photography. Ang mga kliyente namin ay mga event host, negosyo, at restaurant.' },
  { q: ['how fast', 'gaano kabilis', 'kailan pwede'], a: 'Sabihin po agad ang petsa ninyo. Mabilis mapuno ang mga sikat na weekend, at kukumpirmahin namin ang availability kapag nag-message kayo.' },
  { q: ['how much', 'magkano'], a: 'Nasa Services page ang mga presyo sa KWD. May dagdag na location charge na 0, 20, 30 o 50 KWD depende sa lugar. Ang 30% deposit ang magkukumpirma ng booking at ang 70% ay babayaran sa venue sa araw ng event. Ang coverage at food photography ay personal na quote.' },
  { q: ['travel', 'pumupunta'], a: 'Opo, pumupunta kami sa venue ninyo. May dagdag na location charge depende sa lugar.' },
  { q: ['after i write', 'pagkatapos'], a: 'Sasagot kami sa loob ng isang business day. Susunod ang maikling chat tungkol sa event ninyo, tapos magpapadala kami ng proposal na may kasamang detalye at presyo.' },
]

const FAQ_STOP = new Set(['the', 'a', 'an', 'do', 'you', 'we', 'i', 'to', 'is', 'are', 'for', 'of', 'and', 'in', 'on', 'it', 'can', 'what', 'how', 'my', 'your', 'me', 'with', 'at', 'or'])
const words = (s: string) => norm(s).split(' ').filter((w) => w.length > 2 && !FAQ_STOP.has(w))

/** `current` is the language the chat is in; it only changes when the visitor clearly writes in the other one. */
export function answer(input: string, current: Lang = 'en'): BotReply {
  const lang: Lang = detectLang(input) ?? current
  return { ...reply(input, lang), lang }
}

function reply(input: string, lang: Lang): BotReply {
  const t = norm(input)
  const k = linksFor(lang)
  if (!t) return { text: L(lang, 'Type a question and I will do my best to help.', 'Mag-type po ng tanong at tutulong ako.') }
  const asksPrice = has(t, ['price', 'cost', 'how much', 'rate', 'charge', 'fee', 'package', 'pay for', 'kwd', 'cheap', 'magkano', 'presyo', 'halaga', 'rate'])

  if (/^(hi|hello|hey|salam|kumusta|kamusta|musta|magandang|good (morning|afternoon|evening))\b/.test(t) && t.split(' ').length <= 5) {
    return { text: L(lang, 'Hello! I can answer questions about our services, prices, payment and booking. What would you like to know?', 'Kumusta po! Masasagot ko ang mga tanong tungkol sa serbisyo, presyo, bayad at pag-book. Ano po ang gusto ninyong malaman?') }
  }
  if (/\b(thanks|thank you|shukran|bye|salamat|paalam)\b/.test(t)) return { text: L(lang, 'You are welcome! If you need anything else, just ask.', 'Walang anuman po! Magtanong lang po kayo kung may kailangan pa.') }

  // Topics the studio has not confirmed yet (the doc's "TBA" list): never guess, hand over to the team.
  const unconfirmed = [
    ['your address', 'studio address', 'where is your studio', 'where are you located', 'saan ang studio', 'address ninyo'],
    ['wamd number', 'wamd account', 'wamd details', 'wamd link', 'wamd instructions', 'account name'],
    ['cancel', 'cancellation', 'kansel', 'kanselasyon'],
    ['refund', 'refundable', 'money back', 'ibalik ang'],
    ['reschedule', 'rescheduling', 'move my date', 'change my date', 'ilipat ang petsa', 'palitan ang petsa'],
    ['when do i pay', 'when should i pay', 'when to pay', 'deposit instructions', 'how do i pay the deposit', 'where do i pay', 'kailan magbabayad', 'saan magbabayad'],
    ['facebook review', 'google review', 'review link'],
  ]
  if (unconfirmed.some((ws) => has(t, ws))) {
    return {
      text: L(lang, 'That information is not confirmed in my current information. I can connect you with the Judeng Production team for assistance.', 'Hindi pa po kumpirmado ang impormasyong iyan sa kasalukuyan kong impormasyon. Maikokonekta ko po kayo sa Judeng Production team para matulungan kayo.'),
      links: k.contact,
    }
  }

  const area = areaIn(t)
  if (area && !has(t, ['price list'])) {
    return {
      text:
        area.charge === 0
          ? L(lang, `${area.name}: no location charge.`, `${area.name}: walang location charge.`)
          : L(lang, `${area.name}: a location charge of ${money(area.charge)} applies. It is added once to your booking before the 30% deposit is worked out.`, `${area.name}: may location charge na ${money(area.charge)}. Isang beses lang itong idinadagdag sa booking bago kuwentahin ang 30% deposit.`),
      links: [k.book],
    }
  }
  if (has(t, ['area', 'location', 'travel', 'where do you', 'deliver', 'come to', 'venue', 'cover', 'lugar', 'sakop', 'saan', 'pumupunta', 'puntahan'])) {
    return {
      text: L(lang, 'We come to your venue. What area is your event in? (for example Salmiya)', 'Pumupunta kami sa venue ninyo. Anong lugar po ang event ninyo? (halimbawa Salmiya)'),
    }
  }

  for (const [id, ws] of Object.entries(SERVICE_WORDS)) {
    if (has(t, ws)) {
      if (id === 'studio' && !asksPrice && has(t, ['book'])) break
      return priceOf(id, lang)
    }
  }

  if (has(t, ['deposit', 'payment', 'pay', 'paying', 'wamd', 'cash', 'balance', 'down payment', 'installment', 'bayad', 'bayaran', 'magbayad', 'hulog', 'downpayment'])) {
    return {
      text: L(
        lang,
        `${POLICY.deposit} ${POLICY.balance} ${POLICY.location} Payment methods: ${PAYMENT_METHODS.join(' and ')}.`,
        `Kailangan po ng 30% deposit mula sa kabuuang presyo para makumpirma ang booking. Ang natitirang 70% ay babayaran sa venue sa araw ng event. Kasama sa kuwenta ng deposit ang location charge. Paraan ng bayad: ${PAYMENT_METHODS.join(' at ')}.`,
      ),
      links: [k.book],
    }
  }
  if (asksPrice) {
    const parts = SERVICES.filter((s) => !s.addon).map((s) => {
      const p = s.options.filter((o) => o.price !== null).map((o) => o.price as number)
      return `${s.name}: ${p.length ? L(lang, `from ${money(Math.min(...p))}`, `simula ${money(Math.min(...p))}`) : L(lang, 'quoted personally', 'personal na quote')}`
    })
    return { text: `${L(lang, 'Starting prices:', 'Simulang presyo:')}\n${parts.join('\n')}\n${L(lang, 'Extra prints are available too. Ask me about any service for the full details.', 'May extra prints din. Magtanong po tungkol sa kahit anong serbisyo para sa buong detalye.')}`, links: [k.prices] }
  }
  if (has(t, ['service', 'offer', 'what do you do', 'what do you', 'provide', 'list', 'wedding', 'birthday', 'debut', 'party', 'event', 'serbisyo', 'alok', 'meron kayo', 'mayroon kayo', 'kasal', 'binyag', 'handaan', 'kaarawan'])) {
    return {
      text: `${L(lang, 'We offer:', 'Ito po ang aming mga serbisyo:')}\n${SERVICES.filter((s) => !s.addon).map((s) => `• ${s.name}`).join('\n')}\n${L(lang, 'Extra prints can be added to any booking.', 'Pwede ring magdagdag ng extra prints sa kahit anong booking.')}`,
      links: [{ label: L(lang, 'View services', 'Tingnan ang serbisyo'), to: '/services' }, k.book],
    }
  }
  if (has(t, ['book', 'reserve', 'reservation', 'available', 'availability', 'date', 'schedule', 'reserba', 'petsa', 'bakante', 'iskedyul'])) {
    return {
      text: L(
        lang,
        `Booking is online: choose your service, date, time and area, see the total, then send the request. We check availability and confirm. A ${DEPOSIT_RATE * 100}% deposit confirms your booking and the rest is paid at the venue on the event date.`,
        `Online po ang pag-book: piliin ang serbisyo, petsa, oras at lugar, makikita ninyo ang total, tapos ipadala ang request. Titingnan namin ang availability at kukumpirmahin. Ang ${DEPOSIT_RATE * 100}% deposit ang magkukumpirma ng booking at ang natitira ay babayaran sa venue sa araw ng event.`,
      ),
      links: [k.book],
    }
  }
  if (has(t, ['how long', 'duration', 'hours', 'time', 'gaano katagal', 'ilang oras', 'oras'])) {
    return { text: L(lang, 'The 360 Photo Booth and Cake Mapping packages run for 3 hours. For other services, tell us what you need when you book and we will confirm.', 'Ang 360 Photo Booth at Cake Mapping ay tumatagal ng 3 oras. Para sa ibang serbisyo, sabihin lang po ang kailangan ninyo kapag nag-book at kukumpirmahin namin.'), links: [k.book] }
  }
  if (has(t, ['contact', 'phone', 'call', 'email', 'whatsapp', 'number', 'reach', 'talk', 'human', 'person', 'tawag', 'numero', 'kontak', 'makausap', 'kausapin'])) {
    return { text: L(lang, `You can reach us at ${profile.phone} or ${profile.email}.`, `Maaabot po ninyo kami sa ${profile.phone} o ${profile.email}.`), links: [...k.contact, { label: 'WhatsApp', href: `https://wa.me/${profile.phoneTel.replace(/\D/g, '')}` }] }
  }
  if (has(t, ['portfolio', 'work', 'sample', 'photos', 'examples', 'gallery', 'larawan', 'litrato', 'halimbawa'])) {
    return { text: L(lang, 'You can see our food photography on the Work page.', 'Makikita po ninyo ang food photography namin sa Work page.'), links: [{ label: L(lang, 'View our work', 'Tingnan ang gawa namin'), to: '/projects' }] }
  }
  if (has(t, ['review', 'testimonial', 'feedback'])) {
    return { text: L(lang, 'Customer reviews are on the Clients page, and you can leave one too.', 'Nasa Clients page po ang mga review ng customers, at pwede rin kayong mag-iwan ng review.'), links: [{ label: 'Reviews', to: '/testimonials' }] }
  }

  // Studio FAQ: Filipino answers when writing in Filipino, otherwise the English FAQ by word overlap.
  if (lang === 'fil') {
    const hit = FAQ_FIL.find((f) => has(t, f.q))
    if (hit) return { text: hit.a, links: [k.book] }
  } else {
    const q = new Set(words(input))
    let best: { score: number; a: string } | null = null
    for (const f of FAQS) {
      const score = words(f.q).filter((w) => q.has(w)).length * 2 + words(f.a).filter((w) => q.has(w)).length
      if (!best || score > best.score) best = { score, a: f.a }
    }
    if (best && best.score >= 3) return { text: best.a, links: [k.book] }
  }

  return { text: L(lang, 'I am not sure about that one. The team can answer it personally.', 'Hindi po ako sigurado diyan. Ang team na lang po ang makakasagot nang personal.'), links: k.contact }
}
