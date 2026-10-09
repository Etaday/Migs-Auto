import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SquaresFour, Car, ChatCircleDots, SignOut, ArrowsClockwise, ArrowUpRight, ChartLineUp, UsersThree } from '@/components/slab'
import { backendOn, getSession, onSessionChange, resetDemo, signOut } from '@/lib/db'
import { getTheme, toggleTheme, type Theme } from '@/lib/theme'
import ThemedImg from '@/components/ThemedImg'
import ThemeGlyph from '@/components/ThemeGlyph'
import { DataProvider, useData } from '@/components/admin/data'
import Login from '@/components/admin/Login'
import Overview from '@/components/admin/Overview'
import VehiclesView from '@/components/admin/VehiclesView'
import LeadsView from '@/components/admin/LeadsView'
import SalesView from '@/components/admin/SalesView'
import TeamView from '@/components/admin/TeamView'
import TabBoundary from '@/components/admin/TabBoundary'
import AdminAlerts from '@/components/admin/AdminAlerts'


/**
 * The studio dashboard at /admin: bookings, a calendar, invoices and
 * receipts, reviews to approve and messages. Data lives in Supabase when
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set, otherwise in this
 * browser (demo mode). See src/lib/db.ts and supabase/schema.sql.
 */

const TABS = [
  { id: 'overview', label: 'Overview', Icon: SquaresFour },
  { id: 'vehicles', label: 'Inventory', Icon: Car },
  { id: 'leads', label: 'Leads', Icon: ChatCircleDots },
  { id: 'sales', label: 'Sales', Icon: ChartLineUp },
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
    document.title = 'Dashboard - Migs Auto'
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
    leads: data.inquiries.filter((i) => i.status === 'new').length,
    vehicles: data.vehicles.filter((v) => v.status === 'reserved').length,
  }

  return (
    <div className="adm">
      <div className="adm-wrap">
        <AdminAlerts go={(t) => setTab(t as TabId)} />
        <header className="adm-head">
          <div className="adm-brand">
            <ThemedImg className="adm-logo" light="/logo.png" dark="/logo-dark.png" alt="Migs Auto" width={150} />
            <div>
              <h1>Dealer dashboard</h1>
              <p className="adm-sub">Inventory, leads, test drives and sales in one place.</p>
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
          {tab === 'vehicles' && <VehiclesView />}
          {tab === 'leads' && <LeadsView />}
          {tab === 'sales' && <SalesView />}
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
