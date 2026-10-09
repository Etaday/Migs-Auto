import { handleEnhance } from '../src/lib/enhanceServer.js'

/**
 * POST /api/enhance: the optional AI layer of the listing enhancer (Vercel function).
 * Needs these environment variables on the host; without ANTHROPIC_API_KEY it answers 501 and
 * the dashboard quietly uses its built-in enhancer instead.
 *   ANTHROPIC_API_KEY   your Anthropic API key
 *   SUPABASE_URL, SUPABASE_ANON_KEY   the same project the site uses (to check the caller is the owner)
 *   ENHANCE_MODEL       optional, defaults to claude-sonnet-5-5
 */
type Req = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }
type Res = { status: (code: number) => Res; json: (body: unknown) => void; setHeader: (k: string, v: string) => void }

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' })
  const auth = req.headers.authorization
  const out = await handleEnhance(
    { authorization: Array.isArray(auth) ? auth[0] : auth ?? '', body: req.body },
    {
      anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
      supabaseUrl: (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, ''),
      supabaseKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
      model: process.env.ENHANCE_MODEL ?? 'claude-sonnet-5-5',
    },
    fetch,
  )
  return res.status(out.status).json(out.json)
}
