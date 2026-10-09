import { parseKnowledge, plausible } from '../src/lib/knowledgeParse.js'

/**
 * Vercel function: GET /api/knowledge
 * Reads the studio's Google Doc (shared as "Anyone with the link - Viewer"),
 * parses it and returns the facts the site uses. Cached for 5 minutes, so a
 * change in the doc reaches the site within a few minutes.
 * Set GOOGLE_DOC_ID in Vercel to point at a different document.
 */
const DOC_ID = process.env.GOOGLE_DOC_ID || '17ciFOmNEjfhKvHXq2Y-8XlQHmj25G3TJz5oLA-HXTec'

type Res = { status: (n: number) => Res; setHeader: (k: string, v: string) => void; json: (b: unknown) => void }

export default async function handler(_req: unknown, res: Res) {
  try {
    const r = await fetch(`https://docs.google.com/document/d/${DOC_ID}/export?format=txt`, { redirect: 'follow' })
    const text = await r.text()
    if (!r.ok || /<html/i.test(text.slice(0, 300))) {
      res.status(502).json({ ok: false, error: 'The document could not be read. Is it shared with "Anyone with the link"?' })
      return
    }
    const k = parseKnowledge(text)
    const ok = plausible(k)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600')
    res.status(200).json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      prices: ok.prices ? k.prices : {},
      zones: ok.zones ? k.zones : [],
      tba: k.tba,
      found: { prices: k.priceCount, areas: k.zones.reduce((n, z) => n + z.areas.length, 0) },
    })
  } catch {
    res.status(502).json({ ok: false, error: 'The document could not be reached.' })
  }
}
