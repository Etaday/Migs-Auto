import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SquaresFour, ClipboardText, CalendarBlank, Receipt, Star, ChatCircleDots, SignOut, ArrowsClockwise, ArrowUpRight, ChartLineUp, Calculator, UsersThree, Quotes } from '@/components/slab'
import { backendOn, getSession, onSessionChange, resetDemo, signOut } from '@/lib/db'
import { getTheme, toggleTheme, type Theme } from '@/lib/theme'
import ThemedImg from '@/components/ThemedImg'
import ThemeGlyph from '@/components/ThemeGlyph'
import { DataProvider, useData } from '@/components/admin/data'
import Login from '@/components/admin/Login'
import Overview from '@/components/admin/Overview'
import BookingsView from '@/components/admin/BookingsView'
import CalendarView from '@/components/admin/CalendarView'
import InvoicesView from '@/components/admin/InvoicesView'
import ReviewsView from '@/components/admin/ReviewsView'
import MessagesView from '@/components/admin/MessagesView'
import QuoteView from '@/components/admin/QuoteView'
import QuotesView from '@/components/admin/QuotesView'
import TeamView from '@/components/admin/TeamView'
import TabBoundary from '@/components/admin/TabBoundary'
import AdminAlerts from '@/components/admin/AdminAlerts'

const FinanceView = lazy(() => import('@/components/admin/FinanceView'))

/**
 * The studio dashboard at /admin: bookings, a calendar, invoices and
 * receipts, reviews to approve and messages. Data lives in Supabase when
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set, otherwise in this
 * browser (demo mode). See src/lib/db.ts and supabase/schema.sql.
 */

const TABS = [
  { id: 'overview', label: 'Overview', Icon: SquaresFour },
  { id: 'bookings', label: 'Bookings', Icon: ClipboardText },
  { id: 'calendar', label: 'Calendar', Icon: CalendarBlank },
  { id: 'invoices', label: 'Invoices', Icon: Receipt },
  { id: 'quotes', label: 'Quote requests', Icon: Quotes },
  { id: 'quote', label: 'Quotation', Icon: Calculator },
  { id: 'finance', label: 'Finance', Icon: ChartLineUp },
  { id: 'reviews', label: 'Reviews', Icon: Star },
  { id: 'messages', label: 'Messages', Icon: ChatCircleDots },
  { id: 'team', label: 'Team', Icon: UsersThree },
] as const
type TabId = (typeof TABS)[number]['id']

function Shell({ email, demo }: { email: string; demo: boolean }) {
  const [tab, setTab] = useState<TabId>(() => {
    const h = window.location.hash.slice(1) as TabId
    return TABS.some((t) => t.id === h) ? h : 'overview'
  })
  const { data, loading, error, reload } = useData()
  const go = (t: string) => { setTab(t as TabId) }
  const [theme, setThemeState] = useState<Theme>('light')
  useEffect(() => setThemeState(getTheme()), [])

  useEffect(() => {
    document.title = 'Dashboard - Judeng Production Studio'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.slice(1) as TabId
      if (TABS.some((t) => t.id === h)) setTab(h)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    history.replaceState(null, '', `#${tab}`)
  }, [tab])

  const badge: Partial<Record<TabId, number>> = {
    bookings: data.bookings.filter((b) => b.status === 'new' || b.change_request?.status === 'pending').length,
    quotes: data.quotes.filter((q) => q.status === 'new').length,
    reviews: data.reviews.filter((r) => r.status === 'pending').length,
    messages: data.messages.filter((m) => !m.handled).length,
  }

  return (
    <div className="adm">
      <div className="adm-wrap">
        <AdminAlerts go={(t) => setTab(t as TabId)} />
        <header className="adm-head">
          <div className="adm-brand">
            <ThemedImg className="adm-logo" light="/logo.png" dark="/logo-dark.png" alt="Judeng Production Studio" width={150} />
            <div>
              <h1>Studio dashboard</h1>
              <p className="adm-sub">Bookings, calendar, invoices, reviews and messages in one place.</p>
            </div>
          </div>
          <div className="adm-hright">
            <div className="adm-hactions">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => void reload()} disabled={loading}><ArrowsClockwise size={15} aria-hidden="true" /> {loading ? 'Loading' : 'Refresh'}</button>
              <button
                type="button"
                className="adm-btn adm-btn--ghost adm-themebtn"
                onClick={() => setThemeState(toggleTheme())}
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                <ThemeGlyph theme={theme} size={16} /> {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>
            <div className="adm-hlinks">
              <Link to="/invoice" className="adm-side__link">Invoice tool <ArrowUpRight size={13} aria-hidden="true" /></Link>
              <Link to="/" target="_blank" rel="noopener noreferrer" className="adm-side__link">View website <ArrowUpRight size={13} aria-hidden="true" /></Link>
              <button type="button" className="adm-side__link" onClick={signOut}><SignOut size={14} aria-hidden="true" /> Sign out</button>
            </div>
            <small className="adm-asof">{email}</small>
          </div>
        </header>

        <nav className="adm-pagenav" aria-label="Dashboard sections">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              <Icon size={17} weight={tab === id ? 'fill' : 'regular'} aria-hidden="true" />
              <span>{label}</span>
              {!!badge[id] && <i aria-label={`${badge[id]} waiting`}>{badge[id]}</i>}
            </button>
          ))}
        </nav>

        <main className="adm-main" aria-label={TABS.find((t) => t.id === tab)?.label}>
          {demo && (
            <p className="adm-banner" role="status">
              {backendOn ? 'Demo mode.' : 'Demo mode: no database is connected, so data stays in this browser only.'}{' '}
              <button type="button" onClick={() => { resetDemo(); void reload() }}>Reset sample data</button>
            </p>
          )}
          {error && <p className="adm-error" role="alert">{error}</p>}
          <TabBoundary resetKey={tab}>
          {tab === 'overview' && <Overview go={go} />}
          {tab === 'bookings' && <BookingsView />}
          {tab === 'calendar' && <CalendarView />}
          {tab === 'invoices' && <InvoicesView />}
          {tab === 'quote' && <QuoteView />}
          {tab === 'quotes' && <QuotesView />}
          {tab === 'finance' && <Suspense fallback={<p className="adm-note">Loading charts</p>}><FinanceView /></Suspense>}
          {tab === 'reviews' && <ReviewsView />}
          {tab === 'messages' && <MessagesView />}
          {tab === 'team' && <TeamView />}
          </TabBoundary>
        </main>
      </div>
    </div>
  )
}

export default function AdminApp() {
  const [session, setSession] = useState(getSession)
  useEffect(() => onSessionChange(() => setSession(getSession())), [])
  if (!session) return <Login />
  return (
    <DataProvider>
      <Shell email={session.email} demo={!!session.demo} />
    </DataProvider>
  )
}
