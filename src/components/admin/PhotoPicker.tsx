import { useState } from 'react'
import { ArrowUp, ImageSquare, Plus, Trash } from '@/components/slab'
import { uploadPhoto } from '@/lib/db'
import { MAX_PHOTOS, checkImageFile, moveToFront, resizeToJpeg } from '@/lib/images'

/** Photos for a listing: pick pictures from the device (resized on the way in) or paste a link; the first is the cover. */
export default function PhotoPicker({ photos, onChange, onError, onBusy }: { photos: string[]; onChange: (p: string[]) => void; onError: (msg: string) => void; onBusy?: (count: number) => void }) {
  const [uploading, setUploading] = useState(0)
  const [link, setLink] = useState('')
  const busy = (fn: (c: number) => number) => setUploading((c) => { const n = fn(c); onBusy?.(n); return n })

  async function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    onError('')
    const room = MAX_PHOTOS - photos.length
    const chosen = Array.from(files)
    if (chosen.length > room) onError(`A listing can have ${MAX_PHOTOS} photos. Only the first ${Math.max(room, 0)} were added.`)
    const urls: string[] = []
    for (const file of chosen.slice(0, Math.max(room, 0))) {
      const bad = checkImageFile(file)
      if (bad) { onError(bad); continue }
      busy((c) => c + 1)
      try { urls.push(await uploadPhoto(await resizeToJpeg(file))) }
      catch (e) { onError(e instanceof Error ? e.message : 'Could not add that photo.') }
      finally { busy((c) => c - 1) }
    }
    if (urls.length) onChange([...photos, ...urls].slice(0, MAX_PHOTOS))
  }
  const addLink = () => {
    const u = link.trim()
    if (!u) return
    if (!/^https?:\/\//i.test(u)) return onError('A photo link must start with http:// or https://')
    if (photos.length >= MAX_PHOTOS) return onError(`A listing can have ${MAX_PHOTOS} photos.`)
    onError(''); onChange([...photos, u]); setLink('')
  }

  return (
    <div className="adm-field">
      <span>Photos ({photos.length}/{MAX_PHOTOS}) — the first one is the cover</span>
      <div className="adm-photos">
        {photos.map((src, i) => (
          <figure key={src.slice(-40) + i} className={`adm-photo${i === 0 ? ' is-cover' : ''}`}>
            <img src={src} alt={`Photo ${i + 1}`} />
            {i === 0 && <span className="adm-photo__tag">Cover</span>}
            <figcaption>
              {i > 0 && <button type="button" onClick={() => onChange(moveToFront(photos, i))} aria-label={`Make photo ${i + 1} the cover`}><ArrowUp size={13} weight="bold" /> Cover</button>}
              <button type="button" onClick={() => onChange(photos.filter((_, k) => k !== i))} aria-label={`Remove photo ${i + 1}`}><Trash size={13} /> Remove</button>
            </figcaption>
          </figure>
        ))}
        {uploading > 0 && <div className="adm-photo adm-photo--busy" role="status">Adding...</div>}
        {photos.length < MAX_PHOTOS && (
          <label className="adm-photo adm-photo--add">
            <ImageSquare size={26} aria-hidden="true" />
            <span>Add photos</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { void addPhotos(e.target.files); e.target.value = '' }} />
          </label>
        )}
      </div>
      <div className="adm-vform__addmod">
        <input value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} placeholder="Or paste a photo link (https://...)" />
        <button type="button" className="adm-btn adm-btn--ghost" onClick={addLink}><Plus size={14} aria-hidden="true" /> Add link</button>
      </div>
    </div>
  )
}
