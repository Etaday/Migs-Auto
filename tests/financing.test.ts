import { describe, it, expect } from 'vitest'
import { monthlyPayment } from '../src/lib/financing'

describe('monthlyPayment', () => {
  it('divides evenly at 0% interest', () => {
    expect(monthlyPayment(1_000_000, 200_000, 0, 48)).toBe(16666.67)
  })
  it('costs more with interest than without', () => {
    expect(monthlyPayment(1_000_000, 200_000, 12, 48)).toBeGreaterThan(16666.67)
  })
  it('returns 0 when the down payment covers the price', () => {
    expect(monthlyPayment(500_000, 500_000, 10, 36)).toBe(0)
    expect(monthlyPayment(500_000, 600_000, 10, 36)).toBe(0)
  })
  it('returns 0 for a non-positive term', () => {
    expect(monthlyPayment(500_000, 0, 10, 0)).toBe(0)
    expect(monthlyPayment(500_000, 0, 10, -12)).toBe(0)
  })
  it('never returns NaN for bad numbers', () => {
    expect(monthlyPayment(NaN, 0, 10, 12)).toBe(0)
    expect(monthlyPayment(500_000, NaN, NaN, 12)).not.toBeNaN()
  })
})
