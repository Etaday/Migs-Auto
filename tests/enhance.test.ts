import { describe, it, expect } from 'vitest'
import { enhanceModifications, enhanceDescription, buildPrompt } from '../src/lib/enhance'

const car = { year: 2021, brand: 'Toyota', model: 'Vios 1.3 E', type: 'car' as const, body: 'Sedan', engine: '1.3L 4-cyl', transmission: 'Automatic', fuel: 'Gasoline', color: 'White', mileage: 28000, price: 640000 }

describe('enhanceModifications', () => {
  it('cleans spacing, capitalises and fixes acronyms', () => {
    expect(enhanceModifications(['  led   headlights ', 'dash cam', 'new tires'])).toEqual(['LED headlights', 'Dash cam', 'New tires'])
  })
  it('splits a typed list on commas, semicolons, new lines and "and"', () => {
    expect(enhanceModifications(['akrapovic exhaust, lowered suspension and tinted windows'])).toEqual(['Akrapovic exhaust', 'Lowered suspension', 'Tinted windows'])
  })
  it('removes duplicates regardless of case and drops empty bits', () => {
    expect(enhanceModifications(['Dash cam', 'dash CAM', ' ', '.', 'x'])).toEqual(['Dash cam'])
  })
  it('keeps brand casing the owner typed inside a word', () => {
    expect(enhanceModifications(['iPhone mount'])).toEqual(['iPhone mount'])
  })
  it('strips trailing full stops', () => {
    expect(enhanceModifications(['abs brakes.'])).toEqual(['ABS brakes'])
  })
  it('does not split "and" inside a product name when there is no list', () => {
    expect(enhanceModifications(['Brembo front brakes'])).toEqual(['Brembo front brakes'])
  })
})

describe('enhanceDescription', () => {
  it('writes a factual description from the specs when the owner typed nothing', () => {
    const t = enhanceDescription(car, '', [])
    expect(t).toContain('2021 Toyota Vios 1.3 E')
    expect(t).toContain('white sedan')
    expect(t).toContain('1.3L 4-cyl')
    expect(t).toContain('28,000 km')
    expect(t).toContain('₱640,000')
  })
  it('keeps and tidies what the owner wrote', () => {
    const t = enhanceDescription(car, 'one owner  .  complete papers,no accident', [])
    expect(t).toContain('One owner.')
    expect(t).toContain('Complete papers, no accident.')
  })
  it('lists the modifications', () => {
    expect(enhanceDescription(car, '', ['Dash cam', 'Tinted windows'])).toContain('Modifications: Dash cam, Tinted windows.')
  })
  it('never invents things the specs do not say', () => {
    const t = enhanceDescription({ ...car, engine: '', transmission: '', fuel: '', body: '', color: '', mileage: 0 }, '', [])
    expect(t).not.toMatch(/undefined|null|NaN/)
    expect(t).not.toMatch(/km|engine|transmission/i)
  })
  it('is stable when run twice', () => {
    const once = enhanceDescription(car, 'one owner', ['Dash cam'])
    expect(enhanceDescription(car, once, ['Dash cam'])).toBe(once)
  })
})

describe('buildPrompt', () => {
  it('tells the model to use only the given facts', () => {
    const p = buildPrompt('description', 'one owner', car, [])
    expect(p).toContain('Toyota Vios 1.3 E')
    expect(p).toMatch(/do not invent/i)
    expect(p).toContain('one owner')
  })
})
