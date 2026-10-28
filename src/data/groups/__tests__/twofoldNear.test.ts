/**
 * Near-mode pure 2-fold placement: compact raw-Seitz pairing so the drawn
 * axis sits between BASE and IMAGE (not a same-side lattice hop into the cell).
 */
import { describe, expect, it } from 'vitest'
import { getDemo } from '../../registry'
import {
  placedPositions,
  isCompactScrewImage,
  screwImageLatticeShift,
} from '../../nearestImages'
import { applyOperatorRaw } from '../../math'
import type { Operator, SpaceGroupDemo, Vec3 } from '../../types'

function primaryTwofold(d: SpaceGroupDemo): {
  op: Operator
  ax: NonNullable<(typeof d.screwAxes)[0]>
} {
  const op = d.operators.find((o) => o.classId === 'twofold')!
  const ax =
    d.screwAxes.find((s) => s.opIndex === op.index && s.primary) ??
    d.screwAxes.find((s) => s.opIndex === op.index)!
  return { op, ax }
}

function nearTwofoldPair(d: SpaceGroupDemo, op: Operator) {
  const { points } = placedPositions(d, op.index, 'nearest')
  const base = points.find((p) => p.index === 1)!
  const img = points.find((p) => p.index === op.index)!
  const raw = applyOperatorRaw(op, base.fractional)
  return { base, img, raw }
}

/** Perpendicular fractional components relative to an axis origin. */
function perpDeltas(p: Vec3, origin: Vec3, direction: Vec3): number[] {
  const out: number[] = []
  for (let i = 0; i < 3; i++) {
    if (Math.abs(direction[i]!) > 0.5) continue
    out.push(p[i]! - origin[i]!)
  }
  return out
}

/** True when BASE and IMAGE lie on opposite sides of the primary axis. */
function straddlesPrimaryAxis(
  base: Vec3,
  image: Vec3,
  origin: Vec3,
  direction: Vec3,
): boolean {
  const b = perpDeltas(base, origin, direction)
  const im = perpDeltas(image, origin, direction)
  // At least one perpendicular component must change sign (axis between them).
  return b.some((v, i) => v * im[i]! < -1e-9)
}

describe('Near twofold placement — compact raw Seitz / across axis', () => {
  it('C2 2-fold Near keeps the compact raw image across (0,y,0), not same-side +(1,0,1)', () => {
    const d = getDemo(5)!
    expect(d.meta.hm).toBe('C2')
    const { op, ax } = primaryTwofold(d)
    expect(ax.origin).toEqual([0, 0, 0])
    expect(ax.direction).toEqual([0, 1, 0])
    expect(ax.kind).toBe('2')

    const { base, img, raw } = nearTwofoldPair(d, op)
    // Raw mate for seed ≈ [0.18,0.22,0.31] is ≈ [−0.18,0.22,−0.31].
    expect(raw[0]!).toBeLessThan(0)
    expect(raw[2]!).toBeLessThan(0)

    // Compact: no full-cell same-side hop (the bug was image ≈ raw+(1,0,1)).
    expect(isCompactScrewImage(raw, img.fractional)).toBe(true)
    expect(screwImageLatticeShift(raw, img.fractional)).toBeLessThan(0.5 + 1e-9)

    // Drawn center between the two units: opposite sides of (0,y,0).
    expect(
      straddlesPrimaryAxis(base.fractional, img.fractional, ax.origin, ax.direction),
    ).toBe(true)
    // Explicit a/c signs for the C2 teaching seed.
    expect(base.fractional[0]! * img.fractional[0]!).toBeLessThan(0)
    expect(base.fractional[2]! * img.fractional[2]!).toBeLessThan(0)
    // Image may peek outside the box (preferred over wrapping same-side).
    expect(img.fractional[0]!).toBeLessThan(0.5)
    expect(img.fractional[2]!).toBeLessThan(0.5)
  })

  it('P2 2-fold Near also straddles the primary axis / stays near raw Seitz', () => {
    const d = getDemo(3)!
    expect(d.meta.hm).toBe('P2')
    const { op, ax } = primaryTwofold(d)
    const { base, img, raw } = nearTwofoldPair(d, op)
    expect(isCompactScrewImage(raw, img.fractional)).toBe(true)
    expect(
      straddlesPrimaryAxis(base.fractional, img.fractional, ax.origin, ax.direction),
    ).toBe(true)
  })
})
