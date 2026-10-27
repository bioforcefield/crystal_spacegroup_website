import { describe, expect, it } from 'vitest'
import { dFromTwoTheta, lorentzPolarization, twoThetaDeg } from '../bragg'
import { isAllowedByCentering } from '../../../morphology/centering'

describe('twoThetaDeg / dFromTwoTheta', () => {
  it('Cu Kα: d=1.54 Å → 2θ ≈ 60°', () => {
    const tt = twoThetaDeg(1.5406, 1.5406)
    expect(tt).toBeCloseTo(60, 0)
    const d = dFromTwoTheta(tt!, 1.5406)
    expect(d).toBeCloseTo(1.5406, 4)
  })

  it('returns null beyond backscatter', () => {
    expect(twoThetaDeg(0.5, 1.5406)).toBeNull()
  })

  it('LP factor positive in mid-range', () => {
    expect(lorentzPolarization(30)).toBeGreaterThan(0)
    expect(lorentzPolarization(90)).toBeGreaterThan(0)
  })
})

describe('centering extinctions (reuse)', () => {
  it('I-centering forbids odd h+k+l', () => {
    expect(isAllowedByCentering('I', 1, 0, 0)).toBe(false)
    expect(isAllowedByCentering('I', 1, 1, 0)).toBe(true)
  })
  it('F-centering requires all even or all odd', () => {
    expect(isAllowedByCentering('F', 1, 0, 0)).toBe(false)
    expect(isAllowedByCentering('F', 1, 1, 1)).toBe(true)
    expect(isAllowedByCentering('F', 2, 0, 0)).toBe(true)
  })
})
