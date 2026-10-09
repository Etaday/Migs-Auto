import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { listRows, updateRow, deleteRow, addRow, type Table } from '@/lib/db'
import type { Vehicle, Inquiry } from '@/types/vehicle'
import type { SaleDocument } from '@/types/document'

type Rows = { vehicles: Vehicle; inquiries: Inquiry; documents: SaleDocument }
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
const empty: State = { vehicles: [], inquiries: [], documents: [] }

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<State>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async (silent?: boolean) => {
    if (!silent) { setLoading(true); setError('') }
    try {
      const [vehicles, inquiries, documents] = await Promise.all([listRows('vehicles'), listRows('inquiries').catch(() => []), listRows('documents').catch(() => [])])
      setData({ vehicles, inquiries, documents })
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
