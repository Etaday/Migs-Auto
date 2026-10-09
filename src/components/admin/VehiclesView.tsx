import { useMemo, useState } from 'react'
import { MagnifyingGlass, Plus, Trash, PencilSimple, X, Star } from '@/components/slab'
import { useData } from '@/components/admin/data'
import { downloadCsv, todayIso } from '@/components/admin/ui'
import { decodeVin, isValidVin } from '@/lib/specs'
import { formatPeso } from '@/lib/inventory'
import { daysInStock } from '@/lib/dealer'
import type { Vehicle, VehicleStatus, VehicleType } from '@/types/vehicle'

type Draft = {
  id?: string; vin: string; type: VehicleType; brand: string; model: string; year: string; price: string; cost: string; mileage: string
  transmission: string; fuel: string; color: string; body: string; engine: string; description: string; photos: string
  modifications: string[]; status: VehicleStatus; featured: boolean; sold_price: string; sold_at: string
}

const blank = (): Draft => ({
  vin: '', type: 'car', brand: '', model: '', year: String(new Date().getFullYear()), price: '', cost: '', mileage: '0', transmission: '', fuel: '',
  color: '', body: '', engine: '', description: '', photos: '', modifications: [], status: 'available', featured: false, sold_price: '', sold_at: '',
})
const toDraft = (v: Vehicle): Draft => ({
  id: v.id, vin: v.vin, type: v.type, brand: v.brand, model: v.model, year: String(v.year), price: String(v.price), cost: String(v.cost), mileage: String(v.mileage),
  transmission: v.transmission, fuel: v.fuel, color: v.color, body: v.body, engine: v.engine, description: v.description, photos: v.photos.join('\n'),
  modifications: v.modifications, status: v.status, featured: v.featured, sold_price: v.sold_price == null ? '' : String(v.sold_price), sold_at: v.sold_at ?? '',
})
const n = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0

function toRow(d: Draft): Omit<Vehicle, 'id' | 'created_at'> {
  const sold = d.status === 'sold'
  return {
    vin: d.vin.trim().toUpperCase(), type: d.type, brand: d.brand.trim(), model: d.model.trim(), year: n(d.year), price: n(d.price), cost: n(d.cost), mileage: n(d.mileage),
    transmission: d.transmission.trim(), fuel: d.fuel.trim(), color: d.color.trim(), body: d.body.trim(), engine: d.engine.trim(), description: d.description.trim(),
    photos: d.photos.split('\n').map((s) => s.trim()).filter(Boolean), modifications: d.modifications, status: d.status, featured: d.featured,
    sold_price: sold ? n(d.sold_price) || n(d.price) : null, sold_at: sold ? d.sold_at || todayIso() : null,
  }
}

function validate(d: Draft): string | null {
  if (!d.brand.trim() || !d.model.trim()) return 'Brand and model are required.'
  const y = n(d.year)
  if (y < 1950 || y > new Date().getFullYear() + 1) return 'Enter a valid model year.'
  if (!n(d.price)) return 'Enter the asking price.'
  if (d.vin.trim() && !isValidVin(d.vin)) return 'The VIN must have 17 letters and numbers (no I, O or Q).'
  return null
}

function VehicleForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const { add, patch } = useData()
  const [d, setD] = useState(initial)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [mod, setMod] = useState('')
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const f = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(k, e.target.value as never)

  async function lookup() {
    setErr(''); setNote(''); setBusy(true)
    try {
      const r = await decodeVin(d.vin)
      if (!r) setNote('That VIN was not found in the US database. Fill the specs in by hand.')
      else {
        setD((x) => ({ ...x, ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? String(v) : v])) as Partial<Draft> }))
        setNote('Real specs filled in from the NHTSA vehicle database. Check them, then add the price.')
      }
    } catch (e) { setErr(e instanceof Error ? e.message : 'Lookup failed.') } finally { setBusy(false) }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const bad = validate(d)
    if (bad) return setErr(bad)
    setBusy(true); setErr('')
    try {
      if (d.id) await patch('vehicles', d.id, toRow(d)); else await add('vehicles', toRow(d))
      onDone()
    } catch { setErr('Could not save. Please try again.'); setBusy(false) }
  }

  const addMod = () => { const m = mod.trim(); if (m && !d.modifications.includes(m)) set('modifications', [...d.modifications, m]); setMod('') }

  return (
    <form className="adm-panel adm-vform" onSubmit={save} noValidate>
      <h2>{d.id ? 'Edit listing' : 'Add a listing'}</h2>
      <div className="adm-vform__vin">
        <label className="adm-field"><span>VIN / chassis number (17 characters)</span><input value={d.vin} onChange={f('vin')} maxLength={17} placeholder="e.g. 1HGCM82633A004352" /></label>
        <button type="button" className="adm-btn" onClick={() => void lookup()} disabled={busy || !d.vin.trim()}><MagnifyingGlass size={15} aria-hidden="true" /> Get real specs</button>
      </div>
      {note && <p className="adm-note" role="status">{note}</p>}
      <div className="adm-vform__grid">
        <label className="adm-field"><span>Type</span><select value={d.type} onChange={f('type')}><option value="car">Car</option><option value="motorcycle">Motorcycle</option></select></label>
        <label className="adm-field"><span>Brand</span><input value={d.brand} onChange={f('brand')} /></label>
        <label className="adm-field"><span>Model</span><input value={d.model} onChange={f('model')} /></label>
        <label className="adm-field"><span>Year</span><input value={d.year} onChange={f('year')} inputMode="numeric" maxLength={4} /></label>
        <label className="adm-field"><span>Body</span><input value={d.body} onChange={f('body')} /></label>
        <label className="adm-field"><span>Engine</span><input value={d.engine} onChange={f('engine')} /></label>
        <label className="adm-field"><span>Transmission</span><input value={d.transmission} onChange={f('transmission')} /></label>
        <label className="adm-field"><span>Fuel</span><input value={d.fuel} onChange={f('fuel')} /></label>
        <label className="adm-field"><span>Color</span><input value={d.color} onChange={f('color')} /></label>
        <label className="adm-field"><span>Mileage (km)</span><input value={d.mileage} onChange={f('mileage')} inputMode="numeric" /></label>
        <label className="adm-field"><span>Asking price (₱)</span><input value={d.price} onChange={f('price')} inputMode="numeric" /></label>
        <label className="adm-field"><span>Your cost (₱, private)</span><input value={d.cost} onChange={f('cost')} inputMode="numeric" /></label>
        <label className="adm-field"><span>Status</span><select value={d.status} onChange={f('status')}><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option></select></label>
        {d.status === 'sold' && <>
          <label className="adm-field"><span>Sold price (₱)</span><input value={d.sold_price} onChange={f('sold_price')} inputMode="numeric" placeholder={d.price} /></label>
          <label className="adm-field"><span>Sold on</span><input type="date" value={d.sold_at || todayIso()} onChange={f('sold_at')} /></label>
        </>}
      </div>
      <label className="adm-field"><span>Description</span><textarea className="adm-textarea" rows={3} value={d.description} onChange={f('description')} /></label>
      <label className="adm-field"><span>Photo links (one per line; the first is the cover)</span><textarea className="adm-textarea" rows={3} value={d.photos} onChange={f('photos')} /></label>

      <div className="adm-field">
        <span>Modifications</span>
        <div className="adm-chips adm-vform__mods">
          {d.modifications.map((m) => (
            <span key={m} className="adm-modchip">{m}<button type="button" aria-label={`Remove ${m}`} onClick={() => set('modifications', d.modifications.filter((x) => x !== m))}><X size={12} weight="bold" /></button></span>
          ))}
        </div>
        <div className="adm-vform__addmod">
          <input value={mod} onChange={(e) => setMod(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMod() } }} placeholder="e.g. Akrapovic exhaust, lowered suspension, new tires" />
          <button type="button" className="adm-btn adm-btn--ghost" onClick={addMod}><Plus size={14} aria-hidden="true" /> Add</button>
        </div>
      </div>

      <label className="adm-check"><input type="checkbox" checked={d.featured} onChange={(e) => set('featured', e.target.checked)} /> Feature on the home page</label>
      {err && <p className="adm-error" role="alert">{err}</p>}
      <div className="adm-actions">
        <button type="submit" className="adm-btn" disabled={busy}>{d.id ? 'Save changes' : 'Add listing'}</button>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onDone}>Cancel</button>
      </div>
    </form>
  )
}

export default function VehiclesView() {
  const { data, patch, remove } = useData()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | VehicleStatus>('all')
  const [editing, setEditing] = useState<Draft | null>(null)
  const now = useMemo(() => new Date(), [])

  const list = data.vehicles.filter((v) => (status === 'all' || v.status === status) &&
    `${v.year} ${v.brand} ${v.model} ${v.vin} ${v.color}`.toLowerCase().includes(q.trim().toLowerCase()))
  const count = (s: VehicleStatus) => data.vehicles.filter((v) => v.status === s).length

  const setStatusOf = (v: Vehicle, s: VehicleStatus) =>
    patch('vehicles', v.id, s === 'sold' ? { status: s, sold_price: v.sold_price ?? v.price, sold_at: v.sold_at ?? todayIso() } : { status: s, sold_price: null, sold_at: null })

  if (editing) return <VehicleForm key={editing.id ?? 'new'} initial={editing} onDone={() => setEditing(null)} />

  return (
    <div className="adm-stack">
      <div className="adm-toolbar">
        <label className="adm-search"><MagnifyingGlass size={16} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brand, model, VIN or color" aria-label="Search inventory" /></label>
        <div className="adm-chips">
          {(['all', 'available', 'reserved', 'sold'] as const).map((s) => (
            <button key={s} type="button" className={status === s ? 'is-on' : ''} onClick={() => setStatus(s)}>{s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)} <small>{s === 'all' ? data.vehicles.length : count(s)}</small></button>
          ))}
        </div>
        <button type="button" className="adm-btn" onClick={() => setEditing(blank())}><Plus size={15} weight="bold" aria-hidden="true" /> Add listing</button>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadCsv('migs-auto-inventory.csv', [['Year', 'Brand', 'Model', 'VIN', 'Type', 'Mileage', 'Price', 'Cost', 'Status', 'Modifications'], ...data.vehicles.map((v) => [v.year, v.brand, v.model, v.vin, v.type, v.mileage, v.price, v.cost, v.status, v.modifications.join('; ')])])}>Export CSV</button>
      </div>

      {list.length === 0 ? <p className="adm-empty">No vehicles match. Add your first listing with the button above.</p> : (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Vehicle</th><th>VIN</th><th>Price</th><th>Margin</th><th>Days</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.id}>
                  <td>
                    <span className="adm-vcell">
                      <img src={v.photos[0] || '/vehicle-placeholder.svg'} alt="" width={64} height={44} />
                      <span><b>{v.featured && <Star size={13} weight="fill" aria-label="Featured" />} {v.year} {v.brand} {v.model}</b>
                        <small>{v.type === 'car' ? 'Car' : 'Motorcycle'} · {v.mileage.toLocaleString('en-PH')} km{v.engine ? ` · ${v.engine}` : ''}</small>
                        {v.modifications.length > 0 && <small>Mods: {v.modifications.join(', ')}</small>}</span>
                    </span>
                  </td>
                  <td>{v.vin || <small>none</small>}</td>
                  <td>{formatPeso(v.sold_price ?? v.price)}</td>
                  <td>{v.cost ? formatPeso((v.sold_price ?? v.price) - v.cost) : <small>cost not set</small>}</td>
                  <td>{v.status === 'sold' ? <small>sold</small> : daysInStock(v, now)}</td>
                  <td><select aria-label={`Status of ${v.brand} ${v.model}`} value={v.status} onChange={(e) => void setStatusOf(v, e.target.value as VehicleStatus)}>
                    <option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option></select></td>
                  <td className="adm-actions-cell">
                    <button type="button" className="adm-icon-btn" aria-label={`Edit ${v.brand} ${v.model}`} onClick={() => setEditing(toDraft(v))}><PencilSimple size={16} /></button>
                    <button type="button" className="adm-icon-btn" aria-label={`Delete ${v.brand} ${v.model}`} onClick={() => window.confirm(`Delete the ${v.year} ${v.brand} ${v.model}?`) && void remove('vehicles', v.id)}><Trash size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
