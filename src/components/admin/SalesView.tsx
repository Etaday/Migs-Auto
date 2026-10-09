import { useData } from '@/components/admin/data'
import { shortDate, downloadCsv } from '@/components/admin/ui'
import { formatPeso } from '@/lib/inventory'
import { profitOf } from '@/lib/dealer'

export default function SalesView({ onDocument }: { onDocument: (vehicleId: string, kind: 'invoice' | 'receipt') => void }) {
  const { data } = useData()
  const sold = data.vehicles.filter((v) => v.status === 'sold').sort((a, b) => (b.sold_at ?? '').localeCompare(a.sold_at ?? ''))
  const revenue = sold.reduce((s, v) => s + (v.sold_price ?? 0), 0)
  const profit = sold.reduce((s, v) => s + profitOf(v), 0)
  return (
    <div className="adm-stack">
      <div className="adm-cards">
        <div className="adm-card adm-card--static"><b>{sold.length}</b><span>Vehicles sold</span></div>
        <div className="adm-card adm-card--static"><b>{formatPeso(revenue)}</b><span>Sales revenue</span></div>
        <div className="adm-card adm-card--static"><b>{formatPeso(profit)}</b><span>Gross profit</span></div>
      </div>
      {sold.length === 0 ? <p className="adm-empty">No sales yet. Mark a listing as Sold in Inventory and it appears here.</p> : (
        <>
          <div className="adm-actions"><button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadCsv('migs-auto-sales.csv', [['Sold on', 'Vehicle', 'VIN', 'Sold price', 'Cost', 'Profit'], ...sold.map((v) => [v.sold_at ?? '', `${v.year} ${v.brand} ${v.model}`, v.vin, v.sold_price ?? 0, v.cost, profitOf(v)])])}>Export CSV</button></div>
          <div className="adm-tablewrap">
            <table className="adm-table">
              <thead><tr><th>Sold on</th><th>Vehicle</th><th>Sold price</th><th>Cost</th><th>Profit</th><th><span className="sr-only">Documents</span></th></tr></thead>
              <tbody>{sold.map((v) => (
                <tr key={v.id}><td>{v.sold_at ? shortDate(v.sold_at) : ''}</td><td><b>{v.year} {v.brand} {v.model}</b><small>{v.vin}</small></td><td>{formatPeso(v.sold_price ?? 0)}</td><td>{v.cost ? formatPeso(v.cost) : <small>not set</small>}</td><td>{v.cost ? formatPeso(profitOf(v)) : <small>n/a</small>}</td><td className="adm-actions-cell"><button type="button" className="adm-btn adm-btn--ghost" onClick={() => onDocument(v.id, 'invoice')}>Invoice</button><button type="button" className="adm-btn adm-btn--ghost" onClick={() => onDocument(v.id, 'receipt')}>Receipt</button></td></tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
