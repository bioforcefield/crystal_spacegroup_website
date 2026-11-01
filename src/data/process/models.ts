/**
 * Industrial crystallization teaching models. Data arrays are handbook values; everything
 * else is an explicitly labelled model curve (no fitted or invented "experimental" data).
 */

/** Solubility in water, g anhydrous salt / 100 g H2O (CRC Handbook of Chemistry & Physics; Mullin, Crystallization, 4th ed., App. A5). */
export const SOLUBILITY: Record<'KNO3' | 'NaCl', [number, number][]> = {
  KNO3: [[0, 13.3], [10, 20.9], [20, 31.6], [30, 45.8], [40, 63.9], [50, 85.5], [60, 110], [70, 138], [80, 169], [90, 202], [100, 246]],
  NaCl: [[0, 35.7], [10, 35.8], [20, 35.9], [30, 36.1], [40, 36.4], [50, 36.7], [60, 37.1], [70, 37.5], [80, 38.0], [90, 38.5], [100, 39.2]],
}
export type Solute = keyof typeof SOLUBILITY

/** Piecewise-linear interpolation of tabulated solubility (clamped to table range). */
export function solubility(s: Solute, T: number): number {
  const d = SOLUBILITY[s]
  if (T <= d[0][0]) return d[0][1]
  for (let i = 1; i < d.length; i++) {
    if (T <= d[i][0]) {
      const [t0, c0] = d[i - 1], [t1, c1] = d[i]
      return c0 + ((c1 - c0) * (T - t0)) / (t1 - t0)
    }
  }
  return d[d.length - 1][1]
}

/** Saturation temperature for concentration c (inverse of solubility; NaN if outside table). */
export function saturationT(s: Solute, c: number): number {
  const d = SOLUBILITY[s]
  for (let i = 1; i < d.length; i++) {
    const [t0, c0] = d[i - 1], [t1, c1] = d[i]
    if ((c - c0) * (c - c1) <= 0 && c1 !== c0) return t0 + ((t1 - t0) * (c - c0)) / (c1 - c0)
  }
  return NaN
}

/**
 * Nývlt-type MSZW model: ΔT_max = ΔT_ref · (b / b_ref)^(1/m), b in K/min.
 * Teaching model (Nývlt 1968); ΔT_ref and m are user parameters, not data.
 */
export function mszw(b: number, m: number, dTref = 8, bref = 0.5): number {
  if (!(b > 0) || !(m > 0)) return 0
  return dTref * Math.pow(b / bref, 1 / m)
}

export type Profile = 'linear' | 'natural' | 'cubic'
/**
 * Cooling profiles on normalised batch time θ ∈ [0,1].
 * linear: T0 − ΔT·θ; natural: Newton cooling to a jacket 10 K below Tf, reaching Tf at θ=1;
 * cubic: Mullin–Nývlt controlled cooling T0 − ΔT·θ³ (Mullin & Nývlt 1971).
 */
export function coolingT(kind: Profile, theta: number, T0: number, Tf: number): number {
  const th = Math.min(1, Math.max(0, theta)), dT = T0 - Tf
  if (kind === 'linear') return T0 - dT * th
  if (kind === 'cubic') return T0 - dT * th ** 3
  const Tj = Tf - 10, k = Math.log((T0 - Tj) / (Tf - Tj))
  return Tj + (T0 - Tj) * Math.exp(-k * th)
}

/** MSMPR steady state (Randolph & Larson 1962): n(L) = n0·exp(−L/(Gτ)). */
export function msmprN(L: number, n0: number, G: number, tau: number): number {
  return n0 * Math.exp(-L / (G * tau))
}
/** Mass-weighted density ∝ L³ n(L); its mode is the dominant size 3Gτ. */
export function msmprMass(L: number, G: number, tau: number): number {
  return L ** 3 * Math.exp(-L / (G * tau))
}
export const msmprDominant = (G: number, tau: number) => 3 * G * tau
/** Mass-mean (L4,3) of the MSMPR distribution = 4Gτ. */
export const msmprMassMean = (G: number, tau: number) => 4 * G * tau

/** Cooling yield of an anhydrous solute from saturated at T0 to equilibrium at Tf, per 100 g water. */
export function coolingYield(s: Solute, T0: number, Tf: number, evapFrac = 0): { mass: number; frac: number } {
  const c0 = solubility(s, T0), cf = solubility(s, Tf)
  const mass = Math.max(0, c0 - cf * (1 - Math.min(Math.max(evapFrac, 0), 1)))
  return { mass, frac: c0 > 0 ? mass / c0 : 0 }
}

/**
 * Seed mass so that seeds alone (no nucleation, no breakage, same shape) grow from Ls to Lp
 * while depositing yield Y: Wp = Ws·(Lp/Ls)³ and Wp − Ws = Y ⇒ Ws = Y / ((Lp/Ls)³ − 1).
 */
export function seedMass(yieldMass: number, Ls: number, Lp: number): number {
  const r = (Lp / Ls) ** 3
  return r > 1 ? yieldMass / (r - 1) : Infinity
}
/** Product size reached by seeds of size Ls with seed loading Cs = Ws/Y. */
export function productSize(Ls: number, loading: number): number {
  return loading > 0 ? Ls * Math.cbrt(1 + 1 / loading) : Infinity
}
