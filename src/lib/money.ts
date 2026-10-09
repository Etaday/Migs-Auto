/** Thousands separators for money typed into a form: 250000 shows as 250,000. Up to two decimals. */
export function formatMoneyInput(raw: string): string {
  const s = raw.replace(/[^\d.]/g, "")
  const dot = s.indexOf('.')
  let whole = dot === -1 ? s : s.slice(0, dot)
  const frac = dot === -1 ? null : s.slice(dot + 1).replace(/\./g, '').slice(0, 2)
  whole = whole.replace(/^0+(?=\d)/, '')
  if (whole === '' && frac !== null) whole = '0'
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac === null ? grouped : `${grouped}.${frac}`
}

/** The number behind what was typed (commas and symbols ignored). */
export function parseMoneyInput(text: string): number {
  const n = Number(text.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Where the cursor should go after re-formatting, so it stays next to the same digit while typing. */
export function caretAfterFormat(before: string, caretBefore: number, after: string): number {
  const digitsBefore = before.slice(0, caretBefore).replace(/[^\d.]/g, '').length
  if (digitsBefore === 0) return 0
  let seen = 0
  for (let i = 0; i < after.length; i++) {
    if (/[\d.]/.test(after[i])) seen++
    if (seen === digitsBefore) return i + 1
  }
  return after.length
}
