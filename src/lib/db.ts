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

export type Table = 'bookings' | 'invoices' | 'reviews' | 'messages' | 'quotes' | 'revenue' | 'expenses' | 'vehicles' | 'inquiries'

export type BookingItem = { id: string; code: string; name: string; detail: string; price: number | null }
export type BookingStatus = 'new' | 'confirmed' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'deposit_paid' | 'fully_paid'

export type ChangeRequest = { type: 'reschedule' | 'cancel'; date?: string; time?: string; note?: string; status: 'pending' | 'approved' | 'declined'; at: string }

export type BookingRow = {
  id: string
  created_at: string
  status: BookingStatus
  name: string
  email: string
  phone: string
  event_type: string
  event_date: string
  start_time: string
  duration: string
  area: string
  venue: string
  guests: string
  notes: string
  items: BookingItem[]
  subtotal: number
  location_charge: number
  total: number
  deposit: number
  balance: number
  has_quote_only: boolean
  deposit_paid: boolean
  payment_status: PaymentStatus
  amount_paid: number
  admin_notes: string
  review_code?: string
  manage_code?: string
  change_request?: ChangeRequest | null
  review_used?: boolean
  /** The studio sponsors this event: the client owes nothing and `sponsored_value` keeps the price that was waived. */
  sponsored?: boolean
  sponsored_value?: number
}

export type InvoiceRow = {
  id: string
  created_at: string
  kind: 'invoice' | 'receipt' | 'quotation'
  number: string
  booking_id: string | null
  client_name: string
  total: number
  paid: number
  data: Record<string, unknown>
  share_token: string
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected'
export type ReviewRow = {
  id: string
  created_at: string
  name: string
  email: string
  service: string
  rating: number
  text: string
  status: ReviewStatus
}

export type MessageRow = {
  id: string
  created_at: string
  name: string
  email: string
  message: string
  handled: boolean
}

export type QuoteStatus = 'new' | 'quoted' | 'booked' | 'closed'
export type QuoteRow = {
  id: string
  created_at: string
  status: QuoteStatus
  name: string
  email: string
  phone: string
  service: string
  event_type: string
  event_date: string | null
  area: string
  details: string
  quoted_price: number | null
  quote_note: string
}

export type RevenueRow = {
  id: string
  created_at: string
  entry_date: string
  stream: string
  client: string
  amount: number
  method: string
  /** Deduct the 20% fees (KLPJ, JP royalty, MFees) from this entry. */
  fees: boolean
  note: string
}

export type ExpenseRow = {
  id: string
  created_at: string
  entry_date: string
  /** One of the finance expense types, e.g. Miscellaneous. */
  category: string
  item: string
  amount: number
  note: string
}

type Rows = { bookings: BookingRow; invoices: InvoiceRow; reviews: ReviewRow; messages: MessageRow; quotes: QuoteRow; revenue: RevenueRow; expenses: ExpenseRow; vehicles: Vehicle; inquiries: Inquiry }

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

const iso = (d: Date) => d.toISOString().slice(0, 10)
const plusDays = (n: number) => iso(new Date(Date.now() + n * 864e5))

const dv = (n: number, o: Partial<Vehicle>): Vehicle => ({
  id: `demo-v${n}`, type: 'car', brand: '', model: '', year: 2020, price: 0, mileage: 0, transmission: 'Automatic',
  fuel: 'Gasoline', color: '', description: 'Sample listing. Replace it from the dashboard.', photos: [], status: 'available',
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

function seed(): Demo {
  const base = { created_at: new Date().toISOString(), guests: '80', notes: '', admin_notes: '', deposit_paid: false, payment_status: 'pending' as PaymentStatus, amount_paid: 0, has_quote_only: false, subtotal: 0, location_charge: 0 }
  const mk = (n: number, o: Partial<BookingRow>): BookingRow => ({
    ...base,
    id: `demo-${n}`,
    status: 'new',
    name: '',
    email: '',
    phone: '',
    event_type: '',
    event_date: '',
    start_time: '18:00',
    duration: '3 hours',
    area: '',
    venue: '',
    items: [],
    total: 0,
    deposit: 0,
    balance: 0,
    ...o,
  })
  return {
    bookings: [
      mk(1, { name: 'Demo Customer A', email: 'a@example.com', phone: '+965 5000 0001', event_type: 'Wedding', event_date: plusDays(12), area: 'Salmiya', venue: 'Sample hall, Salmiya', status: 'new', items: [{ id: '360C', code: '360C', name: '360 Photo Booth: Classic', detail: '3 hours, includes light setup', price: 120 }], subtotal: 120, total: 120, deposit: 36, balance: 84 }),
      mk(2, { name: 'Demo Customer B', email: 'b@example.com', phone: '+965 5000 0002', event_type: 'Birthday', event_date: plusDays(5), area: 'Jahra', venue: 'Sample villa, Jahra', status: 'confirmed', deposit_paid: true, payment_status: 'deposit_paid' as const, amount_paid: 31.5, items: [{ id: 'GPB-4R', code: 'GPB', name: 'Glass Photo Booth: Basic', detail: '1-50 guests, 4x6 inch prints', price: 85 }], subtotal: 85, location_charge: 20, total: 105, deposit: 31.5, balance: 73.5 }),
    ],
    invoices: [],
    reviews: [{ id: 'demo-r1', created_at: new Date().toISOString(), name: 'Demo Reviewer', email: 'r@example.com', service: 'Glass Photo Booth', rating: 5, text: 'This is a demo review waiting for approval.', status: 'pending' }],
    quotes: [],
    revenue: [],
    expenses: [],
    vehicles: demoVehicles(),
    inquiries: [],
    messages: [{ id: 'demo-m1', created_at: new Date().toISOString(), name: 'Demo Visitor', email: 'v@example.com', message: 'Hello, do you cover Fahaheel? (demo message)', handled: false }],
  }
}

function demoRead(): Demo {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) return JSON.parse(raw) as Demo
  } catch { /* fall through */ }
  const d = seed()
  demoWrite(d)
  return d
}
function demoWrite(d: Demo) {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(d)) } catch { /* storage unavailable */ }
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
  return (await rest(`${table}?select=*&order=created_at.desc`, { bearer: await token() })) as Rows[T][]
}

export async function addRow<T extends Table>(table: T, row: Partial<Rows[T]>): Promise<Rows[T]> {
  const s = getSession()
  if (!s) throw new DbError('Please sign in.')
  if (s.demo || !backendOn) {
    const d = demoRead()
    const full = { id: newId(), created_at: new Date().toISOString(), ...(table === 'invoices' ? { share_token: newId() } : {}), ...row } as Rows[T]
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

export function resetDemo() {
  try { localStorage.removeItem(DEMO_KEY) } catch { /* ignore */ }
}

/* ---------- Public operations (no sign-in) ---------- */

/** A visitor's submission. Returns true when it was stored (backend or demo). */
export async function submitPublic<T extends 'bookings' | 'reviews' | 'messages' | 'quotes' | 'inquiries'>(table: T, row: Partial<Rows[T]>): Promise<void> {
  if (backendOn) {
    await rest(table, { method: 'POST', body: row, prefer: 'return=minimal' })
    return
  }
  const d = demoRead()
  ;(d[table] as Rows[T][]).unshift({ id: newId(), created_at: new Date().toISOString(), ...row } as Rows[T])
  demoWrite(d)
}

/** The columns visitors may read (matches the grant in supabase/schema.sql). */
const PUBLIC_VEHICLE_COLUMNS = 'id,created_at,type,brand,model,year,price,mileage,transmission,fuel,color,description,photos,status,featured,vin,engine,body,modifications'

/** Public vehicle listing (sold vehicles are never returned to visitors). */
export async function listVehicles(): Promise<Vehicle[]> {
  if (backendOn) {
    const rows = ((await rest(`vehicles?select=${PUBLIC_VEHICLE_COLUMNS}&status=neq.sold&order=created_at.desc`)) ?? []) as Vehicle[]
    return rows.map((v) => ({ ...v, cost: 0, sold_price: null, sold_at: null }))
  }
  return demoRead().vehicles.filter((v) => v.status !== 'sold').map((v) => ({ ...v, cost: 0, sold_price: null, sold_at: null }))
}

/** Dates already confirmed for a booking, so the form can warn early. */
export async function bookedDates(): Promise<string[]> {
  try {
    if (backendOn) {
      const r = (await rest('rpc/booked_dates', { method: 'POST', body: {} })) as unknown
      return Array.isArray(r) ? r.map((x) => (typeof x === 'string' ? x : String((x as { booked_dates?: string }).booked_dates ?? ''))).filter(Boolean) : []
    }
    return demoRead().bookings.filter((b) => b.status === 'confirmed').map((b) => b.event_date)
  } catch {
    return []
  }
}

/** A document opened through its secret link (public). */
export async function sharedDocument(token: string): Promise<Record<string, unknown> | null> {
  try {
    if (backendOn) {
      const r = (await rest('rpc/get_shared_document', { method: 'POST', body: { p_token: token } })) as Record<string, unknown> | null
      return r && typeof r === 'object' ? r : null
    }
    return demoRead().invoices.find((i) => i.share_token === token)?.data ?? null
  } catch {
    return null
  }
}

export async function approvedReviews(): Promise<ReviewRow[]> {
  try {
    if (backendOn) return (await rest('reviews?select=*&status=eq.approved&order=created_at.desc')) as ReviewRow[]
    return demoRead().reviews.filter((r) => r.status === 'approved')
  } catch {
    return []
  }
}

/* ---------- Invite-only reviews ---------- */

export type ReviewInvite = { name: string; service: string }

/** Is this review code valid and unused? Returns the first name and service. */
export async function checkReviewCode(code: string): Promise<ReviewInvite | null> {
  if (!code) return null
  try {
    if (backendOn) {
      const r = (await rest('rpc/check_review_code', { method: 'POST', body: { p_code: code } })) as ReviewInvite | null
      return r && typeof r === 'object' ? r : null
    }
    const b = demoRead().bookings.find((x) => (x.review_code ?? x.id) === code && !x.review_used && x.status !== 'cancelled')
    return b ? { name: b.name.split(' ')[0], service: (b.items?.[0]?.name ?? '').split(':')[0] } : null
  } catch {
    return null
  }
}

/** Save a review for a valid code (it stays pending until approved) and use the code up. */
export async function submitInvitedReview(code: string, r: { name: string; rating: number; text: string }): Promise<void> {
  if (backendOn) {
    await rest('rpc/submit_review', { method: 'POST', body: { p_code: code, p_name: r.name, p_rating: r.rating, p_text: r.text } })
    return
  }
  const d = demoRead()
  const b = d.bookings.find((x) => (x.review_code ?? x.id) === code && !x.review_used && x.status !== 'cancelled')
  if (!b) throw new DbError('This review link is not valid or was already used.')
  b.review_used = true
  d.reviews.unshift({ id: newId(), created_at: new Date().toISOString(), name: r.name, email: b.email, service: (b.items?.[0]?.name ?? '').split(':')[0], rating: r.rating, text: r.text, status: 'pending' })
  demoWrite(d)
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

/* ---------- Customer booking page (private link) ---------- */

export type MyBooking = Pick<BookingRow, 'name' | 'status' | 'event_type' | 'event_date' | 'start_time' | 'duration' | 'area' | 'venue' | 'items' | 'total' | 'deposit' | 'balance' | 'amount_paid' | 'payment_status'> & { change_request: ChangeRequest | null }

/** One booking, by the private code its customer was given. Never includes email or phone. */
export async function getMyBooking(code: string): Promise<MyBooking | null> {
  if (!code) return null
  try {
    if (backendOn) {
      const r = (await rest('rpc/get_my_booking', { method: 'POST', body: { p_code: code } })) as MyBooking | null
      return r && typeof r === 'object' ? { ...r, items: r.items ?? [], change_request: r.change_request ?? null } : null
    }
    const b = demoRead().bookings.find((x) => (x.manage_code ?? x.id) === code)
    if (!b) return null
    const { name, status, event_type, event_date, start_time, duration, area, venue, items, total, deposit, balance, amount_paid, payment_status } = b
    return { name, status, event_type, event_date, start_time, duration, area, venue, items: items ?? [], total, deposit, balance, amount_paid, payment_status, change_request: b.change_request ?? null }
  } catch {
    return null
  }
}

/** The customer asks to move or cancel; the studio approves it in the dashboard. */
export async function requestBookingChange(code: string, req: { type: 'reschedule' | 'cancel'; date?: string; time?: string; note?: string }): Promise<void> {
  if (backendOn) {
    await rest('rpc/request_booking_change', { method: 'POST', body: { p_code: code, p_type: req.type, p_date: req.date || null, p_time: req.time ?? '', p_note: req.note ?? '' } })
    return
  }
  const d = demoRead()
  const b = d.bookings.find((x) => (x.manage_code ?? x.id) === code)
  if (!b) throw new DbError('We could not find that booking.')
  if (b.status !== 'new' && b.status !== 'confirmed') throw new DbError('This booking can no longer be changed online. Please contact us.')
  b.change_request = { type: req.type, date: req.date, time: req.time ?? '', note: req.note ?? '', status: 'pending', at: new Date().toISOString() }
  demoWrite(d)
}
