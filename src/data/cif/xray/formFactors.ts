/**
 * Compact atomic form-factor approximations for teaching PXRD.
 * Cromer–Mann 4-Gaussian coefficients (aᵢ,bᵢ,c) for common elements;
 * unknown symbols fall back to Z·exp(−12 s²).
 * Source: ITC Vol. C tables (truncated / rounded for browser size).
 */

export interface FormFactorCoeffs {
  a: [number, number, number, number]
  b: [number, number, number, number]
  c: number
  Z: number
}

/** Element → Cromer–Mann-ish coeffs (s = sinθ/λ in Å⁻¹). */
const TABLE: Record<string, FormFactorCoeffs> = {
  H: { a: [0.493, 0.323, 0.14, 0.041], b: [10.82, 26.16, 3.14, 57.8], c: 0.003, Z: 1 },
  C: { a: [2.31, 1.02, 1.589, 0.865], b: [20.84, 10.21, 0.569, 51.65], c: 0.216, Z: 6 },
  N: { a: [12.213, 3.132, 2.013, 1.166], b: [0.006, 9.893, 28.997, 0.583], c: -11.529, Z: 7 },
  O: { a: [3.049, 2.287, 1.546, 0.867], b: [13.277, 5.701, 0.324, 32.909], c: 0.251, Z: 8 },
  F: { a: [3.539, 2.641, 1.517, 1.024], b: [10.283, 4.294, 0.262, 27.68], c: 0.276, Z: 9 },
  NA: { a: [4.763, 3.174, 1.267, 1.113], b: [3.285, 8.842, 0.314, 129.424], c: 0.676, Z: 11 },
  MG: { a: [5.42, 2.174, 1.227, 2.307], b: [2.827, 79.261, 0.381, 7.196], c: 0.858, Z: 12 },
  AL: { a: [6.42, 1.9, 1.594, 1.965], b: [3.039, 0.743, 31.547, 85.089], c: 1.115, Z: 13 },
  SI: { a: [6.292, 3.035, 1.989, 1.541], b: [2.439, 32.334, 0.678, 81.694], c: 1.141, Z: 14 },
  P: { a: [6.435, 4.179, 1.78, 1.491], b: [1.907, 27.157, 0.526, 68.164], c: 1.115, Z: 15 },
  S: { a: [6.905, 5.203, 1.438, 1.586], b: [1.468, 22.215, 0.254, 56.172], c: 0.867, Z: 16 },
  CL: { a: [11.46, 7.196, 3.06, 2.116], b: [0.01, 1.166, 18.446, 60.448], c: -9.557, Z: 17 },
  K: { a: [8.219, 7.44, 1.052, 0.866], b: [12.795, 0.775, 213.187, 41.684], c: 1.407, Z: 19 },
  CA: { a: [8.626, 7.387, 1.59, 1.021], b: [10.442, 0.66, 85.749, 167.079], c: 1.375, Z: 20 },
  TI: { a: [9.759, 7.387, 1.76, 1.051], b: [7.851, 0.5, 35.882, 116.106], c: 1.386, Z: 22 },
  FE: { a: [11.176, 7.444, 3.655, 0.832], b: [4.614, 0.312, 18.541, 74.323], c: 1.234, Z: 26 },
  CU: { a: [13.338, 7.168, 5.616, 1.673], b: [3.583, 0.247, 11.397, 61.812], c: 1.191, Z: 29 },
  ZN: { a: [14.074, 7.032, 5.165, 2.41], b: [3.266, 0.233, 10.316, 58.71], c: 1.304, Z: 30 },
  BR: { a: [17.179, 5.236, 5.638, 3.985], b: [2.196, 0.197, 16.345, 50.385], c: 2.006, Z: 35 },
  I: { a: [20.147, 18.995, 7.514, 2.273], b: [4.347, 0.381, 27.766, 66.877], c: 4.071, Z: 53 },
  BA: { a: [20.181, 19.614, 10.578, 2.694], b: [3.786, 0.288, 20.247, 59.322], c: 2.856, Z: 56 },
  PB: { a: [31.062, 13.064, 18.442, 5.97], b: [0.69, 2.357, 8.618, 47.258], c: 13.412, Z: 82 },
  LI: { a: [1.128, 0.751, 0.618, 0.466], b: [3.955, 1.049, 85.39, 168.261], c: 0.038, Z: 3 },
  B: { a: [2.055, 1.333, 1.098, 0.707], b: [23.247, 1.06, 0.343, 60.323], c: -0.193, Z: 5 },
}

const Z_FALLBACK: Record<string, number> = {
  HE: 2, BE: 4, NE: 10, AR: 18, CR: 24, MN: 25, CO: 27, NI: 28,
  GA: 31, GE: 32, AS: 33, SE: 34, RB: 37, SR: 38, Y: 39, ZR: 40,
  NB: 41, MO: 42, AG: 47, CD: 48, SN: 50, SB: 51, TE: 52, CS: 55,
  LA: 57, W: 74, PT: 78, AU: 79, HG: 80, BI: 83, U: 92,
}

export function normalizeElement(symbol: string): string {
  const t = symbol.trim().replace(/[^A-Za-z]/g, '')
  if (!t) return 'C'
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}

export function atomicNumber(symbol: string): number {
  const key = normalizeElement(symbol).toUpperCase()
  if (TABLE[key]) return TABLE[key]!.Z
  return Z_FALLBACK[key] ?? 6
}

/** f₀(s) with s = sinθ/λ (Å⁻¹). Clamped to [0.05, Z]. */
export function formFactor(symbol: string, s: number): number {
  const key = normalizeElement(symbol).toUpperCase()
  const s2 = s * s
  const row = TABLE[key]
  if (row) {
    const { a, b, c, Z } = row
    let f = c
    for (let i = 0; i < 4; i++) f += a[i]! * Math.exp(-b[i]! * s2)
    return Math.max(0.05, Math.min(Z + 0.5, f))
  }
  const Z = atomicNumber(symbol)
  return Math.max(0.05, Z * Math.exp(-12 * s2))
}
