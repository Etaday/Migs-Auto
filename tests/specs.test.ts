import { describe, it, expect } from 'vitest'
import { isValidVin, mapVpic, vpicUrl } from '../src/lib/specs'

// A real NHTSA vPIC answer for VIN 1HGCM82633A004352.
const ACCORD = {
  Make: 'HONDA', Model: 'Accord', ModelYear: '2003', VehicleType: 'PASSENGER CAR', BodyClass: 'Coupe',
  DisplacementL: '2.998832712', DisplacementCC: '2998.832712', EngineCylinders: '6', EngineHP: '240',
  FuelTypePrimary: 'Gasoline', TransmissionStyle: 'Automatic', ErrorCode: '0',
}

describe('isValidVin', () => {
  it('accepts 17 characters without I, O or Q, ignoring case and spaces', () => {
    expect(isValidVin(' 1hgcm82633a004352 ')).toBe(true)
  })
  it('rejects wrong length and forbidden letters', () => {
    expect(isValidVin('1HGCM82633A00435')).toBe(false)
    expect(isValidVin('1HGCM82633A00435O')).toBe(false)
    expect(isValidVin('')).toBe(false)
  })
})

describe('mapVpic', () => {
  it('maps a car answer to vehicle fields', () => {
    expect(mapVpic(ACCORD)).toEqual({
      type: 'car', brand: 'Honda', model: 'Accord', year: 2003, body: 'Coupe',
      engine: '3.0L 6-cyl, 240 hp', fuel: 'Gasoline', transmission: 'Automatic',
    })
  })
  it('maps a motorcycle by vehicle type and uses cc for the engine', () => {
    const m = mapVpic({ Make: 'KAWASAKI', Model: 'Ninja 400', ModelYear: '2021', VehicleType: 'MOTORCYCLE', DisplacementCC: '399', EngineCylinders: '2', FuelTypePrimary: 'Gasoline', ErrorCode: '0' })
    expect(m).toMatchObject({ type: 'motorcycle', brand: 'Kawasaki', model: 'Ninja 400', year: 2021, engine: '399cc 2-cyl' })
  })
  it('returns null when the VIN could not be decoded', () => {
    expect(mapVpic({ Make: '', Model: '', ErrorCode: '1,14' })).toBeNull()
  })
  it('omits fields the database does not know', () => {
    const m = mapVpic({ Make: 'HONDA', Model: 'City', ModelYear: '2020', VehicleType: 'PASSENGER CAR', ErrorCode: '0' })
    expect(m).toEqual({ type: 'car', brand: 'Honda', model: 'City', year: 2020 })
  })
})

describe('vpicUrl', () => {
  it('asks only for the VIN, uppercased, never a model year (the VIN already encodes it)', () => {
    expect(vpicUrl(' 1hgcm82633a004352 ')).toBe('https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/1HGCM82633A004352?format=json')
  })
})
