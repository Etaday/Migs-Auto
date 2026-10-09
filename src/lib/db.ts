/**
 * Data layer for the dashboard and the public forms.
 *
 * With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set, every call goes to a
 * Supabase project over plain fetch (PostgREST + GoTrue), so no extra package
 * is needed. Without them the site runs in DEMO MODE: the same calls are
 * stored in this browser's localStorage so the dashboard can be explored.
 * The schema and security rules are in supabase/schema.sql.
 */

export const SUPABASE_URL: string = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
const KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
export const backendOn = !!(SUPABASE_URL && KEY)

import type { Vehicle, Inquiry } from '@/types/vehicle'
import { withDefaults } from '@/lib/inventory'
import type { SaleDocument } from '@/types/document'
import type { Product } from '@/types/product'
import { productWithDefaults } from '@/lib/products'
import { SAMPLE_PRODUCTS } from '@/data/sampleProducts'

export type Table = 'vehicles' | 'inquiries' | 'documents' | 'products'

type Rows = { vehicles: Vehicle; inquiries: Inquiry; documents: SaleDocument; products: Product }

/* ---------- Session (admin) ---------- */

export type Session = { email: string; access_token: string; refresh_token: string; expires_at: number; demo?: boolean }
const SESSION_KEY = 'migs-admin-session'
const SESSION_EVENT = 'migs-session'

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    const sess = raw ? (JSON.parse(raw) as Session) : null
    return sess && sess.email === 'demo mode' ? null : sess // older anonymous demo sessions must sign in now
  } catch {
    return null
  }
}

function setSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(SESSION_EVENT))
}

export function onSessionChange(fn: () => void) {
  window.addEventListener(SESSION_EVENT, fn)
  return () => window.removeEventListener(SESSION_EVENT, fn)
}

export class DbError extends Error {}

async function authCall(path: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new DbError(json.error_description || json.msg || 'Sign in failed.')
  return json
}

const toSession = (j: { access_token: string; refresh_token: string; expires_in: number; user?: { email?: string } }, email: string): Session => ({
  email: j.user?.email ?? email,
  access_token: j.access_token,
  refresh_token: j.refresh_token,
  expires_at: Math.floor(Date.now() / 1000) + j.expires_in,
})

export async function signIn(email: string, password: string) {
  const j = await authCall('token?grant_type=password', { email, password })
  setSession(toSession(j, email))
}

export function enterDemo() {
  setSession({ email: 'demo mode', access_token: '', refresh_token: '', expires_at: 0, demo: true })
}

export function signOut() {
  setSession(null)
}

async function token(): Promise<string> {
  const s = getSession()
  if (!s) throw new DbError('Please sign in.')
  if (s.demo) return ''
  if (s.expires_at - 60 > Date.now() / 1000) return s.access_token
  try {
    const j = await authCall('token?grant_type=refresh_token', { refresh_token: s.refresh_token })
    const next = toSession(j, s.email)
    setSession(next)
    return next.access_token
  } catch {
    setSession(null)
    throw new DbError('Your session expired. Please sign in again.')
  }
}

/* ---------- Demo storage ---------- */

const DEMO_KEY = 'migs-demo-db-v1'
type Demo = { [T in Table]: Rows[T][] }

const dv = (n: number, o: Partial<Vehicle>): Vehicle => ({
  id: `demo-v${n}`, type: 'car', brand: '', model: '', year: 2020, price: 0, mileage: 0, transmission: 'Automatic',
  fuel: 'Gasoline', color: '', description: 'Sample listing. Replace it from the dashboard.', photos: [], videos: [], status: 'available',
  featured: false, vin: '', engine: '', body: '', modifications: [], cost: 0, sold_price: null, sold_at: null,
  created_at: new Date(Date.now() - n * 864e5).toISOString(), ...o,
})
function demoVehicles(): Vehicle[] {
  return [
    dv(1, { brand: 'Toyota', model: 'Vios 1.3 E', year: 2021, price: 640000, cost: 560000, mileage: 28000, color: 'White', featured: true, body: 'Sedan', engine: '1.3L 4-cyl', modifications: ['Dash cam', 'Tinted windows'] }),
    dv(2, { brand: 'Honda', model: 'City RS', year: 2022, price: 820000, cost: 730000, mileage: 15000, color: 'Silver', featured: true, body: 'Sedan', engine: '1.5L 4-cyl' }),
    dv(3, { brand: 'Mitsubishi', model: 'Xpander GLS', year: 2020, price: 780000, mileage: 41000, color: 'Gray', transmission: 'Manual', fuel: 'Diesel', status: 'reserved' }),
    dv(4, { type: 'motorcycle', brand: 'Honda', model: 'Click 160', year: 2023, price: 118000, cost: 98000, mileage: 4000, color: 'Red', transmission: 'CVT', featured: true, engine: '157cc 1-cyl', modifications: ['Aftermarket exhaust', 'Phone mount'] }),
    dv(5, { type: 'motorcycle', brand: 'Yamaha', model: 'NMAX 155', year: 2022, price: 135000, mileage: 9000, color: 'Black', transmission: 'CVT' }),
    dv(6, { type: 'motorcycle', brand: 'Kawasaki', model: 'Ninja 400', year: 2021, price: 330000, mileage: 12000, color: 'Green', transmission: 'Manual', status: 'sold', cost: 285000, sold_price: 320000, sold_at: new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10), engine: '399cc 2-cyl' }),
  ]
}

function demoProducts(): Product[] {
  return SAMPLE_PRODUCTS.map((p, i) => productWithDefaults({ ...p, id: `demo-p${i + 1}`, created_at: new Date(Date.now() - (i + 1) * 864e5).toISOString() }))
}

function seed(): Demo {
  return { vehicles: demoVehicles(), inquiries: [], documents: [], products: demoProducts() }
}

function demoRead(): Demo {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) { const d = JSON.parse(raw) as Demo; d.vehicles = (d.vehicles ?? []).map(withDefaults); d.inquiries = d.inquiries ?? []; d.documents = d.documents ?? []; d.products = (d.products ?? demoProducts()).map(productWithDefaults); return d }
  } catch { /* fall through */ }
  const d = seed()
  demoWrite(d)
  return d
}
function demoWrite(d: Demo) {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(d)) } catch { throw new DbError('This browser is out of storage space. Remove some photos or connect the database.') }
}
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`)

/* ---------- REST ---------- */

async function rest(path: string, init: { method?: string; body?: unknown; bearer?: string; prefer?: string } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: init.method ?? 'GET',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${init.bearer || KEY}`,
      'Content-Type': 'application/json',
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => null)
    throw new DbError(j?.message || `The server answered ${res.status}.`)
  }
  return res.status === 204 ? null : res.json().catch(() => null)
}

/* ---------- Admin operations ---------- */

export async function listRows<T extends Table>(table: T): Promise<Rows[T][]> {
  const s = getSession()
  if (!s) throw new DbError('Please sign in.')
  if (s.demo || !backendOn) {
    return [...demoRead()[table]].sort((a, b) => b.created_at.localeCompare(a.created_at)) as Rows[T][]
  }
  const rows = (await rest(`${table}?select=*&order=created_at.desc`, { bearer: await token() })) as Rows[T][]
  return (table === 'vehicles' ? (rows as Vehicle[]).map(withDefaults) : rows) as Rows[T][]
}

export async function addRow<T extends Table>(table: T, row: Partial<Rows[T]>): Promise<Rows[T]> {
  const s = getSession()
  if (!s) throw new DbError('Please sign in.')
  if (s.demo || !backendOn) {
    const d = demoRead()
    const full = { id: newId(), created_at: new Date().toISOString(), ...(table === 'documents' ? { share_token: newId() } : {}), ...row } as Rows[T]
    ;(d[table] as Rows[T][]).unshift(full)
    demoWrite(d)
    return full
  }
  const out = (await rest(table, { method: 'POST', body: row, bearer: await token(), prefer: 'return=representation' })) as Rows[T][]
  return out[0]
}

export async function updateRow<T extends Table>(table: T, id: string, patch: Partial<Rows[T]>) {
  const s = getSession()
  if (!s) throw new DbError('Please sign in.')
  if (s.demo || !backendOn) {
    const d = demoRead()
    const list = d[table] as Rows[T][]
    const i = list.findIndex((r) => r.id === id)
    if (i >= 0) list[i] = { ...list[i], ...patch }
    demoWrite(d)
    return
  }
  await rest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: patch, bearer: await token(), prefer: 'return=minimal' })
}

export async function deleteRow(table: Table, id: string) {
  const s = getSession()
  if (!s) throw new DbError('Please sign in.')
  if (s.demo || !backendOn) {
    const d = demoRead()
    ;(d[table] as { id: string }[]) = (d[table] as { id: string }[]).filter((r) => r.id !== id)
    demoWrite(d)
    return
  }
  await rest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', bearer: await token(), prefer: 'return=minimal' })
}

const PHOTO_BUCKET = 'vehicle-photos'

/** Stores one (already resized) picture and returns the address to save on the listing.
 *  With a database it goes to the public `vehicle-photos` bucket; in demo mode it is kept in this browser as a data address. */
export async function uploadPhoto(blob: Blob): Promise<string> {
  if (!getSession()) throw new DbError('Please sign in.')
  if (!backendOn || getSession()?.demo) {
    return await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.onerror = () => rej(new DbError('Could not read that picture.'))
      r.readAsDataURL(blob)
    })
  }
  const name = `${newId()}.jpg`
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${name}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${await token()}`, 'Content-Type': 'image/jpeg', 'x-upsert': 'false' },
    body: blob,
  })
  if (!res.ok) throw new DbError('The photo could not be uploaded. Please try again.')
  return `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${name}`
}

const VIDEO_BUCKET = 'vehicle-videos'

/** Stores one video file and returns its public address. Needs the database; in demo mode paste a video link instead. */
export async function uploadVideo(file: File): Promise<string> {
  if (!getSession()) throw new DbError('Please sign in.')
  if (!backendOn || getSession()?.demo) throw new DbError('Uploading a video needs the database connected. For now, paste a YouTube or video link instead.')
  const ext = (/\.(mp4|webm|mov)$/i.exec(file.name)?.[1] ?? 'mp4').toLowerCase()
  const type = file.type || (ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4')
  const name = `${newId()}.${ext}`
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${VIDEO_BUCKET}/${name}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${await token()}`, 'Content-Type': type, 'x-upsert': 'false' },
    body: file,
  })
  if (!res.ok) throw new DbError(res.status === 413 ? 'That video is too large for the server. Trim it or paste a YouTube link.' : 'The video could not be uploaded. Please try again.')
  return `${SUPABASE_URL}/storage/v1/object/public/${VIDEO_BUCKET}/${name}`
}

export function resetDemo() {
  try { localStorage.removeItem(DEMO_KEY) } catch { /* ignore */ }
}

/* ---------- Public operations (no sign-in) ---------- */

/** A visitor's submission. Returns true when it was stored (backend or demo). */
export async function submitPublic<T extends 'inquiries'>(table: T, row: Partial<Rows[T]>): Promise<void> {
  if (backendOn) {
    await rest(table, { method: 'POST', body: row, prefer: 'return=minimal' })
    return
  }
  const d = demoRead()
  ;(d[table] as Rows[T][]).unshift({ id: newId(), created_at: new Date().toISOString(), ...row } as Rows[T])
  demoWrite(d)
}

/** A document opened through its private link (public: the link itself is the key). */
export async function sharedDocument(token: string): Promise<SaleDocument | null> {
  if (!/^[0-9a-f-]{20,40}$/i.test(token)) return null
  try {
    if (backendOn) {
      const r = (await rest('rpc/get_shared_document', { method: 'POST', body: { p_token: token } })) as SaleDocument | null
      return r && typeof r === 'object' ? ({ ...r, id: '', created_at: '' } as SaleDocument) : null
    }
    return demoRead().documents.find((d) => d.share_token === token) ?? null
  } catch {
    return null
  }
}

/** The columns visitors may read (matches the grant in supabase/schema.sql). */
const PUBLIC_VEHICLE_COLUMNS = 'id,created_at,type,brand,model,year,price,mileage,transmission,fuel,color,description,photos,videos,status,featured,vin,engine,body,modifications'

/** Mags and accessories shown on the website: listed items only. */
export async function listProducts(): Promise<Product[]> {
  if (backendOn) return (((await rest('products?select=*&listed=eq.true&order=created_at.desc')) ?? []) as Product[]).map(productWithDefaults)
  return demoRead().products.filter((p) => p.listed)
}

/** Public vehicle listing (sold vehicles are never returned to visitors). */
export async function listVehicles(): Promise<Vehicle[]> {
  if (backendOn) {
    const rows = ((await rest(`vehicles?select=${PUBLIC_VEHICLE_COLUMNS}&status=neq.sold&order=created_at.desc`)) ?? []) as Vehicle[]
    return rows.map((v) => ({ ...withDefaults(v), cost: 0, sold_price: null, sold_at: null }))
  }
  return demoRead().vehicles.filter((v) => v.status !== 'sold').map((v) => ({ ...v, cost: 0, sold_price: null, sold_at: null }))
}

/* ---------- Accounts: sign-in and team ---------- */

export type TeamMember = { email: string; you?: boolean }
const USERS_KEY = 'migs-demo-users'
type DemoUser = { email: string; salt: string; hash: string }

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}
function demoUsers(): DemoUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]') as DemoUser[] } catch { return [] }
}
const saveDemoUsers = (u: DemoUser[]) => { try { localStorage.setItem(USERS_KEY, JSON.stringify(u)) } catch { /* storage unavailable */ } }
const validEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)

/** Without a database: are there accounts on this browser yet? */
export const hasLocalAccounts = () => demoUsers().length > 0

async function addLocalAccount(email: string, password: string) {
  const e = email.trim().toLowerCase()
  if (!validEmail(e)) throw new DbError('Enter a valid email.')
  if (password.length < 8) throw new DbError('Use a password of at least 8 characters.')
  const users = demoUsers()
  if (users.some((u) => u.email === e)) throw new DbError('That email already has an account.')
  const salt = newId()
  users.push({ email: e, salt, hash: await sha256(`${salt}:${password}`) })
  saveDemoUsers(users)
}

/** Create the first account on this browser and sign in (no database connected). */
export async function createFirstAccount(email: string, password: string) {
  if (demoUsers().length) throw new DbError('An account already exists. Sign in instead.')
  await addLocalAccount(email, password)
  setSession({ email: email.trim().toLowerCase(), access_token: '', refresh_token: '', expires_at: 0, demo: true })
}

/** Sign in to the browser-only dashboard (no database connected). */
export async function signInLocal(email: string, password: string) {
  const e = email.trim().toLowerCase()
  const u = demoUsers().find((x) => x.email === e)
  if (!u || u.hash !== (await sha256(`${u.salt}:${password}`))) throw new DbError('Wrong email or password.')
  setSession({ email: e, access_token: '', refresh_token: '', expires_at: 0, demo: true })
}

/** Everyone who can sign in to the dashboard. */
export async function listTeam(): Promise<TeamMember[]> {
  const me = getSession()?.email.toLowerCase()
  if (backendOn && !getSession()?.demo) {
    const rows = (await rest('admins?select=email&order=email', { bearer: await token() })) as { email: string }[]
    return rows.map((r) => ({ email: r.email, you: r.email.toLowerCase() === me }))
  }
  return demoUsers().map((u) => ({ email: u.email, you: u.email === me }))
}

/** Give someone access: creates their account with the password you choose. */
export async function addTeamMember(email: string, password: string) {
  const e = email.trim().toLowerCase()
  if (!backendOn || getSession()?.demo) return addLocalAccount(e, password)
  if (!validEmail(e)) throw new DbError('Enter a valid email.')
  if (password.length < 8) throw new DbError('Use a password of at least 8 characters.')
  const bearer = await token()
  try {
    await authCall('signup', { email: e, password })
  } catch (x) {
    // An existing account is fine: they only need to be added to the team.
    if (!(x instanceof DbError) || !/already|registered|exists/i.test(x.message)) throw x
  }
  await rest('admins', { method: 'POST', body: { email: e }, bearer, prefer: 'resolution=ignore-duplicates,return=minimal' })
}

export async function removeTeamMember(email: string) {
  const e = email.toLowerCase()
  if (e === getSession()?.email.toLowerCase()) throw new DbError('You cannot remove yourself.')
  if (!backendOn || getSession()?.demo) return saveDemoUsers(demoUsers().filter((u) => u.email !== e))
  await rest(`admins?email=eq.${encodeURIComponent(e)}`, { method: 'DELETE', bearer: await token() })
}
