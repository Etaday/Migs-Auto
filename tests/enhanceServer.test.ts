import { describe, it, expect } from 'vitest'
import { handleEnhance, type ServerEnv } from '../src/lib/enhanceServer'

const env: ServerEnv = { anthropicKey: 'sk-test', supabaseUrl: 'https://x.supabase.co', supabaseKey: 'anon', model: 'claude-sonnet-5-5' }
const vehicle = { year: 2021, brand: 'Toyota', model: 'Vios', type: 'car', body: '', engine: '', transmission: '', fuel: '', color: '', mileage: 0, price: 640000 }
const body = { kind: 'description', text: 'one owner', vehicle, modifications: [] }

function fakeFetch(opts: { admin?: boolean; ai?: string; aiStatus?: number }) {
  const calls: { url: string; init?: RequestInit }[] = []
  const f = async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    if (url.includes('/rpc/is_admin')) return new Response(JSON.stringify(opts.admin ?? false), { status: 200 })
    return new Response(JSON.stringify({ content: [{ type: 'text', text: opts.ai ?? 'A fine car.' }] }), { status: opts.aiStatus ?? 200 })
  }
  return { f: f as typeof fetch, calls }
}

describe('handleEnhance', () => {
  it('refuses a caller who is not signed in', async () => {
    const { f, calls } = fakeFetch({ admin: true })
    const r = await handleEnhance({ authorization: '', body }, env, f)
    expect(r.status).toBe(401)
    expect(calls.length).toBe(0)
  })
  it('refuses a signed-in user who is not the owner, without calling the AI', async () => {
    const { f, calls } = fakeFetch({ admin: false })
    const r = await handleEnhance({ authorization: 'Bearer abc', body }, env, f)
    expect(r.status).toBe(403)
    expect(calls.some((c) => c.url.includes('anthropic'))).toBe(false)
  })
  it('answers the owner with the AI text', async () => {
    const { f, calls } = fakeFetch({ admin: true, ai: '  Clean one-owner Vios.  ' })
    const r = await handleEnhance({ authorization: 'Bearer abc', body }, env, f)
    expect(r).toEqual({ status: 200, json: { text: 'Clean one-owner Vios.' } })
    const ai = calls.find((c) => c.url.includes('anthropic'))!
    const sent = JSON.parse(String(ai.init?.body))
    expect(sent.model).toBe('claude-sonnet-5-5')
    expect(sent.messages[0].content).toContain('Toyota Vios')
    expect((ai.init?.headers as Record<string, string>)['x-api-key']).toBe('sk-test')
  })
  it('says 501 when the AI key is not set up, so the page falls back to the built-in enhancer', async () => {
    const { f } = fakeFetch({ admin: true })
    expect((await handleEnhance({ authorization: 'Bearer abc', body }, { ...env, anthropicKey: '' }, f)).status).toBe(501)
  })
  it('rejects a bad request before spending anything', async () => {
    const { f, calls } = fakeFetch({ admin: true })
    expect((await handleEnhance({ authorization: 'Bearer abc', body: { ...body, kind: 'poem' } }, env, f)).status).toBe(400)
    expect((await handleEnhance({ authorization: 'Bearer abc', body: { ...body, text: 'x'.repeat(5000) } }, env, f)).status).toBe(400)
    expect((await handleEnhance({ authorization: 'Bearer abc', body: null }, env, f)).status).toBe(400)
    expect(calls.length).toBe(0)
  })
  it('reports a failing AI as 502 instead of crashing', async () => {
    const { f } = fakeFetch({ admin: true, aiStatus: 500 })
    expect((await handleEnhance({ authorization: 'Bearer abc', body }, env, f)).status).toBe(502)
  })
})
