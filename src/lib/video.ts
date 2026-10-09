export const MAX_VIDEOS = 3
/** Supabase's per-file ceiling on the free plan is 50 MB. */
export const MAX_VIDEO_MB = 50

/** null = fine, otherwise a sentence for the owner. */
export function checkVideoFile(f: { type: string; size: number; name: string }): string | null {
  const okType = /^video\/(mp4|webm|quicktime)$/i.test(f.type) || (!f.type && /\.(mp4|webm|mov)$/i.test(f.name))
  if (!okType) return 'Choose a video file (MP4, WebM or MOV).'
  if (f.size <= 0) return 'That video file is empty.'
  if (f.size >= MAX_VIDEO_MB * 1024 * 1024) return `That video is too large (${MAX_VIDEO_MB} MB at most). Trim it or paste a YouTube link instead.`
  return null
}

export type VideoKind = { kind: 'youtube'; id: string } | { kind: 'file' } | { kind: 'link' }

const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be'])
const YT_ID = /^[\w-]{11}$/

/** What a saved video address is: a YouTube video (embedded), a video file (played directly) or any other link (opened in a new tab). */
export function videoKind(url: string): VideoKind {
  try {
    const u = new URL(url)
    if (YT_HOSTS.has(u.hostname)) {
      const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') ?? u.pathname.split('/').filter(Boolean).pop() ?? ''
      if (YT_ID.test(id)) return { kind: 'youtube', id }
    }
    if (/\.(mp4|webm|mov)$/i.test(u.pathname)) return { kind: 'file' }
  } catch { /* not an address */ }
  return { kind: 'link' }
}

export const youtubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}`
