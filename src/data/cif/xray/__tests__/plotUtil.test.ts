import { describe, it, expect } from 'vitest'
import { niceTicks, placePeakLabels, peaksCsv } from '../plotUtil'

describe('PXRD plot helpers', () => {
  it('nice 2θ ticks', () => {
    expect(niceTicks(5, 60, 6)).toEqual([10, 20, 30, 40, 50, 60])
    expect(niceTicks(20, 30, 10)).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30])
  })
  it('labels do not overlap and strongest go first', () => {
    const peaks = [{ twoTheta: 20, intensity: 100, hkl: '1 0 0' }, { twoTheta: 20.1, intensity: 90, hkl: '0 1 0' }, { twoTheta: 40, intensity: 10, hkl: '2 0 0' }, { twoTheta: 70, intensity: 50, hkl: 'x' }]
    const L = placePeakLabels(peaks, 5, 60, 5, (t) => t * 5, (i) => 200 - i, 6, 12)
    expect(L.map((l) => l.peak.hkl)).toEqual(['1 0 0', '0 1 0', '2 0 0'])
    expect(Math.abs(L[0]!.y - L[1]!.y)).toBeGreaterThanOrEqual(12)
  })
  it('csv', () => {
    const c = peaksCsv([{ form: 'A', peaks: [{ hkl: '1 0 4', d: 3.035, twoTheta: 29.4, intensity: 100, multiplicity: 6 }] }], 1.5406)
    expect(c).toContain('A,"1 0 4",3.0350,29.400,100.00,6')
  })
})
