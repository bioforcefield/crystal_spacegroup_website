/**
 * Numbers transcribed from published sources only. Each dataset names its source ref id
 * (see refs.ts). Curves derived from these numbers are computed, not digitised.
 */

/** Brandel & ter Horst, Faraday Discuss. 179 (2015) 199, Table 2: J = A·S·exp(−B/ln²S). */
export type CntParams = { system: string; A: number; B: number; refIds: string[] }
export const CNT_AB: CntParams[] = [
  { system: 'DPL form RII in 2-propanol', A: 576, B: 0.68, refIds: ['brandel15'] },
  { system: 'DPL form RI in DMF', A: 499, B: 4.57, refIds: ['brandel15'] },
  { system: 'm-aminobenzoic acid, 50 wt% water/ethanol', A: 870e3, B: 3.6, refIds: ['brandel15', 'jiang11'] },
  { system: 'L-histidine in water', A: 36.3e3, B: 1.1, refIds: ['brandel15', 'jiang11'] },
  { system: 'isonicotinamide in ethanol', A: 5.86e3, B: 0.323, refIds: ['brandel15'] },
  { system: 'p-aminobenzoic acid in acetonitrile', A: 36.3e3, B: 0.016, refIds: ['brandel15'] },
  { system: 'p-aminobenzoic acid in ethyl acetate', A: 20.5e3, B: 0.053, refIds: ['brandel15'] },
  { system: 'p-aminobenzoic acid in 2-propanol', A: 10.9e3, B: 0.078, refIds: ['brandel15'] },
  { system: 'benzoic acid in toluene', A: 61.8e3, B: 0.46, refIds: ['brandel15'] },
]

/** Stationary CNT rate J(S) = A·S·exp(−B/ln²S) in m⁻³ s⁻¹ (S > 1). */
export function cntRate(A: number, B: number, S: number): number {
  if (!(S > 1)) return 0
  const l = Math.log(S)
  return A * S * Math.exp(-B / (l * l))
}

/**
 * Ristic et al., J. Phys. Chem. B 105 (2001) 9057, Table 1: relative face areas of
 * monoclinic paracetamol grown from pure water at low (<10 %), medium (10–15 %)
 * and high (>15 %) relative supersaturation.
 */
export const PARACETAMOL_FACE_AREAS: { face: string; low: number; medium: number; high: number }[] = [
  { face: '{110}', low: 0.85, medium: 0.4, high: 0.175 },
  { face: '{001}', low: 0.097, medium: 0.267, high: 0.505 },
  { face: '{20-1}', low: 0.028, medium: 0.067, high: 0.085 },
  { face: '{011}', low: 0.025, medium: 0.133, high: 0.17 },
  { face: '{100}', low: 0, medium: 0.133, high: 0.065 },
]

/** Same table: modelled morphological-importance rank (1 = most important). */
export const PARACETAMOL_MODEL_RANK: { face: string; dreiding: number | null; momany: number | null }[] = [
  { face: '{110}', dreiding: 4, momany: 4 },
  { face: '{001}', dreiding: 1, momany: 3 },
  { face: '{20-1}', dreiding: 3, momany: 2 },
  { face: '{011}', dreiding: 3, momany: 6 },
  { face: '{100}', dreiding: 1, momany: 1 },
  { face: '{111}', dreiding: 5, momany: 4 },
  { face: '{021}', dreiding: 6, momany: null },
]

/** JMAK X(t) = 1 − exp(−(k t)^n); theoretical exponents from Avrami (1939–41). */
export const AVRAMI_CASES: { n: number; label: string }[] = [
  { n: 1, label: 'n = 1 · 1D growth, site saturation' },
  { n: 2, label: 'n = 2 · 2D growth, site saturation' },
  { n: 3, label: 'n = 3 · 3D growth, site saturation' },
  { n: 4, label: 'n = 4 · 3D growth, constant nucleation rate' },
]
export function avrami(t: number, k: number, n: number): number {
  return 1 - Math.exp(-Math.pow(k * t, n))
}
