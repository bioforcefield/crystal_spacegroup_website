import { describe, expect, it } from 'vitest'
import {
  nearestPeak,
  peakShiftTable,
  topPeaksByIntensity,
} from '../peakCompare'
import type { PowderPeak } from '../powder'

function pk(
  twoTheta: number,
  intensity: number,
  hkl = '1 0 0',
): PowderPeak {
  return {
    h: 1,
    k: 0,
    l: 0,
    hkl,
    d: 1,
    twoTheta,
    intensity,
    f2: intensity,
    multiplicity: 1,
  }
}

describe('topPeaksByIntensity', () => {
  it('returns strongest first, capped', () => {
    const peaks = [pk(10, 20), pk(20, 100), pk(30, 50), pk(40, 5)]
    const top = topPeaksByIntensity(peaks, 2)
    expect(top.map((p) => p.twoTheta)).toEqual([20, 30])
  })

  it('handles empty / zero n', () => {
    expect(topPeaksByIntensity([], 5)).toEqual([])
    expect(topPeaksByIntensity([pk(10, 1)], 0)).toEqual([])
  })
})

describe('nearestPeak', () => {
  it('matches within tolerance', () => {
    const peaks = [pk(10, 1), pk(25.2, 1), pk(40, 1)]
    expect(nearestPeak(peaks, 25, 1)?.twoTheta).toBe(25.2)
    expect(nearestPeak(peaks, 25, 0.1)).toBeNull()
  })
})

describe('peakShiftTable', () => {
  it('reports delta 2θ for matched tops', () => {
    const a = [pk(20, 100, '1 1 1'), pk(35, 40, '2 0 0')]
    const b = [pk(20.4, 90, '1 1 1'), pk(50, 80, '3 1 1')]
    const rows = peakShiftTable(a, b, 2, 1)
    expect(rows).toHaveLength(2)
    expect(rows[0]!.deltaTwoTheta).toBeCloseTo(0.4, 5)
    expect(rows[1]!.b).toBeNull()
    expect(rows[1]!.deltaTwoTheta).toBeNull()
  })
})
