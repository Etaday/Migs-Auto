import type { FinanceData } from '@/components/admin/FinanceView'
import type { ExpenseRow, RevenueRow } from '@/lib/db'

/**
 * Manual revenue: money earned outside the website. Each entry is laid over the
 * finance figures the same way the P&L sheet works:
 *   revenue            + amount, in its stream and month
 *   fees (KLPJ 10%, JP royalty 5%, MFees 5% = 20% of revenue)  + 20% of the amount, unless the entry opts out
 *   net operating profit  + amount minus those fees
 *   yearly actual and the income list  + amount
 * Entries from another year than the figures are listed but not added.
 */

export const FEE_RATE = 0.2
export const OTHER = 'Other'
export const DEFAULT_EXPENSE_TYPES = ['Studio rent', 'Complimentary cost', 'Miscellaneous', 'Net / ticket / electricity']

/** Streams and expense types already in the imported finance figures, so a quote can post to the same names. */
export function knownNames(): { streams: string[]; expenseTypes: string[] } {
  try {
    const d = JSON.parse(localStorage.getItem('jd-finance-data') ?? 'null') as { cats?: string[]; exp?: Record<string, number[]> } | null
    return { streams: d?.cats?.length ? d.cats : DEFAULT_STREAMS, expenseTypes: d?.exp && Object.keys(d.exp).length ? Object.keys(d.exp) : DEFAULT_EXPENSE_TYPES }
  } catch {
    return { streams: DEFAULT_STREAMS, expenseTypes: DEFAULT_EXPENSE_TYPES }
  }
}
export const DEFAULT_STREAMS = ['Photobooth', 'Production', 'Food/Product', 'Self Portrait']

const zeros = () => Array.from({ length: 12 }, () => 0)

/** Figures for a year with nothing in them, so manual revenue works before any file is imported. */
export function emptyFinance(year = new Date().getFullYear()): FinanceData {
  return {
    cats: [...DEFAULT_STREAMS], rev: Object.fromEntries(DEFAULT_STREAMS.map((c) => [c, zeros()])), forecast: zeros(), ly25: zeros(), exp: {}, expTotal: zeros(), klpj: zeros(), nop: zeros(),
    annual: [{ year, forecast: 0, actual: 0 }], annualExp: [{ year, rev: 0, exp: 0 }], income: [], expenses: [],
  }
}

export const yearOf = (d: FinanceData) => Math.max(...d.annual.map((a) => a.year), new Date().getFullYear() - 100)

export function withManualRevenue(base: FinanceData, entries: RevenueRow[], expenses: ExpenseRow[] = []): { data: FinanceData; applied: number; skipped: number } {
  const year = yearOf(base)
  const d: FinanceData = {
    ...base,
    cats: [...base.cats],
    rev: Object.fromEntries(Object.entries(base.rev).map(([k, v]) => [k, [...v]])),
    klpj: [...base.klpj], nop: [...base.nop],
    exp: Object.fromEntries(Object.entries(base.exp).map(([k, v]) => [k, [...v]])), expTotal: [...base.expTotal],
    expenses: [...base.expenses],
    annual: base.annual.map((a) => ({ ...a })), annualExp: base.annualExp.map((a) => ({ ...a })),
    income: [...base.income],
  }
  let applied = 0, skipped = 0
  for (const e of entries) {
    const y = Number(e.entry_date.slice(0, 4)), m = Number(e.entry_date.slice(5, 7)) - 1
    if (y !== year || !(m >= 0 && m < 12) || !(e.amount > 0)) { skipped++; continue }
    if (!d.cats.includes(e.stream)) { d.cats.push(e.stream); d.rev[e.stream] = zeros() }
    d.rev[e.stream][m] += e.amount
    const fee = e.fees ? e.amount * FEE_RATE : 0
    d.klpj[m] += fee
    d.nop[m] += e.amount - fee
    const a = d.annual.find((x) => x.year === year); if (a) a.actual += e.amount
    const ax = d.annualExp.find((x) => x.year === year); if (ax) ax.rev += e.amount
    d.income.push({ date: e.entry_date, m, cat: e.stream, client: e.client ? `${e.client} (manual)` : 'Manual entry', amt: e.amount })
    applied++
  }
  // Manual expenses lower the net by their amount (fees are not charged on costs).
  for (const x of expenses) {
    const y = Number(x.entry_date.slice(0, 4)), m = Number(x.entry_date.slice(5, 7)) - 1
    if (y !== year || !(m >= 0 && m < 12) || !(x.amount > 0)) { skipped++; continue }
    if (!d.exp[x.category]) d.exp[x.category] = zeros()
    d.exp[x.category][m] += x.amount
    d.expTotal[m] += x.amount
    d.nop[m] -= x.amount
    const ax = d.annualExp.find((a) => a.year === year); if (ax) ax.exp += x.amount
    d.expenses.push({ date: x.entry_date, m, item: x.item ? `${x.item} (manual)` : 'Manual expense', amt: x.amount })
    applied++
  }
  return { data: d, applied, skipped }
}
