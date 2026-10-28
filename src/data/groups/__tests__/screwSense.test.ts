/**
 * Near-mode screw animation: prefer advance toward +c / teaching sense.
 */
import { describe, expect, it } from 'vitest'
import { getDemo } from '../../registry'
import {
  placedPositions,
  teachingScrewSense,
  screwAdvanceAlongSense,
} from '../../nearestImages'

describe('teachingScrewSense', () => {
  it('flips axis so dominant component is positive (+c preferred)', () => {
    expect(teachingScrewSense([0, 0, -1])).toEqual([0, 0, 1])
    expect(teachingScrewSense([0, -1, 0])).toEqual([0, 1, 0])
    expect(teachingScrewSense([0, 1, 0])).toEqual([0, 1, 0])
  })
})

describe('Near screw placement sense', () => {
  it('P21/c 2₁ Near image advances with Δc ≥ 0 (toward +c)', () => {
    const d = getDemo(14)!
    const screw = d.operators.find((o) => o.classId === 'screw')!
    expect(Math.abs(screw.t[2]!)).toBeGreaterThan(0.2)
    const { points } = placedPositions(d, screw.index, 'nearest')
    const base = points.find((p) => p.index === 1)!
    const img = points.find((p) => p.index === screw.index)!
    const dc = img.fractional[2]! - base.fractional[2]!
    // Sign of Δc is the encoded translation sense for t_z = ½ screws.
    expect(dc).toBeGreaterThanOrEqual(0)
    const ax = d.screwAxes.find((s) => s.primary)!
    expect(
      screwAdvanceAlongSense(base.fractional, img.fractional, ax.direction),
    ).toBeGreaterThan(0)
  })

  it('P212121 c-screw Near image advances along +c', () => {
    const d = getDemo(19)!
    const screw = d.operators.find(
      (o) => o.classId === 'screw' && Math.abs(o.t[2]!) > 0.2,
    )!
    const { points } = placedPositions(d, screw.index, 'nearest')
    const base = points.find((p) => p.index === 1)!
    const img = points.find((p) => p.index === screw.index)!
    expect(img.fractional[2]! - base.fractional[2]!).toBeGreaterThan(0)
  })
})
