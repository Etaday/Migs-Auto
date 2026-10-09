import { formatPeso } from './inventory'
import type { Vehicle } from '../types/vehicle'

/**
 * The enhancer for listing text. Two layers:
 *  1. Built-in (this file): tidies what the owner typed and writes the factual parts from
 *     the listing's own specs. It works offline and cannot invent anything.
 *  2. Optional AI (api/enhance.ts): used when the host has an API key; this file builds its prompt.
 *     If it is not set up, or fails, the built-in layer answers instead.
 */

export type EnhanceVehicle = Pick<Vehicle, 'year' | 'brand' | 'model' | 'type' | 'body' | 'engine' | 'transmission' | 'fuel' | 'color' | 'mileage' | 'price'>

const ACRONYMS = ['led', 'hid', 'ecu', 'abs', 'gps', 'usb', 'oem', 'dohc', 'cvt', 'tpms', 'dvr', 'lcd', 'esc', 'ac', 'hp', 'suv', 'cc', '4x4', '4wd', 'awd', 'fwd', 'rwd', 'tv']
const ACRONYM_RE = new RegExp(`\\b(${ACRONYMS.join('|')})\\b`, 'gi')

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim()
const upperAcronyms = (s: string) => s.replace(ACRONYM_RE, (m) => m.toUpperCase())
/** Capitalises the first letter, unless the first word already has its own capitals (iPhone, eBike). */
function capFirst(s: string): string {
  const first = s.split(' ')[0]
  if (!first || /[A-Z]/.test(first.slice(1)) || !/^[a-z]/.test(first)) return s
  return s[0].toUpperCase() + s.slice(1)
}

/** One modification per entry: split lists, fix spacing, capitals and acronyms, drop duplicates and noise. */
export function enhanceModifications(items: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of items) {
    const isList = /[,;\n]/.test(raw)
    let parts = isList ? raw.split(/[,;\n]+/) : [raw]
    if (isList) parts = parts.flatMap((p, i) => (i === parts.length - 1 ? p.split(/\s+and\s+/i) : [p]))
    for (const p of parts) {
      const item = capFirst(upperAcronyms(tidy(p.replace(/^[\s\-•*·]+/, '').replace(/[.\s]+$/, ''))))
      if (item.length < 2 || !/[a-z0-9]/i.test(item)) continue
      const key = item.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }
  }
  return out
}

export function cleanNotes(text: string): string[] {
  const fixed = tidy(text.replace(/\s+([.,;!?])/g, '$1').replace(/([,;])(?=[A-Za-z])/g, '$1 ').replace(/([.!?])(?=[A-Z])/g, '$1 '))
  return fixed
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => /[a-z0-9]/i.test(s))
    .map((s) => capFirst(upperAcronyms(s)).replace(/[.!?]*$/, '.'))
}

const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a')

/** A listing description: the facts from the specs, the owner's own notes (tidied), the modifications, the price. Stable when run twice. */
export function enhanceDescription(v: EnhanceVehicle, text: string, mods: string[]): string {
  const title = `${v.year} ${v.brand} ${v.model}`.trim()
  const parts: string[] = []

  if (!text.includes(title)) {
    const kind = [v.color.trim().toLowerCase(), (v.body.trim() || (v.type === 'motorcycle' ? 'motorcycle' : 'car')).toLowerCase()].filter(Boolean).join(' ')
    const withs = [v.engine.trim() && `a ${v.engine.trim()} engine`, v.transmission.trim() && `${v.transmission.trim().toLowerCase()} transmission`, v.fuel.trim() && `${v.fuel.trim().toLowerCase()} fuel`].filter(Boolean) as string[]
    const list = withs.length > 1 ? `${withs.slice(0, -1).join(', ')} and ${withs[withs.length - 1]}` : withs[0]
    parts.push(`This ${title} is ${article(kind)} ${kind}${list ? ` with ${list}` : ''}.`)
    if (v.mileage > 0) parts.push(`It has ${v.mileage.toLocaleString('en-PH')} km on the odometer.`)
  }

  parts.push(...cleanNotes(text))

  if (mods.length && !/Modifications:/i.test(text)) parts.push(`Modifications: ${mods.join(', ')}.`)
  if (v.price > 0 && !/Asking price/i.test(text)) parts.push(`Asking price ${formatPeso(v.price)}.`, 'Message us or book a test drive.')
  return parts.join(' ')
}

/** The instruction sent to the AI layer. It may only use the facts given here. */
export function buildPrompt(kind: 'description' | 'modifications', text: string, v: EnhanceVehicle, mods: string[]): string {
  const facts = [
    `Vehicle: ${v.year} ${v.brand} ${v.model} (${v.type})`,
    v.body && `Body: ${v.body}`, v.engine && `Engine: ${v.engine}`, v.transmission && `Transmission: ${v.transmission}`, v.fuel && `Fuel: ${v.fuel}`,
    v.color && `Color: ${v.color}`, v.mileage > 0 && `Mileage: ${v.mileage} km`, v.price > 0 && `Asking price: ${formatPeso(v.price)}`,
    mods.length > 0 && `Modifications: ${mods.join('; ')}`,
  ].filter(Boolean).join('\n')
  const task = kind === 'description'
    ? 'Rewrite the owner notes as a clear, honest listing description of 2 to 4 short sentences (under 600 characters). Plain text only: no markdown, no emojis, no bullet points.'
    : 'Rewrite the owner notes as a clean list of vehicle modifications: one per line, first letter capital, correct spelling and acronyms (LED, ABS, ECU), no numbering, no extra commentary.'
  return `You write listings for Migs Auto, a car and motorcycle dealer in the Philippines.\n${task}\nUse only the facts below and the owner notes. Do not invent features, history, condition, warranty or prices.\n\nFacts:\n${facts}\n\nOwner notes:\n${text || '(none)'}`
}

export type Enhanced<T> = { value: T; source: 'ai' | 'local' }

async function askServer(kind: 'description' | 'modifications', text: string, v: EnhanceVehicle, mods: string[], token: string): Promise<string | null> {
  if (!token) return null
  try {
    const res = await fetch('/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, text, vehicle: v, modifications: mods }),
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { text?: unknown }
    return typeof json.text === 'string' && json.text.trim() ? json.text.trim() : null
  } catch {
    return null
  }
}

/** AI when the server layer is set up and answers, otherwise the built-in enhancer. Always returns something usable. */
export async function enhanceDescriptionText(v: EnhanceVehicle, text: string, mods: string[], token: string): Promise<Enhanced<string>> {
  const ai = await askServer('description', text, v, mods, token)
  return ai ? { value: ai.slice(0, 1200), source: 'ai' } : { value: enhanceDescription(v, text, mods), source: 'local' }
}

export async function enhanceModificationList(v: EnhanceVehicle, items: string[], token: string): Promise<Enhanced<string[]>> {
  const local = enhanceModifications(items)
  const ai = await askServer('modifications', items.join('\n'), v, [], token)
  if (!ai) return { value: local, source: 'local' }
  const cleaned = enhanceModifications(ai.split('\n'))
  return cleaned.length ? { value: cleaned, source: 'ai' } : { value: local, source: 'local' }
}
