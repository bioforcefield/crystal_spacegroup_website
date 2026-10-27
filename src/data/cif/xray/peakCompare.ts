/**
 * Pure helpers for side-by-side / shift highlights between two powder patterns.
 * Prefer same-(hkl) pairing when indices exist; fall back to nearest-2θ.
 */

import type { PowderPeak } from './powder'

export function topPeaksByIntensity(peaks: PowderPeak[], n = 8): PowderPeak[] {
  if (n <= 0) return []
  return [...peaks].sort((a, b) => b.intensity - a.intensity).slice(0, n)
}

export function nearestPeak(
  peaks: PowderPeak[],
  twoTheta: number,
  maxDeltaDeg = 2.5,
): PowderPeak | null {
  let best: PowderPeak | null = null
  let bestAbs = Infinity
  for (const p of peaks) {
    const d = Math.abs(p.twoTheta - twoTheta)
    if (d < bestAbs) {
      bestAbs = d
      best = p
    }
  }
  if (!best || bestAbs > maxDeltaDeg) return null
  return best
}

/** Canonical unsigned index key for pairing (ignores Friedel sign). */
export function hklKey(h: number, k: number, l: number): string {
  let hh = Math.round(h)
  let kk = Math.round(k)
  let ll = Math.round(l)
  if (hh < 0 || (hh === 0 && kk < 0) || (hh === 0 && kk === 0 && ll < 0)) {
    hh = -hh
    kk = -kk
    ll = -ll
  }
  return `${hh},${kk},${ll}`
}

export function findPeakByHkl(
  peaks: PowderPeak[],
  h: number,
  k: number,
  l: number,
): PowderPeak | null {
  const key = hklKey(h, k, l)
  let best: PowderPeak | null = null
  for (const p of peaks) {
    if (hklKey(p.h, p.k, p.l) !== key) continue
    if (!best || p.intensity > best.intensity) best = p
  }
  return best
}

export type PeakMatchMethod = 'hkl' | 'nearest-2θ'

export interface PeakShiftRow {
  a: PowderPeak
  b: PowderPeak | null
  /** b.twoTheta − a.twoTheta when matched; null if no neighbor within tolerance. */
  deltaTwoTheta: number | null
  /** How B was chosen — UI must say nearest-2θ is not an index match. */
  match: PeakMatchMethod | 'none'
}

export interface PeakShiftTableOptions {
  n?: number
  maxDeltaDeg?: number
  /** Prefer same-hkl when both sides have indices (default true). */
  preferHkl?: boolean
}

/**
 * For each of the top-n Form A peaks (by intensity), pair a Form B peak.
 * Prefer same (hkl); else nearest 2θ within maxDeltaDeg.
 */
export function peakShiftTable(
  peaksA: PowderPeak[],
  peaksB: PowderPeak[],
  nOrOpts: number | PeakShiftTableOptions = 8,
  maxDeltaDegArg = 2.5,
): PeakShiftRow[] {
  const opts: PeakShiftTableOptions =
    typeof nOrOpts === 'number'
      ? { n: nOrOpts, maxDeltaDeg: maxDeltaDegArg, preferHkl: true }
      : { preferHkl: true, maxDeltaDeg: 2.5, n: 8, ...nOrOpts }
  const n = opts.n ?? 8
  const maxDeltaDeg = opts.maxDeltaDeg ?? 2.5
  const preferHkl = opts.preferHkl !== false

  const tops = topPeaksByIntensity(peaksA, n)
  return tops.map((a) => {
    if (preferHkl) {
      const byHkl = findPeakByHkl(peaksB, a.h, a.k, a.l)
      if (byHkl) {
        return {
          a,
          b: byHkl,
          deltaTwoTheta: byHkl.twoTheta - a.twoTheta,
          match: 'hkl' as const,
        }
      }
    }
    const b = nearestPeak(peaksB, a.twoTheta, maxDeltaDeg)
    if (b) {
      return {
        a,
        b,
        deltaTwoTheta: b.twoTheta - a.twoTheta,
        match: 'nearest-2θ' as const,
      }
    }
    return { a, b: null, deltaTwoTheta: null, match: 'none' as const }
  })
}
