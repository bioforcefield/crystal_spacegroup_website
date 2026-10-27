import { describe, expect, it } from 'vitest'
import {
  findPeakByHkl,
  hklKey,
  nearestPeak,
  peakShiftTable,
  topPeaksByIntensity,
} from '../peakCompare'
import type { PowderPeak } from '../powder'

function pk(
  twoTheta: number,
  intensity: number,
  h = 1,
  k = 0,
  l = 0,
  hkl?: string,
): PowderPeak {
  return {
    h,
    k,
    l,
    hkl: hkl ?? `${h} ${k} ${l}`,
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

describe('hkl pairing', () => {
  it('normalizes Friedel mates to one key', () => {
    expect(hklKey(1, 1, 1)).toBe(hklKey(-1, -1, -1))
    expect(hklKey(1, 0, 0)).toBe('1,0,0')
  })

  it('findPeakByHkl picks strongest of same index', () => {
    const peaks = [pk(20, 40, 1, 1, 1), pk(20.1, 90, 1, 1, 1)]
    expect(findPeakByHkl(peaks, -1, -1, -1)?.intensity).toBe(90)
  })
})

describe('peakShiftTable', () => {
  it('prefers same-hkl over a nearer unrelated 2θ', () => {
    const a = [pk(20, 100, 1, 1, 1), pk(35, 40, 2, 0, 0)]
    // B has a close-but-wrong peak at 20.1 (311) and the true 111 at 22.0
    const b = [
      pk(20.1, 50, 3, 1, 1),
      pk(22.0, 90, 1, 1, 1),
      pk(50, 80, 3, 1, 0),
    ]
    const rows = peakShiftTable(a, b, 2, 2.5)
    expect(rows[0]!.match).toBe('hkl')
    expect(rows[0]!.b?.h).toBe(1)
    expect(rows[0]!.b?.k).toBe(1)
    expect(rows[0]!.b?.l).toBe(1)
    expect(rows[0]!.deltaTwoTheta).toBeCloseTo(2.0, 5)
  })

  it('falls back to nearest-2θ with explicit match label', () => {
    const a = [pk(20, 100, 1, 1, 1)]
    const b = [pk(20.4, 90, 2, 2, 0)] // different hkl
    const rows = peakShiftTable(a, b, { n: 1, maxDeltaDeg: 1 })
    expect(rows).toHaveLength(1)
    expect(rows[0]!.match).toBe('nearest-2θ')
    expect(rows[0]!.deltaTwoTheta).toBeCloseTo(0.4, 5)
  })

  it('reports none when no neighbor', () => {
    const a = [pk(20, 100, 1, 0, 0)]
    const b = [pk(40, 90, 2, 0, 0)]
    const rows = peakShiftTable(a, b, 1, 1)
    expect(rows[0]!.match).toBe('none')
    expect(rows[0]!.b).toBeNull()
  })
})
