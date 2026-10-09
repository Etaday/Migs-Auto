import { useState } from 'react'
import { FilmSlate, LinkSimple, Plus, Trash } from '@/components/slab'
import { uploadVideo } from '@/lib/db'
import { MAX_VIDEOS, MAX_VIDEO_MB, checkVideoFile, videoKind } from '@/lib/video'

/** Videos for a listing: upload a file (MP4, WebM or MOV) or paste a YouTube or other video link. */
export default function VideoPicker({ videos, onChange, onError, onBusy }: { videos: string[]; onChange: (v: string[]) => void; onError: (msg: string) => void; onBusy?: (count: number) => void }) {
  const [uploading, setUploading] = useState(0)
  const [link, setLink] = useState('')
  const busy = (fn: (c: number) => number) => setUploading((c) => { const n = fn(c); onBusy?.(n); return n })

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    onError('')
    const room = MAX_VIDEOS - videos.length
    const chosen = Array.from(files)
    if (chosen.length > room) onError(`A listing can have ${MAX_VIDEOS} videos. Only the first ${Math.max(room, 0)} were added.`)
    const urls: string[] = []
    for (const file of chosen.slice(0, Math.max(room, 0))) {
      const bad = checkVideoFile(file)
      if (bad) { onError(bad); continue }
      busy((c) => c + 1)
      try { urls.push(await uploadVideo(file)) }
      catch (e) { onError(e instanceof Error ? e.message : 'Could not add that video.') }
      finally { busy((c) => c - 1) }
    }
    if (urls.length) onChange([...videos, ...urls].slice(0, MAX_VIDEOS))
  }
  const addLink = () => {
    const u = link.trim()
    if (!u) return
    if (!/^https?:\/\//i.test(u)) return onError('A video link must start with http:// or https://')
    if (videos.length >= MAX_VIDEOS) return onError(`A listing can have ${MAX_VIDEOS} videos.`)
    onError(''); onChange([...videos, u]); setLink('')
  }

  return (
    <div className="adm-field">
      <span>Videos ({videos.length}/{MAX_VIDEOS}) — upload a file up to {MAX_VIDEO_MB} MB, or paste a YouTube link</span>
      <div className="adm-videos">
        {videos.map((src, i) => {
          const k = videoKind(src)
          return (
            <figure key={src.slice(-40) + i} className="adm-video">
              {k.kind === 'youtube' ? <img src={`https://i.ytimg.com/vi/${k.id}/hqdefault.jpg`} alt="" />
                : k.kind === 'file' ? <video src={`${src}#t=0.1`} muted preload="metadata" playsInline />
                : <span className="adm-video__link"><LinkSimple size={22} aria-hidden="true" />{new URL(src).hostname}</span>}
              <figcaption>
                <span>{k.kind === 'youtube' ? 'YouTube' : k.kind === 'file' ? 'Video file' : 'Link'}</span>
                <button type="button" onClick={() => onChange(videos.filter((_, n) => n !== i))} aria-label={`Remove video ${i + 1}`}><Trash size={13} /> Remove</button>
              </figcaption>
            </figure>
          )
        })}
        {uploading > 0 && <div className="adm-video adm-video--busy" role="status">Uploading... large videos take a minute</div>}
        {videos.length < MAX_VIDEOS && (
          <label className="adm-video adm-video--add">
            <FilmSlate size={26} aria-hidden="true" />
            <span>Add video</span>
            <input type="file" accept="video/mp4,video/webm,video/quicktime,.mov" multiple onChange={(e) => { void addFiles(e.target.files); e.target.value = '' }} />
          </label>
        )}
      </div>
      <div className="adm-vform__addmod">
        <input value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} placeholder="Or paste a YouTube / video link (https://...)" />
        <button type="button" className="adm-btn adm-btn--ghost" onClick={addLink}><Plus size={14} aria-hidden="true" /> Add link</button>
      </div>
    </div>
  )
}
