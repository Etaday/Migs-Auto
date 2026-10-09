import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import ThemeGlyph from '@/components/ThemeGlyph'
import { getTheme, toggleTheme, type Theme } from '@/lib/theme'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/accessories', label: 'Mags & Accessories' },
  { to: '/trade-in', label: 'Trade-in' },
  { to: '/test-drive', label: 'Test Drive' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
] as const

/** The top bar: logo left, links centred, theme switch and the main button right. Phones use the bottom tab bar instead of the links. */
export default function SiteHeader() {
  const [theme, setThemeState] = useState<Theme>('dark')
  useEffect(() => {
    setThemeState(getTheme())
    const onTheme = (e: Event) => setThemeState((e as CustomEvent<Theme>).detail)
    window.addEventListener('themechange', onTheme)
    return () => window.removeEventListener('themechange', onTheme)
  }, [])

  return (
    <header className="site-header">
      <Link to="/" className="site-header__logo" aria-label="Migs Auto, home">
        <img src="/logo-wide.png" alt="Migs Auto" width={96} height={55} />
      </Link>
      <nav className="site-header__nav" aria-label="Main">
        {LINKS.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className="site-header__link">{label}</NavLink>
        ))}
      </nav>
      <div className="site-header__right">
        <button type="button" className="site-header__theme" onClick={() => setThemeState(toggleTheme())} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          <ThemeGlyph theme={theme} size={19} />
        </button>
        <Link to="/inventory" className="site-header__cta">Browse Inventory</Link>
      </div>
    </header>
  )
}
