import { applyKnowledge } from '@/data/catalog'

/**
 * Keeps prices and the location table in step with the studio's Google Doc.
 *
 * The page starts from the copy it saved last time (so there is no wait),
 * then asks /api/knowledge for the latest and saves that for next time. The
 * very first visit waits up to 0.8s for the answer. If the doc cannot be
 * read, the built-in values in src/data/catalog.ts are used.
 */

const CACHE = 'migs-knowledge-v1'

type Payload = { ok?: boolean; prices?: Record<string, number>; zones?: { charge: number; areas: string[] }[] }

function valid(p: unknown): p is Payload {
  if (!p || typeof p !== 'object') return false
  const k = p as Payload
  if (k.ok !== true) return false
  if (k.prices && Object.values(k.prices).some((v) => typeof v !== 'number' || !(v > 0 && v <= 1000))) return false
  if (k.zones && k.zones.some((z) => typeof z.charge !== 'number' || !Array.isArray(z.areas))) return false
  return true
}

function readCache(): Payload | null {
  try {
    const p = JSON.parse(localStorage.getItem(CACHE) ?? 'null')
    return valid(p) ? p : null
  } catch {
    return null
  }
}

async function refresh() {
  const res = await fetch('/api/knowledge', { headers: { Accept: 'application/json' } })
  if (!res.ok) return
  const p: unknown = await res.json()
  if (!valid(p)) return
  applyKnowledge(p)
  try { localStorage.setItem(CACHE, JSON.stringify(p)) } catch { /* storage unavailable */ }
}

export function bootKnowledge(): Promise<void> {
  const cached = readCache()
  if (cached) applyKnowledge(cached)
  const latest = refresh().catch(() => undefined)
  return cached ? Promise.resolve() : Promise.race([latest, new Promise<void>((r) => setTimeout(r, 800))])
}
