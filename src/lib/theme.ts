/**
 * Two themes on one set of tokens. `data-theme` on <html> is the single
 * switch: tokens.css redefines the brand vars under [data-theme='dark'], so
 * every existing rule keeps reading --cream / --navy / --white and inverts
 * with it instead of being rewritten.
 *
 * The initial value is written by an inline script in index.html so the first
 * paint is already the right palette. Default is LIGHT: this site's identity
 * is the cream contour page, dark is the opt-in.
 *
 * HeroCanvasV2 listens for the `themechange` event and eases its uDarkMix
 * uniform from it, so the shader crosses over on its own clock.
 */
export type Theme = 'light' | 'dark'

import { motionReduced } from './a11y'

const KEY = 'theme'

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  // The browser's own bar takes the page colour. Read from the token after
  // the switch, so tokens.css stays the one place the palette lives.
  const page = getComputedStyle(root).getPropertyValue('--cream').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', page)
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* private mode: the theme just does not persist */
  }
  window.dispatchEvent(new CustomEvent<Theme>('themechange', { detail: theme }))
}

type WithViewTransition = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> }
}

/**
 * Switch themes with a motorcycle: it rides across the screen and the new theme
 * is revealed behind it (View Transitions API; the animation is in
 * styles/global.css, the bike is components/ThemeBike). Browsers without the
 * API, and reduced-motion users, get the instant switch.
 */
export function setTheme(theme: Theme) {
  const doc = document as WithViewTransition
  const root = document.documentElement
  const reduce =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches || motionReduced()
  if (!doc.startViewTransition || reduce || getTheme() === theme) {
    applyTheme(theme)
    return
  }
  root.dataset.themeSweep = 'on'
  doc
    .startViewTransition(() => applyTheme(theme))
    .finished.finally(() => {
      delete root.dataset.themeSweep
    })
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}
