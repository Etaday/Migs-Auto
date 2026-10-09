/**
 * Reads the studio's Google Doc ("Judeng Production - AI Knowledge Base") and
 * pulls out the facts the website uses: option prices, the location charge
 * table and the list of still-unconfirmed (TBA) topics.
 *
 * Pure text in, plain data out (no imports), so the same code runs in the
 * Vercel function (api/knowledge.ts) and in tests. It matches the doc's
 * wording, so keep the doc's sentences in their current shape when editing,
 * e.g. "Wedding cake, 6 layers, with photo booth package: 120 KWD".
 * Anything it cannot read is simply left out, and the site keeps its
 * built-in value for it.
 */

export type Knowledge = {
  /** option id (see src/data/catalog.ts) -> price in KWD */
  prices: Record<string, number>
  /** location charge table */
  zones: { charge: number; areas: string[] }[]
  /** topics the doc still lists as unconfirmed, lower-cased */
  tba: string[]
  /** how many of the 20 known prices were found */
  priceCount: number
}

const NUM = '(\\d+(?:\\.\\d+)?)'

/** The text between a heading line and the next ALL-CAPS heading line. */
function section(text: string, title: RegExp): string {
  const lines = text.split(/\r?\n/)
  const isHeading = (l: string) => {
    const t = l.replace(/^[\s\d.)\-–—]+/, '').trim()
    return t.length >= 6 && t === t.toUpperCase() && /[A-Z]{4}/.test(t) && !/\d\s*KWD/i.test(t)
  }
  const start = lines.findIndex((l) => isHeading(l) && title.test(l))
  if (start < 0) return ''
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (isHeading(lines[i])) { end = i; break }
  }
  return lines.slice(start + 1, end).join('\n')
}

const grab = (text: string, re: RegExp): number | undefined => {
  const m = re.exec(text)
  return m ? Number(m[1]) : undefined
}

export function parseKnowledge(text: string): Knowledge {
  const prices: Record<string, number> = {}
  const put = (id: string, v: number | undefined) => {
    if (v !== undefined && Number.isFinite(v) && v > 0 && v <= 1000) prices[id] = v
  }

  const cake = section(text, /^\W*CAKE MAPPING/i)
  put('WC', grab(cake, new RegExp(`wedding cake[^:\\n]*:\\s*${NUM}\\s*KWD`, 'i')))
  put('DC', grab(cake, new RegExp(`debut cake[^:\\n]*:\\s*${NUM}\\s*KWD`, 'i')))
  put('KBC', grab(cake, new RegExp(`kids birthday cake[^:\\n]*:\\s*${NUM}\\s*KWD`, 'i')))

  const glass = section(text, /GLASS PHOTO BOOTH/i)
  for (const [tier, id] of [['Basic', 'GPB'], ['Classic', 'GPC'], ['High[- ]end', 'GPH']] as const) {
    const m = new RegExp(`${tier},[^:\\n]*guests:\\s*${NUM}\\s*KWD with 3\\.5\\s*x\\s*5[^,\\n]*,\\s*${NUM}\\s*KWD with 4\\s*x\\s*6`, 'i').exec(glass)
    if (m) { put(`${id}-3R`, Number(m[1])); put(`${id}-4R`, Number(m[2])) }
  }

  const b360 = section(text, /^\W*360 PHOTO BOOTH/i)
  put('360B', grab(b360, new RegExp(`Basic:\\s*${NUM}\\s*KWD`, 'i')))
  put('360C', grab(b360, new RegExp(`Classic:\\s*${NUM}\\s*KWD`, 'i')))
  put('360H', grab(b360, new RegExp(`High[- ]end:\\s*${NUM}\\s*KWD`, 'i')))

  const studio = section(text, /STUDIO SHOT/i)
  put('SSP', grab(studio, new RegExp(`with photographer:\\s*${NUM}\\s*KWD`, 'i')))
  put('SSS', grab(studio, new RegExp(`self[- ]portrait:\\s*${NUM}\\s*KWD`, 'i')))

  const prints = section(text, /EXTRA PRINTS/i)
  const pr = new RegExp(`(\\d+)\\s*pieces:\\s*${NUM}\\s*KWD for 3R,\\s*${NUM}\\s*KWD for 4R`, 'gi')
  for (let m = pr.exec(prints); m; m = pr.exec(prints)) {
    put(`EP3-${m[1]}`, Number(m[2]))
    put(`EP4-${m[1]}`, Number(m[3]))
  }

  const zones: Knowledge['zones'] = []
  const table = section(text, /LOCATION CHARGE TABLE/i)
  for (const line of table.split(/\r?\n/)) {
    const m = /^\W*(\d+(?:\.\d+)?)\s*KWD[^:]*:\s*(.+)$/i.exec(line.trim())
    if (!m) continue
    const areas = m[2].split(/;/).map((a) => a.trim().replace(/\.$/, '')).filter(Boolean)
    if (areas.length) zones.push({ charge: Number(m[1]), areas })
  }

  const tbaBlock = section(text, /IMPORTANT TBA/i)
  const tba = tbaBlock
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s●•*\-–—\d.)]+/, '').trim().toLowerCase())
    .filter((l) => l.length > 3 && !/^until these are confirmed|^the following information/.test(l))

  return { prices, zones, tba, priceCount: Object.keys(prices).length }
}

/** Is this a result worth applying? Guards against a half-edited or wrong document. */
export function plausible(k: Knowledge): { prices: boolean; zones: boolean } {
  const zoneAreas = k.zones.reduce((n, z) => n + z.areas.length, 0)
  const charges = k.zones.map((z) => z.charge)
  return {
    prices: k.priceCount >= 18,
    zones: zoneAreas >= 100 && charges.length >= 2 && charges.every((c) => c >= 0 && c <= 200) && charges.includes(0),
  }
}
