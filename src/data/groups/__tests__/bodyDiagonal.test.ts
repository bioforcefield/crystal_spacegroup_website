import { describe, expect, it } from 'vitest'
import { buildOperatorsFromTriplets, classify } from '../buildOperators'
import {
  deriveBodyDiagonalThreefolds,
  deriveDiagonalGlides,
  deriveElements,
  fracNear,
} from '../deriveElements'
import { getDemo } from '../../registry'
import { parseTriplet } from '../parseTriplet'

describe('classify sixfold / −6', () => {
  it('pure 6-fold (t≈0) is sixfold, not screw', () => {
    // Hex 6 ‖ c: (−y, x−y, z) is order 6? Actually for P6: -y, x-y, z is 3-fold.
    // True 6-fold: (x-y, x, z) — R with tr=2
    const { R, t } = parseTriplet('x-y, x, z')
    const c = classify(R, t)
    expect(c.classId).toBe('sixfold')
    expect(c.label.toLowerCase()).toContain('6')
  })

  it('6₃ screw stays screw', () => {
    const { R, t } = parseTriplet('x-y, x, z+1/2')
    const c = classify(R, t)
    expect(c.classId).toBe('screw')
  })

  it('−6 rotoinversion uses sixfold classId', () => {
    // −6 ‖ c in hex basis: −(x−y, x, z) → (−x+y, −x, −z); det −1, tr −2
    const { R, t } = parseTriplet('-x+y, -x, -z')
    const c = classify(R, t)
    expect(c.classId).toBe('sixfold')
    expect(c.label).toMatch(/−6/)
  })
})

describe('deriveBodyDiagonalThreefolds', () => {
  it('finds 〈111〉 3-fold for z,x,y in P23-like ops', () => {
    const ops = buildOperatorsFromTriplets([
      'x,y,z',
      'z,x,y',
      'y,z,x',
      '-x,-y,z',
    ])
    const axes = deriveBodyDiagonalThreefolds(ops)
    expect(axes.length).toBeGreaterThan(0)
    const a = axes[0]!
    expect(a.kind).toBe('3')
    expect(Math.abs(a.direction[0])).toBe(1)
    expect(Math.abs(a.direction[1])).toBe(1)
    expect(Math.abs(a.direction[2])).toBe(1)
    expect(fracNear(a.origin[0], a.origin[1])).toBe(true)
  })

  it('Pm-3m (221) generated demo exposes a body-diagonal 3-fold axis', () => {
    const demo = getDemo(221)
    expect(demo).toBeDefined()
    const body = demo!.screwAxes.filter(
      (a) =>
        a.kind === '3' &&
        Math.abs(a.direction[0]) === 1 &&
        Math.abs(a.direction[1]) === 1 &&
        Math.abs(a.direction[2]) === 1,
    )
    expect(body.length).toBeGreaterThan(0)
  })
})

describe('deriveDiagonalGlides', () => {
  it('detects diagonal mirror y,x,z', () => {
    const ops = buildOperatorsFromTriplets(['x,y,z', 'y,x,z'])
    const glides = deriveDiagonalGlides(ops)
    expect(glides.length).toBeGreaterThan(0)
    expect(glides[0]!.corners).toBeDefined()
    expect(glides[0]!.classId).toBe('mirror')
  })

  it('deriveElements merges diagonal planes for Pm-3m ops', () => {
    const demo = getDemo(221)
    expect(demo).toBeDefined()
    const derived = deriveElements(demo!.operators)
    expect(derived.axes.some((a) => a.kind === '3')).toBe(true)
    expect(derived.glides.length).toBeGreaterThan(0)
  })
})
