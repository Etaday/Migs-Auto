import { useState } from 'react'
import { MagnifyingGlass, Plus, Trash, PencilSimple, Sparkle } from '@/components/slab'
import { useData } from '@/components/admin/data'
import { downloadCsv } from '@/components/admin/ui'
import { formatPeso } from '@/lib/inventory'
import { enhanceProductDescription, filterProducts, stockLabel } from '@/lib/products'
import type { Product, ProductCategory } from '@/types/product'
import PhotoPicker from './PhotoPicker'

type Draft = Omit<Product, 'id' | 'created_at' | 'price' | 'stock'> & { id?: string; price: string; stock: string }
const blank = (): Draft => ({ category: 'mags', name: '', brand: '', size: '', fits: '', condition: 'new', price: '', stock: '1', description: '', photos: [], listed: true })
const toDraft = (p: Product): Draft => ({ ...p, price: String(p.price), stock: String(p.stock) })
const n = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0
const row = (d: Draft): Omit<Product, 'id' | 'created_at'> => ({
  category: d.category, name: d.name.trim(), brand: d.brand.trim(), size: d.size.trim(), fits: d.fits.trim(), condition: d.condition, price: n(d.price),
  stock: Math.max(0, Math.floor(n(d.stock))), description: d.description.trim(), photos: d.photos, listed: d.listed,
})

function ProductForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const { add, patch } = useData()
  const [d, setD] = useState(initial)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [undo, setUndo] = useState<string | null>(null)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const f = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(k, e.target.value as never)

  function enhance() {
    if (!d.name.trim()) return setErr('Enter the item name first, so the enhancer knows what it is.')
    setErr('')
    const now = row(d)
    setUndo(d.description)
    set('description', enhanceProductDescription({ ...now, id: '', created_at: '' }, d.description))
    setNote('Description tidied and completed from the details above. Read it and edit freely.')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!d.name.trim()) return setErr('Enter the item name.')
    if (!n(d.price)) return setErr('Enter the price.')
    setBusy(true); setErr('')
    try { if (d.id) await patch('products', d.id, row(d)); else await add('products', row(d)); onDone() }
    catch (x) { setErr(x instanceof Error && x.message ? x.message : 'Could not save. Please try again.'); setBusy(false) }
  }

  return (
    <form className="adm-panel adm-vform" onSubmit={save} noValidate>
      <h2>{d.id ? 'Edit item' : 'Add a mag set or accessory'}</h2>
      <div className="adm-vform__grid">
        <label className="adm-field"><span>Category</span><select value={d.category} onChange={f('category')}><option value="mags">Mags (wheels)</option><option value="accessories">Accessory</option></select></label>
        <label className="adm-field"><span>Name</span><input value={d.name} onChange={f('name')} placeholder='e.g. Enkei 17" Mags (set of 4)' /></label>
        <label className="adm-field"><span>Brand</span><input value={d.brand} onChange={f('brand')} /></label>
        <label className="adm-field"><span>Size / specs</span><input value={d.size} onChange={f('size')} placeholder="e.g. 17 inch, 5x114.3" /></label>
        <label className="adm-field"><span>Fits</span><input value={d.fits} onChange={f('fits')} placeholder="e.g. Honda Civic, Accord" /></label>
        <label className="adm-field"><span>Condition</span><select value={d.condition} onChange={f('condition')}><option value="new">Brand new</option><option value="used">Used</option></select></label>
        <label className="adm-field"><span>Price (₱)</span><input value={d.price} onChange={f('price')} inputMode="numeric" /></label>
        <label className="adm-field"><span>Quantity in stock</span><input value={d.stock} onChange={f('stock')} inputMode="numeric" /></label>
      </div>
      <div className="adm-field">
        <span>Description</span>
        <textarea className="adm-textarea" rows={4} value={d.description} onChange={(e) => { set('description', e.target.value); setUndo(null) }} placeholder="Write a few rough notes, then press Enhance" />
        <div className="adm-actions">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={enhance}><Sparkle size={15} aria-hidden="true" /> Enhance description</button>
          {undo !== null && <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { set('description', undo); setUndo(null); setNote('') }}>Undo</button>}
        </div>
      </div>
      {note && <p className="adm-note" role="status">{note}</p>}
      <PhotoPicker photos={d.photos} onChange={(p) => set('photos', p)} onError={setErr} onBusy={setUploading} />
      <label className="adm-check"><input type="checkbox" checked={d.listed} onChange={(e) => set('listed', e.target.checked)} /> Show on the website</label>
      {err && <p className="adm-error" role="alert">{err}</p>}
      <div className="adm-actions">
        <button type="submit" className="adm-btn" disabled={busy || uploading > 0}>{d.id ? 'Save changes' : 'Add item'}</button>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onDone}>Cancel</button>
      </div>
    </form>
  )
}

export default function ProductsView() {
  const { data, patch, remove } = useData()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<'all' | ProductCategory>('all')
  const [editing, setEditing] = useState<Draft | null>(null)
  if (editing) return <ProductForm key={editing.id ?? 'new'} initial={editing} onDone={() => setEditing(null)} />

  const list = filterProducts(data.products, { category: cat === 'all' ? undefined : cat, query: q, includeUnlisted: true })
  const count = (c: ProductCategory) => data.products.filter((p) => p.category === c).length
  const setStock = (p: Product, delta: number) => patch('products', p.id, { stock: Math.max(0, p.stock + delta) })

  return (
    <div className="adm-stack">
      <div className="adm-toolbar">
        <label className="adm-search"><MagnifyingGlass size={16} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, brand, size or fits" aria-label="Search mags and accessories" /></label>
        <div className="adm-chips">
          {(['all', 'mags', 'accessories'] as const).map((c) => (
            <button key={c} type="button" className={cat === c ? 'is-on' : ''} onClick={() => setCat(c)}>{c === 'all' ? 'All' : c === 'mags' ? 'Mags' : 'Accessories'} <small>{c === 'all' ? data.products.length : count(c)}</small></button>
          ))}
        </div>
        <button type="button" className="adm-btn" onClick={() => setEditing(blank())}><Plus size={15} weight="bold" aria-hidden="true" /> Add item</button>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => downloadCsv('migs-auto-mags-accessories.csv', [['Category', 'Name', 'Brand', 'Size', 'Fits', 'Condition', 'Price', 'Stock', 'Listed'], ...data.products.map((p) => [p.category, p.name, p.brand, p.size, p.fits, p.condition, p.price, p.stock, p.listed])])}>Export CSV</button>
      </div>
      {list.length === 0 ? <p className="adm-empty">Nothing here yet. Add your first mag set or accessory with the button above.</p> : (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Item</th><th>Price</th><th>Stock</th><th>On website</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{list.map((p) => (
              <tr key={p.id}>
                <td><span className="adm-vcell"><img src={p.photos[0] || '/vehicle-placeholder.svg'} alt="" width={64} height={44} />
                  <span><b>{p.name}</b><small>{[p.category === 'mags' ? 'Mags' : 'Accessory', p.brand, p.size, p.condition === 'new' ? 'New' : 'Used'].filter(Boolean).join(' · ')}</small>{p.fits && <small>Fits: {p.fits}</small>}</span></span></td>
                <td>{formatPeso(p.price)}</td>
                <td><span className="adm-stock">
                  <button type="button" className="adm-icon-btn" aria-label={`One less ${p.name}`} onClick={() => void setStock(p, -1)} disabled={p.stock <= 0}>−</button>
                  <b>{p.stock}</b>
                  <button type="button" className="adm-icon-btn" aria-label={`One more ${p.name}`} onClick={() => void setStock(p, 1)}>+</button>
                </span><small>{stockLabel(p.stock)}</small></td>
                <td><label className="adm-check"><input type="checkbox" checked={p.listed} onChange={(e) => void patch('products', p.id, { listed: e.target.checked })} aria-label={`Show ${p.name} on the website`} /> {p.listed ? 'Shown' : 'Hidden'}</label></td>
                <td className="adm-actions-cell">
                  <button type="button" className="adm-icon-btn" aria-label={`Edit ${p.name}`} onClick={() => setEditing(toDraft(p))}><PencilSimple size={16} /></button>
                  <button type="button" className="adm-icon-btn" aria-label={`Delete ${p.name}`} onClick={() => window.confirm(`Delete ${p.name}?`) && void remove('products', p.id)}><Trash size={16} /></button>
                </td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

