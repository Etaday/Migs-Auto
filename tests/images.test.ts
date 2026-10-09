import { describe, it, expect } from 'vitest'
import { fitWithin, checkImageFile, moveToFront, MAX_PHOTOS } from '../src/lib/images'

describe('fitWithin', () => {
  it('shrinks the long side to the limit and keeps the ratio', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
  })
  it('never enlarges a small picture', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
  it('never returns a zero side', () => {
    expect(fitWithin(5000, 1, 1600)).toEqual({ width: 1600, height: 1 })
    expect(fitWithin(0, 0, 1600)).toEqual({ width: 1, height: 1 })
  })
})

describe('checkImageFile', () => {
  const f = (type: string, size = 1000, name = 'a') => ({ type, size, name })
  it('accepts common photo types', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/webp']) expect(checkImageFile(f(t))).toBeNull()
  })
  it('rejects files that are not pictures', () => {
    expect(checkImageFile(f('application/pdf', 10, 'x.pdf'))).toMatch(/image/i)
  })
  it('explains HEIC instead of failing silently', () => {
    expect(checkImageFile(f('image/heic', 10, 'IMG_1.HEIC'))).toMatch(/jpg/i)
    expect(checkImageFile(f('', 10, 'IMG_2.heic'))).toMatch(/jpg/i)
  })
  it('rejects a huge file', () => {
    expect(checkImageFile(f('image/jpeg', 40 * 1024 * 1024))).toMatch(/large/i)
  })
  it('rejects an empty file', () => {
    expect(checkImageFile(f('image/jpeg', 0))).toMatch(/empty/i)
  })
})

describe('moveToFront', () => {
  it('makes a photo the cover without losing the others', () => {
    expect(moveToFront(['a', 'b', 'c'], 2)).toEqual(['c', 'a', 'b'])
  })
  it('leaves the list alone for the cover or a bad index', () => {
    expect(moveToFront(['a', 'b'], 0)).toEqual(['a', 'b'])
    expect(moveToFront(['a', 'b'], 9)).toEqual(['a', 'b'])
  })
  it('allows a sensible number of photos', () => expect(MAX_PHOTOS).toBeGreaterThanOrEqual(8))
})
