import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { listRows, updateRow, deleteRow, addRow, type BookingRow, type InvoiceRow, type ReviewRow, type MessageRow, type QuoteRow, type RevenueRow, type ExpenseRow, type Table } from '@/lib/db'
import type { Vehicle, Inquiry } from '@/types/vehicle'

type Rows = { bookings: BookingRow; invoices: InvoiceRow; reviews: ReviewRow; messages: MessageRow; quotes: QuoteRow; revenue: RevenueRow; expenses: ExpenseRow; vehicles: Vehicle; inquiries: Inquiry }
type State = { [T in Table]: Rows[T][] }

type Ctx = {
  data: State
  loading: boolean
  error: string
  reload: (silent?: boolean) => Promise<void>
  patch: <T extends Table>(table: T, id: string, p: Partial<Rows[T]>) => Promise<void>
  remove: (table: Table, id: string) => Promise<void>
  add: <T extends Table>(table: T, row: Partial<Rows[T]>) => Promise<void>
}

const Data = createContext<Ctx | null>(null)
const empty: State = { bookings: [], invoices: [], reviews: [], messages: [], quotes: [], revenue: [], expenses: [], vehicles: [], inquiries: [] }

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<State>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async (silent?: boolean) => {
    if (!silent) { setLoading(true); setError('') }
    try {
      const [bookings, invoices, reviews, messages, quotes, revenue, expenses, vehicles, inquiries] = await Promise.all([
        listRows('bookings'), listRows('invoices'), listRows('reviews'), listRows('messages'),
        // Older databases may not have the quotes table yet: show the rest rather than fail.
        listRows('quotes').catch(() => []),
        listRows('revenue').catch(() => []),
        listRows('expenses').catch(() => []),
        listRows('vehicles').catch(() => []),
        listRows('inquiries').catch(() => []),
      ])
      setData({
        bookings: bookings.map((b) => ({ ...b, items: Array.isArray(b.items) ? b.items : [],
          total: b.total ?? 0, subtotal: b.subtotal ?? 0, deposit: b.deposit ?? 0, balance: b.balance ?? 0, amount_paid: b.amount_paid ?? 0, location_charge: b.location_charge ?? 0, event_date: b.event_date ?? '', created_at: b.created_at ?? '' })),
        invoices, reviews, messages, quotes, revenue, expenses, vehicles, inquiries,
      })
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'Could not load data.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const value = useMemo<Ctx>(
    () => ({
      data,
      loading,
      error,
      reload,
      async patch(table, id, p) {
        await updateRow(table, id, p)
        setData((d) => ({ ...d, [table]: (d[table] as { id: string }[]).map((r) => (r.id === id ? { ...r, ...p } : r)) }) as State)
      },
      async remove(table, id) {
        await deleteRow(table, id)
        setData((d) => ({ ...d, [table]: (d[table] as { id: string }[]).filter((r) => r.id !== id) }) as State)
      },
      async add(table, row) {
        const created = await addRow(table, row)
        setData((d) => ({ ...d, [table]: [created, ...(d[table] as unknown[])] }) as State)
      },
    }),
    [data, loading, error, reload],
  )
  return <Data.Provider value={value}>{children}</Data.Provider>
}

export function useData(): Ctx {
  const c = useContext(Data)
  if (!c) throw new Error('useData must be used inside DataProvider')
  return c
}
