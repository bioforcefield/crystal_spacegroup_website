/** Bragg / wavelength helpers for teaching PXRD. */

export const WAVELENGTH_PRESETS = [
  { id: 'Cu', label: 'Cu Kα', angstrom: 1.5406 },
  { id: 'Mo', label: 'Mo Kα', angstrom: 0.71073 },
  { id: 'Co', label: 'Co Kα', angstrom: 1.7902 },
] as const

export type WavelengthPresetId = (typeof WAVELENGTH_PRESETS)[number]['id']

/** 2θ (degrees) from d (Å) and λ (Å). Returns null if d ≤ λ/2 (beyond backscatter). */
export function twoThetaDeg(dAngstrom: number, wavelengthA: number): number | null {
  if (!(dAngstrom > 0) || !(wavelengthA > 0)) return null
  const arg = wavelengthA / (2 * dAngstrom)
  if (arg < 0 || arg > 1) return null
  return (2 * Math.asin(arg) * 180) / Math.PI
}

/** d (Å) from 2θ (degrees) and λ (Å). */
export function dFromTwoTheta(twoThetaDegVal: number, wavelengthA: number): number | null {
  if (!(twoThetaDegVal > 0) || !(wavelengthA > 0) || twoThetaDegVal >= 180) return null
  const s = Math.sin((twoThetaDegVal * Math.PI) / 360)
  if (s <= 0) return null
  return wavelengthA / (2 * s)
}

/** Lorentz–polarization factor for unpolarized powder (relative). */
export function lorentzPolarization(twoThetaDegVal: number): number {
  const t2 = (twoThetaDegVal * Math.PI) / 180
  const t = t2 / 2
  const sinT = Math.sin(t)
  const cosT = Math.cos(t)
  if (Math.abs(sinT) < 1e-8 || Math.abs(cosT) < 1e-8) return 0
  const num = 1 + Math.cos(t2) ** 2
  const den = sinT * sinT * cosT
  return num / den
}
