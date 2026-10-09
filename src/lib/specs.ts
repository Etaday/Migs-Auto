import type { Vehicle } from '@/types/vehicle'

/**
 * Real specifications from the US NHTSA vPIC database (free, no key, open CORS):
 * a 17-character VIN decodes to the exact make, model, year, engine, fuel and
 * transmission the manufacturer registered. Covers vehicles sold in the US
 * market; a VIN it does not know decodes to null and the form stays manual.
 */

export type DecodedSpecs = Partial<Pick<Vehicle, 'type' | 'brand' | 'model' | 'year' | 'body' | 'engine' | 'fuel' | 'transmission'>>

type Vpic = Record<string, string | undefined>

export const isValidVin = (vin: string) => /^[A-HJ-NPR-Z0-9]{17}$/.test(vin.trim().toUpperCase())

const titleCase = (s: string) =>
  s.length <= 3 ? s.toUpperCase() : s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a, b) => a + b.toUpperCase())

export function mapVpic(r: Vpic): DecodedSpecs | null {
  const code = (r.ErrorCode ?? '').split(',')[0].trim()
  if (!r.Make || !r.Model || (code && code !== '0' && code !== '6' && code !== '7' && code !== '8')) return null
  const bike = /MOTORCYCLE/i.test(r.VehicleType ?? '')
  const out: DecodedSpecs = { type: bike ? 'motorcycle' : 'car', brand: titleCase(r.Make), model: r.Model.trim() }
  const year = Number(r.ModelYear)
  if (year) out.year = year
  if (r.BodyClass) out.body = r.BodyClass.replace(/\s*\(.*\)\s*$/, '')
  const litres = Number(r.DisplacementL)
  const cc = Number(r.DisplacementCC)
  const size = bike ? (cc ? `${Math.round(cc)}cc` : '') : litres ? `${litres.toFixed(1)}L` : ''
  const parts = [size, r.EngineCylinders ? `${r.EngineCylinders}-cyl` : ''].filter(Boolean).join(' ')
  const engine = [parts, r.EngineHP ? `${Math.round(Number(r.EngineHP))} hp` : ''].filter(Boolean).join(', ')
  if (engine) out.engine = engine
  if (r.FuelTypePrimary) out.fuel = r.FuelTypePrimary
  if (r.TransmissionStyle) out.transmission = r.TransmissionStyle
  return out
}

/** No model year is sent: the VIN encodes it, and a wrong one makes the database reject the VIN. */
export const vpicUrl = (vin: string) => `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin.trim().toUpperCase()}?format=json`

/** Looks the VIN up online. Throws on a bad VIN or a network failure. */
export async function decodeVin(vin: string): Promise<DecodedSpecs | null> {
  if (!isValidVin(vin)) throw new Error('A VIN has 17 letters and numbers (no I, O or Q).')
  const res = await fetch(vpicUrl(vin))
  if (!res.ok) throw new Error('The spec database did not answer. Try again.')
  const json = (await res.json()) as { Results?: Vpic[] }
  return mapVpic(json.Results?.[0] ?? {})
}
