/**
 * Pure helpers for side-by-side / shift highlights between two powder patterns.
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

export interface PeakShiftRow {
  a: PowderPeak
  b: PowderPeak | null
  /** b.twoTheta − a.twoTheta when matched; null if no neighbor within tolerance. */
  deltaTwoTheta: number | null
}

/**
 * For each of the top-n Form A peaks (by intensity), find the nearest Form B
 * peak within maxDeltaDeg. Useful as a teaching “peak shift” table.
 */
export function peakShiftTable(
  peaksA: PowderPeak[],
  peaksB: PowderPeak[],
  n = 8,
  maxDeltaDeg = 2.5,
): PeakShiftRow[] {
  const tops = topPeaksByIntensity(peaksA, n)
  return tops.map((a) => {
    const b = nearestPeak(peaksB, a.twoTheta, maxDeltaDeg)
    return {
      a,
      b,
      deltaTwoTheta: b ? b.twoTheta - a.twoTheta : null,
    }
  })
}
