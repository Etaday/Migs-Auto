export const MAX_PHOTOS = 12
const MAX_BYTES = 25 * 1024 * 1024
const LONG_SIDE = 1600

/** The size a picture is shrunk to: long side at most `max`, same ratio, never enlarged, never zero. */
export function fitWithin(width: number, height: number, max: number) {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const k = Math.min(1, max / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) }
}

/** null = fine, otherwise a sentence for the owner. */
export function checkImageFile(f: { type: string; size: number; name: string }): string | null {
  if (/\.hei[cf]$/i.test(f.name) || /hei[cf]/i.test(f.type)) return 'HEIC photos are not supported here. Save or export the picture as a JPG and try again.'
  if (!/^image\/(jpeg|png|webp|gif|avif)$/i.test(f.type)) return 'Choose an image file (JPG, PNG or WebP).'
  if (f.size <= 0) return 'That file is empty.'
  if (f.size > MAX_BYTES) return 'That picture is too large (25 MB at most).'
  return null
}

/** Makes photo `index` the cover (first) and keeps the order of the rest. */
export function moveToFront<T>(list: T[], index: number): T[] {
  if (index <= 0 || index >= list.length) return list
  return [list[index], ...list.slice(0, index), ...list.slice(index + 1)]
}

/** Decodes the picture, shrinks it to 1600px and re-encodes it as a JPEG, so uploads stay small and fast. */
export async function resizeToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height, LONG_SIDE)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot prepare pictures.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.82))
  if (!blob) throw new Error('Could not prepare that picture.')
  return blob
}
