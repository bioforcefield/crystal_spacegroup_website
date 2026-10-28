import { describe, expect, it } from 'vitest'
import { fitDistanceForSphere } from '../fitCamera'

describe('fitDistanceForSphere', () => {
  it('frames a unit sphere inside fov 42 at aspect 1', () => {
    const d = fitDistanceForSphere(1, 42, 1)
    // Vertical half-angle sin(21°) ≈ 0.358; margin 1.12 → ≈ 3.12
    expect(d).toBeGreaterThan(2.5)
    expect(d).toBeLessThan(4)
  })

  it('pulls back on narrow aspect so horizontal FOV still fits', () => {
    const wide = fitDistanceForSphere(5, 42, 2)
    const narrow = fitDistanceForSphere(5, 42, 0.5)
    expect(narrow).toBeGreaterThan(wide)
  })
})
