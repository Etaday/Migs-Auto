import { describe, it, expect } from 'vitest'
import { checkVideoFile, videoKind, youtubeEmbedUrl, MAX_VIDEOS, MAX_VIDEO_MB } from '../src/lib/video'

describe('checkVideoFile', () => {
  const f = (type: string, size = 1000, name = 'clip.mp4') => ({ type, size, name })
  it('accepts mp4, webm and phone recordings (mov)', () => {
    for (const [t, n] of [['video/mp4', 'a.mp4'], ['video/webm', 'a.webm'], ['video/quicktime', 'IMG_1.MOV']] as const) expect(checkVideoFile(f(t, 1000, n))).toBeNull()
  })
  it('accepts a .mov that the browser reports with no type', () => expect(checkVideoFile(f('', 1000, 'IMG_2.mov'))).toBeNull())
  it('rejects a picture or a pdf', () => {
    expect(checkVideoFile(f('image/jpeg', 10, 'a.jpg'))).toMatch(/video/i)
    expect(checkVideoFile(f('application/pdf', 10, 'a.pdf'))).toMatch(/video/i)
  })
  it('rejects an empty file and one over the size limit, saying the limit', () => {
    expect(checkVideoFile(f('video/mp4', 0))).toMatch(/empty/i)
    expect(checkVideoFile(f('video/mp4', (MAX_VIDEO_MB + 1) * 1024 * 1024))).toContain(String(MAX_VIDEO_MB))
  })
  it('allows a video just under the limit', () => expect(checkVideoFile(f('video/mp4', MAX_VIDEO_MB * 1024 * 1024 - 1))).toBeNull())
  it('keeps the number of videos sensible', () => expect(MAX_VIDEOS).toBeGreaterThanOrEqual(2))
})

describe('videoKind', () => {
  it('recognises YouTube in its common forms', () => {
    for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10s', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ'])
      expect(videoKind(u)).toEqual({ kind: 'youtube', id: 'dQw4w9WgXcQ' })
  })
  it('treats a direct video address as a file', () => {
    expect(videoKind('https://x.supabase.co/storage/v1/object/public/vehicle-videos/a.mp4')).toEqual({ kind: 'file' })
    expect(videoKind('https://example.com/clip.webm?x=1')).toEqual({ kind: 'file' })
  })
  it('treats any other web address as a plain link', () => {
    expect(videoKind('https://www.facebook.com/reel/123')).toEqual({ kind: 'link' })
  })
  it('does not trust a lookalike host', () => expect(videoKind('https://notyoutube.com/watch?v=dQw4w9WgXcQ')).toEqual({ kind: 'link' }))
})

describe('youtubeEmbedUrl', () => {
  it('uses the privacy-friendly embed address', () => expect(youtubeEmbedUrl('dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'))
})
