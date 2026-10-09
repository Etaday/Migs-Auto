import { videoKind, youtubeEmbedUrl } from '@/lib/video'

/** Shows a listing's videos: YouTube embedded, uploaded files played in place, anything else as a link. */
export default function VideoPlayer({ videos, title }: { videos: string[]; title: string }) {
  if (!videos.length) return null
  return (
    <div className="vvideos">
      <h2 className="mpage__sub">Video</h2>
      {videos.map((src, i) => {
        const k = videoKind(src)
        if (k.kind === 'youtube') return <iframe key={src} className="vvideos__frame" src={youtubeEmbedUrl(k.id)} title={`${title} video ${i + 1}`} loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        if (k.kind === 'file') return <video key={src} className="vvideos__frame" src={`${src}#t=0.1`} controls preload="metadata" playsInline aria-label={`${title} video ${i + 1}`} />
        return <a key={src} className="mbtn" href={src} target="_blank" rel="noopener noreferrer">Watch video {i + 1}</a>
      })}
    </div>
  )
}
