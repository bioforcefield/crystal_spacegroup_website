/** Solid-form teaching models. Only the ΔpKa relation is a published empirical fit; the rest are labelled models. */

/**
 * Cruz-Cabeza, CrystEngComm 14 (2012) 6362: from ~6,500 CSD acid–base complexes, the share
 * that is ionised (salt) rises ≈ linearly by 17 % per ΔpKa unit for −1 < ΔpKa < 4
 * (P ≈ 17·ΔpKa + 28 %); below −1 complexes are essentially neutral, above 4 essentially ionised.
 */
export function saltProbability(dpka: number): number {
  if (dpka < -1) return 0 // essentially neutral (fit applies only for −1 ≤ ΔpKa ≤ 4)
  if (dpka > 4) return 1
  return Math.min(1, Math.max(0, (17 * dpka + 28) / 100))
}
export type DpkaClass = 'cocrystal' | 'continuum' | 'salt'
/** ΔpKa = pKa(base, conjugate acid) − pKa(acid). */
export const dpka = (pkaBaseH: number, pkaAcid: number) => pkaBaseH - pkaAcid
export function classify(d: number): DpkaClass {
  if (d < -1) return 'cocrystal'
  if (d > 4) return 'salt'
  return 'continuum'
}

/**
 * pH–solubility of a monobasic base B and its salt BH⁺X⁻ (Kramer & Flynn 1972; Serajuddin 2007).
 * Free-base-limited: S = S0(1 + 10^(pKa−pH)); salt-limited: S = Ssalt(1 + 10^(pH−pKa)).
 * Observed S is the lower of the two; pHmax = pKa + log10(S0/Ssalt).
 */
export function phSolubilityBase(pH: number, pKa: number, S0: number, Ssalt: number) {
  const base = S0 * (1 + 10 ** (pKa - pH))
  const salt = Ssalt * (1 + 10 ** (pH - pKa))
  return { base, salt, S: Math.min(base, salt) }
}
export const pHmax = (pKa: number, S0: number, Ssalt: number) => pKa + Math.log10(S0 / Ssalt)

/**
 * Hydrate ⇌ anhydrate + n H2O. The hydrate is stable when a_w > a_w,c(T).
 * van 't Hoff: ln a_w,c(T) = ln a_w,c(T_ref) − (ΔH_d / (n R))·(1/T − 1/T_ref), ΔH_d > 0 (dehydration, per mol hydrate).
 */
export function criticalAw(TC: number, awRef: number, dHkJ: number, n = 1, TrefC = 25): number {
  const R = 8.314e-3, T = TC + 273.15, Tr = TrefC + 273.15
  return Math.exp(Math.log(awRef) - (dHkJ / (n * R)) * (1 / T - 1 / Tr))
}
/** ΔG(hydration) per mol hydrate (kJ): negative ⇒ hydrate stable. */
export function hydrationDG(aw: number, awc: number, TC: number, n = 1): number {
  return n * 8.314e-3 * (TC + 273.15) * Math.log(awc / aw)
}

/**
 * Burger–Ramberger rules (Burger & Ramberger 1979) with a linear ΔG model:
 * G_i(T) − G_liq(T) ≈ −ΔH_f,i (1 − T/T_m,i). Returns the crossing temperature (if any, in K)
 * and the heat-of-fusion-rule verdict.
 */
export type Form = { Tm: number; dHf: number } // K, kJ/mol
export function gRel(f: Form, T: number) { return -f.dHf * (1 - T / f.Tm) }
export function transitionT(a: Form, b: Form): number {
  const den = a.dHf / a.Tm - b.dHf / b.Tm
  return den === 0 ? NaN : (a.dHf - b.dHf) / den
}
export function heatOfFusionRule(a: Form, b: Form): 'enantiotropic' | 'monotropic' {
  const [hi, lo] = a.Tm >= b.Tm ? [a, b] : [b, a]
  return hi.dHf < lo.dHf ? 'enantiotropic' : 'monotropic'
}

/**
 * 1:1 cocrystal AB in solution (Nehm et al. 2006): Ksp = [A][B]. Drug solubility S_A, coformer S_B.
 * Eutectic points: E1 (cocrystal + A): [A]=S_A, [B]=Ksp/S_A; E2 (cocrystal + B): [B]=S_B, [A]=Ksp/S_B.
 * Keu = [B]/[A] at E1; cocrystal more soluble than drug when Keu > 1 (Good & Rodríguez-Hornedo 2009).
 */
export function cocrystalEutectics(SA: number, SB: number, Ksp: number) {
  const E1 = { A: SA, B: Ksp / SA }, E2 = { A: Ksp / SB, B: SB }
  const exists = Ksp / SA < SB && Ksp / SB < SA
  const Scc = Math.sqrt(Ksp)
  return { E1, E2, exists, Keu: E1.B / E1.A, Scc, ratio: Scc / SA }
}
