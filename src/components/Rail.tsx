import { useEffect, useLayoutEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { SealCheck, CaretLeft, CaretRight } from '@/components/slab'
import ThemeGlyph from './ThemeGlyph'
import {
  HomeIcon,
  FolderIcon,
  StackIcon,
  StarIcon,
  UserIcon,
  MessageIcon,
  BookIcon,
} from './RailIcons'
import ThemedImg from '@/components/ThemedImg'
import { getTheme, toggleTheme, type Theme } from '@/lib/theme'
import { profile } from '@/data/profile'

/**
 * The profile rail: the fixed left column of the shell. It carries identity,
 * the theme switch and the section index, and it is the site's only navigation
 * surface from 1100px up - the floating NavBar pill hides there and takes over
 * again below it.
 *
 * The links are ROUTES, not anchors. Home is a fixed non-scrolling viewport, so
 * there is nothing for a scrollspy to spy on; the panel to the right swaps
 * instead. `NavLink` owns the active state, which is why there is no
 * IntersectionObserver here.
 */
export const RAIL_LINKS = [
  { label: 'Home', to: '/', Icon: HomeIcon },
  { label: 'Work', to: '/projects', Icon: FolderIcon },
  { label: 'Services', to: '/services', Icon: StackIcon },
  { label: 'Clients', to: '/testimonials', Icon: StarIcon },
  { label: 'About', to: '/about', Icon: UserIcon },
  { label: 'Book now', to: '/book', Icon: BookIcon },
  { label: 'FAQs / Contact', to: '/contact', Icon: MessageIcon },
] as const


const RAIL_KEY = 'migs-rail'

/** Collapsed state of the rail, kept in localStorage and mirrored to <html data-rail> so CSS can resize the shell. */
function useRailCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(RAIL_KEY) === 'collapsed' } catch { return false }
  })
  useLayoutEffect(() => {
    document.documentElement.dataset.rail = collapsed ? 'collapsed' : 'open'
    try { localStorage.setItem(RAIL_KEY, collapsed ? 'collapsed' : 'open') } catch { /* private mode */ }
  }, [collapsed])
  return [collapsed, setCollapsed] as const
}

export default function Rail() {
  const [theme, setThemeState] = useState<Theme>('light')
  const [collapsed, setCollapsed] = useRailCollapsed()

  // The pre-paint script owns the real value; read it once mounted so the
  // button shows the icon for the action, not for the current state.
  useEffect(() => setThemeState(getTheme()), [])

  return (
    <aside className="rail" aria-label="Profile and site navigation">
      <div className="rail__inner">
        <button
          type="button"
          className="rail__toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand side panel" : "Collapse side panel"}
          title={collapsed ? "Expand side panel" : "Collapse side panel"}
        >
          {collapsed ? <CaretRight size={16} weight="bold" /> : <CaretLeft size={16} weight="bold" />}
        </button>

        <span className="rail__avatar">
          <ThemedImg light={profile.avatarSrc} dark="/avatar-dark.png" alt={profile.name} width={120} height={120} />
        </span>

        <h2 className="rail__name">
          {profile.name}
          <SealCheck size={19} weight="fill" aria-label={profile.verifiedLabel} />
        </h2>
        <p className="rail__handle">
          {profile.handle}
        </p>

        <div className="rail__actions">
          <ul className="rail__socials" role="list" aria-label="Social profiles">
          {profile.socials.map(({ label, href, iconPath }) => (
            <li key={label}>
              <a
                className="rail__social"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
              >
                {/* Single-colour silhouettes, tinted by currentColor through a
                    CSS mask - same technique as the hero's social row. */}
                <span
                  className="rail__social-icon"
                  style={{ ['--icon-url' as string]: `url('${iconPath}')` }}
                  aria-hidden="true"
                />
              </a>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="rail__theme"
            onClick={() => setThemeState(toggleTheme())}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <ThemeGlyph theme={theme} size={21} />
          </button>
        </div>

        <nav className="rail__nav" aria-label="Sections">
          <ul>
            {RAIL_LINKS.map(({ label, to, Icon }) => (
              <li key={to}>
                <NavLink to={to} end={to === '/'} className="rail__link" title={label}>
                  <Icon size={21} />
                  <span className="rail__label">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <p className="rail__copy">
          &copy; {new Date().getFullYear()}
          <br />
          {profile.name}. All rights reserved.
        </p>
      </div>
    </aside>
  )
}
