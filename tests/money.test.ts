import { describe, it, expect } from 'vitest'
import { formatMoneyInput, parseMoneyInput, caretAfterFormat } from '../src/lib/money'

describe('formatMoneyInput', () => {
  it('puts a comma every three digits', () => {
    expect(formatMoneyInput('250000')).toBe('250,000')
    expect(formatMoneyInput('1234567')).toBe('1,234,567')
    expect(formatMoneyInput('999')).toBe('999')
  })
  it('keeps typed commas and junk out and re-formats', () => {
    expect(formatMoneyInput('2,5,0000')).toBe('250,000')
    expect(formatMoneyInput('₱ 1500')).toBe('1,500')
    expect(formatMoneyInput('abc')).toBe('')
  })
  it('drops leading zeros but keeps a single zero', () => {
    expect(formatMoneyInput('000123')).toBe('123')
    expect(formatMoneyInput('0')).toBe('0')
  })
  it('keeps up to two decimals', () => {
    expect(formatMoneyInput('1234.5')).toBe('1,234.5')
    expect(formatMoneyInput('1234.567')).toBe('1,234.56')
    expect(formatMoneyInput('1234.')).toBe('1,234.')
    expect(formatMoneyInput('.5')).toBe('0.5')
  })
  it('ignores a second decimal point', () => expect(formatMoneyInput('1.2.3')).toBe('1.23'))
  it('is empty for empty', () => expect(formatMoneyInput('')).toBe(''))
})

describe('parseMoneyInput', () => {
  it('reads the number back, with or without commas', () => {
    expect(parseMoneyInput('250,000')).toBe(250000)
    expect(parseMoneyInput('1,234.56')).toBe(1234.56)
    expect(parseMoneyInput('')).toBe(0)
    expect(parseMoneyInput('abc')).toBe(0)
  })
})

describe('caretAfterFormat (keeps the cursor next to the same digit while typing)', () => {
  it('keeps the cursor after the same number of digits', () => {
    expect(caretAfterFormat('1,2345', 4, '12,345')).toBe(4) // after the 3rd digit ("12,3|45")
    expect(caretAfterFormat('1234', 4, '1,234')).toBe(5)
    expect(caretAfterFormat('1234', 0, '1,234')).toBe(0)
  })
})
