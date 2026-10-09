import { buildPrompt, type EnhanceVehicle } from './enhance'

/** The server side of the optional AI enhancer. No framework code here, so it can be tested; api/enhance.ts just feeds it a request. */

export type ServerEnv = { anthropicKey: string; supabaseUrl: string; supabaseKey: string; model: string }
export type EnhanceRequest = { authorization: string; body: unknown }
export type EnhanceResponse = { status: number; json: { text: string } | { error: string } }

const err = (status: number, error: string): EnhanceResponse => ({ status, json: { error } })
const MAX_TEXT = 3000

function parseBody(b: unknown): { kind: 'description' | 'modifications'; text: string; vehicle: EnhanceVehicle; mods: string[] } | null {
  if (!b || typeof b !== 'object') return null
  const o = b as Record<string, unknown>
  if (o.kind !== 'description' && o.kind !== 'modifications') return null
  if (typeof o.text !== 'string' || o.text.length > MAX_TEXT) return null
  if (!o.vehicle || typeof o.vehicle !== 'object') return null
  const v = o.vehicle as Record<string, unknown>
  const s = (x: unknown) => (typeof x === 'string' ? x.slice(0, 120) : '')
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0)
  const mods = Array.isArray(o.modifications) ? o.modifications.filter((m): m is string => typeof m === 'string').slice(0, 30).map((m) => m.slice(0, 120)) : []
  return {
    kind: o.kind, text: o.text, mods,
    vehicle: { year: n(v.year), brand: s(v.brand), model: s(v.model), type: v.type === 'motorcycle' ? 'motorcycle' : 'car', body: s(v.body), engine: s(v.engine), transmission: s(v.transmission), fuel: s(v.fuel), color: s(v.color), mileage: n(v.mileage), price: n(v.price) },
  }
}

export async function handleEnhance(req: EnhanceRequest, env: ServerEnv, fetchFn: typeof fetch): Promise<EnhanceResponse> {
  const token = /^Bearer\s+(.+)$/i.exec(req.authorization)?.[1]
  if (!token) return err(401, 'Please sign in.')
  const parsed = parseBody(req.body)
  if (!parsed) return err(400, 'Bad request.')
  if (!env.anthropicKey) return err(501, 'The AI enhancer is not set up.')

  // Only the owner may spend the AI key: ask the database whether this user is an admin.
  try {
    const r = await fetchFn(`${env.supabaseUrl}/rest/v1/rpc/is_admin`, { method: 'POST', headers: { apikey: env.supabaseKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' })
    if (!r.ok || (await r.json()) !== true) return err(403, 'Only the owner can use the enhancer.')
  } catch {
    return err(403, 'Only the owner can use the enhancer.')
  }

  try {
    const ai = await fetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.model, max_tokens: 500, messages: [{ role: 'user', content: buildPrompt(parsed.kind, parsed.text, parsed.vehicle, parsed.mods) }] }),
    })
    if (!ai.ok) return err(502, 'The AI service did not answer.')
    const data = (await ai.json()) as { content?: { type: string; text?: string }[] }
    const text = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('').trim()
    return text ? { status: 200, json: { text } } : err(502, 'The AI service returned nothing.')
  } catch {
    return err(502, 'The AI service did not answer.')
  }
}
