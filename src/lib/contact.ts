/**
 * Input hygiene and validation shared by the dealership's public forms.
 * Submissions themselves go through submitPublic('inquiries', ...) in lib/db.ts.
 */

// Built from \u escapes so the source stays pure ASCII.
// Control chars U+0000-U+001F and U+007F; when newlines are allowed, tab,
// LF and CR survive. Zero-width and bidi marks always go.
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const CTRL_NO_NL = new RegExp('[\\u0000-\\u001F\\u007F]', 'g')
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const CTRL_KEEP_NL = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'g')
const ZERO_WIDTH = new RegExp('[\\u200B-\\u200F\\u202A-\\u202E\\u2060\\uFEFF]', 'g')

export function sanitize(input: string, allowNewlines = false): string {
  const controls = allowNewlines ? CTRL_KEEP_NL : CTRL_NO_NL
  return input.replace(controls, '').replace(ZERO_WIDTH, '')
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** A name, and a phone or a valid email. null = fine. */
export function validateContact(v: { name: string; phone: string; email: string }): string | null {
  if (!v.name.trim()) return 'Please enter your name.'
  const phone = v.phone.trim()
  const email = v.email.trim()
  if (!phone && !email) return 'Please give a phone or email so we can reach you.'
  if (email && !EMAIL_RE.test(email)) return 'That email does not look right.'
  return null
}
