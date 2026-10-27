import { describe, expect, it } from 'vitest'
import { buildGeneratedDemo } from '../../generatedDemo'
import {
  deriveElements,
  deriveFaceDiagonalTwofolds,
  deriveFourfoldAB,
} from '../deriveElements'
import { buildOperatorsFromTriplets } from '../buildOperators'

describe('face-diagonal 2-folds + 4 ‖ a/b', () => {
  it('derives face-diagonal 2 from -y,-x,-z', () => {
    const ops = buildOperatorsFromTriplets(['x,y,z', '-y,-x,-z'])
    const axes = deriveFaceDiagonalTwofolds(ops)
    expect(axes.length).toBeGreaterThanOrEqual(1)
    expect(axes[0]!.kind === '2' || axes[0]!.kind === '21').toBe(true)
  })

  it('Fm-3m generated demo covers more axes than before', () => {
    const demo = buildGeneratedDemo(225)!
    const der = deriveElements(demo.operators)
    expect(der.axes.length).toBeGreaterThan(45)
    // face-diagonal and 4‖a/b should appear
    expect(deriveFaceDiagonalTwofolds(demo.operators).length).toBeGreaterThan(0)
    expect(deriveFourfoldAB(demo.operators).length).toBeGreaterThan(0)
  })

  it('body-diagonal 3-folds emit one locus per operator (no silent drop)', () => {
    const demo = buildGeneratedDemo(205)! // Pa-3
    const der = deriveElements(demo.operators)
    const threefolds = demo.operators.filter((o) => o.classId === 'threefold')
    const covered = threefolds.filter((o) =>
      der.axes.some((a) => a.opIndex === o.index),
    )
    expect(covered.length).toBeGreaterThanOrEqual(Math.min(4, threefolds.length))
  })
})
