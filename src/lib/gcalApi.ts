import type { BookingRow } from '@/lib/db'
import { bookingEvent, TIME_ZONE } from '@/lib/gcal'

/**
 * Two-way Google Calendar sync from the browser.
 *
 * Uses Google Identity Services (a pop-up sign-in) with a public OAuth Client ID
 * (VITE_GOOGLE_CLIENT_ID, or typed into the dashboard). No secret is needed or
 * stored. The access token lives about an hour, in this tab only. It can read
 * and write events on the owner's own calendar ("primary") and nothing else.
 */

const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const CLIENT_KEY = 'migs-google-client-id'
const TOKEN_KEY = 'migs-google-token'
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export type GEvent = {
  id: string
  summary: string
  location?: string
  date: string
  allDay: boolean
  start: string
  end: string
  htmlLink?: string
  /** Set on events this dashboard created. */
  bookingId?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string
            scope: string
            callback: (r: { access_token?: string; expires_in?: number; error?: string }) => void
            error_callback?: (e: { type: string }) => void
          }) => { requestAccessToken: (o?: { prompt?: string }) => void }
          revoke: (token: string, done: () => void) => void
        }
      }
    }
  }
}

export function getClientId(): string {
  try {
    return localStorage.getItem(CLIENT_KEY) || (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '')
  } catch {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
  }
}
export function setClientId(id: string) {
  try {
    if (id.trim()) localStorage.setItem(CLIENT_KEY, id.trim())
    else localStorage.removeItem(CLIENT_KEY)
  } catch { /* storage unavailable */ }
}

type Tok = { token: string; exp: number }
function readTok(): Tok | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? 'null') as Tok | null
    return t && t.exp - 30_000 > Date.now() ? t : null
  } catch {
    return null
  }
}

export const isConnected = () => !!readTok()

let gisLoading: Promise<void> | null = null
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  gisLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gisLoading = null
      reject(new Error('Could not load Google sign-in. Check your internet connection.'))
    }
    document.head.appendChild(s)
  })
  return gisLoading
}

/** Opens Google's consent pop-up. Must be called from a click. */
export async function connect(): Promise<void> {
  const clientId = getClientId()
  if (!clientId) throw new Error('Add your Google Client ID first.')
  await loadGis()
  await new Promise<void>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (r) => {
        if (!r.access_token) return reject(new Error(r.error ? `Google said: ${r.error}` : 'Google sign-in did not complete.'))
        try {
          sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token: r.access_token, exp: Date.now() + (r.expires_in ?? 3600) * 1000 } satisfies Tok))
        } catch { /* storage unavailable */ }
        resolve()
      },
      error_callback: (e) => reject(new Error(e.type === 'popup_closed' ? 'The Google window was closed.' : 'Google sign-in was blocked. Allow pop-ups for this site.')),
    })
    client.requestAccessToken({ prompt: '' })
  })
}

export function disconnect() {
  const t = readTok()
  try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
  if (t) window.google?.accounts.oauth2.revoke(t.token, () => undefined)
}

async function call(url: string, init: RequestInit = {}) {
  const t = readTok()
  if (!t) throw new Error('Google Calendar is not connected. Press Connect again.')
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${t.token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
  if (res.status === 401) {
    try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
    throw new Error('Google session expired. Press Connect again.')
  }
  if (!res.ok) {
    const j = await res.json().catch(() => null)
    throw new Error(j?.error?.message || `Google answered ${res.status}.`)
  }
  return res.status === 204 ? null : res.json()
}

type Raw = {
  id: string
  summary?: string
  location?: string
  htmlLink?: string
  status?: string
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
  extendedProperties?: { private?: { bookingId?: string } }
}

const toEvent = (r: Raw): GEvent | null => {
  if (r.status === 'cancelled' || !r.start) return null
  const allDay = !!r.start.date
  const start = r.start.date ?? r.start.dateTime ?? ''
  return {
    id: r.id,
    summary: r.summary || '(no title)',
    location: r.location,
    date: start.slice(0, 10),
    allDay,
    start,
    end: r.end?.date ?? r.end?.dateTime ?? '',
    htmlLink: r.htmlLink,
    bookingId: r.extendedProperties?.private?.bookingId,
  }
}

/** Events between two dates (ISO strings, end exclusive). */
export async function listEvents(from: Date, to: Date): Promise<GEvent[]> {
  const q = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', maxResults: '250', timeMin: from.toISOString(), timeMax: to.toISOString(), timeZone: TIME_ZONE })
  const j = (await call(`${API}?${q}`)) as { items?: Raw[] }
  return (j.items ?? []).map(toEvent).filter((e): e is GEvent => !!e)
}

async function findForBooking(id: string): Promise<string | null> {
  const q = new URLSearchParams({ privateExtendedProperty: `bookingId=${id}`, maxResults: '1', showDeleted: 'false' })
  const j = (await call(`${API}?${q}`)) as { items?: Raw[] }
  return j.items?.find((e) => e.status !== 'cancelled')?.id ?? null
}

const body = (b: BookingRow) => {
  const ev = bookingEvent(b)
  return {
    summary: ev.summary,
    description: ev.description,
    location: ev.location,
    start: { dateTime: ev.start, timeZone: TIME_ZONE },
    end: { dateTime: ev.end, timeZone: TIME_ZONE },
    extendedProperties: { private: { bookingId: b.id, source: 'migs-dashboard' } },
  }
}

/** Create the booking's event, or update it if it is already there. */
export async function syncBooking(b: BookingRow): Promise<'created' | 'updated'> {
  const existing = await findForBooking(b.id)
  if (existing) {
    await call(`${API}/${existing}`, { method: 'PUT', body: JSON.stringify(body(b)) })
    return 'updated'
  }
  await call(API, { method: 'POST', body: JSON.stringify(body(b)) })
  return 'created'
}

export async function removeBookingEvent(b: BookingRow): Promise<boolean> {
  const existing = await findForBooking(b.id)
  if (!existing) return false
  await call(`${API}/${existing}`, { method: 'DELETE' })
  return true
}
