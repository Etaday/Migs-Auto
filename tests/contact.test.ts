import { describe, it, expect } from 'vitest'
import { validateContact } from '../src/lib/contact'

describe('validateContact', () => {
  it('requires a name', () => {
    expect(validateContact({ name: '  ', phone: '0917 000 0000', email: '' })).toMatch(/name/i)
  })
  it('requires a phone or an email', () => {
    expect(validateContact({ name: 'Ana', phone: '', email: '' })).toMatch(/phone or email/i)
  })
  it('rejects a malformed email', () => {
    expect(validateContact({ name: 'Ana', phone: '', email: 'ana@' })).toMatch(/email/i)
  })
  it('accepts a name with only a phone', () => {
    expect(validateContact({ name: 'Ana', phone: '0917 000 0000', email: '' })).toBeNull()
  })
  it('accepts a name with only a valid email', () => {
    expect(validateContact({ name: 'Ana', phone: '', email: 'ana@example.com' })).toBeNull()
  })
})
