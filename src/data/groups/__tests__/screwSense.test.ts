/**
 * Near-mode screw placement: compact raw-Seitz pairing + soft axis sense.
 */
import { describe, expect, it } from 'vitest'
import { getDemo } from '../../registry'
import {
  placedPositions,
  teachingScrewSense,
  screwAdvanceAlongSense,
  isCompactScrewImage,
} from '../../nearestImages'
import { applyOperatorRaw } from '../../math'
import { minScrewClearance } from '../../teachingSeed'

describe('teachingScrewSense', () => {
  it('flips axis so dominant component is positive (+c preferred)', () => {
    expect(teachingScrewSense([0, 0, -1])).toEqual([0, 0, 1])
    expect(teachingScrewSense([0, -1, 0])).toEqual([0, 1, 0])
    expect(teachingScrewSense([0, 1, 0])).toEqual([0, 1, 0])
  })
})

describe('Near screw placement — compact raw image', () => {
  it('P21/c 2₁ Near keeps a compact −a image (not a far +c lattice hop)', () => {
    const d = getDemo(14)!
    const screw = d.operators.find((o) => o.classId === 'screw')!
    expect(Math.abs(screw.t[2]!)).toBeGreaterThan(0.2)
    const ax =
      d.screwAxes.find((s) => s.opIndex === screw.index && s.primary) ??
      d.screwAxes.find((s) => s.opIndex === screw.index)!
    // Axis ‖ b at z=¼; seed sits slightly −c of the axis so the screw center
    // reads toward +c relative to the base.
    expect(ax.origin[2]! - d.seed[2]!).toBeGreaterThan(0)
    expect(ax.origin[2]! - d.seed[2]!).toBeLessThan(0.1)
    expect(minScrewClearance(d.seed, d.screwAxes)).toBeGreaterThanOrEqual(0.24)

    const { points } = placedPositions(d, screw.index, 'nearest')
    const base = points.find((p) => p.index === 1)!
    const img = points.find((p) => p.index === screw.index)!
    const da = img.fractional[0]! - base.fractional[0]!
    const db = img.fractional[1]! - base.fractional[1]!
    const dc = img.fractional[2]! - base.fractional[2]!
    const raw = applyOperatorRaw(screw, base.fractional)

    // −a side of the box (not the right-side a≈¾ lattice copy).
    expect(da).toBeLessThan(0)
    expect(img.fractional[0]!).toBeLessThan(0.5)
    // Compact: no full-cell hop in c (the bug was Δc ≈ +0.88).
    expect(Math.abs(dc)).toBeLessThan(0.5)
    // Image still inside/near the cell in c (below the +c face), not z≳1.
    expect(img.fractional[2]!).toBeLessThan(0.9)
    expect(img.fractional[2]!).toBeGreaterThan(-0.1)
    expect(isCompactScrewImage(raw, img.fractional)).toBe(true)
    // Positive advance along ‖ b (teaching screw sense).
    expect(
      screwAdvanceAlongSense(base.fractional, img.fractional, ax.direction),
    ).toBeGreaterThan(0)
    expect(db).toBeGreaterThan(0)
  })

  it('P21/m 2₁ Near stays compact near the raw Seitz image (‖ b, no t_z)', () => {
    const d = getDemo(11)!
    const screw = d.operators.find((o) => o.classId === 'screw')!
    expect(screw).toBeTruthy()
    expect(Math.abs(screw!.t[2]!)).toBeLessThan(0.1)
    const ax =
      d.screwAxes.find((s) => s.opIndex === screw!.index && s.primary) ??
      d.screwAxes.find((s) => s.opIndex === screw!.index)!
    const { points } = placedPositions(d, screw!.index, 'nearest')
    const base = points.find((p) => p.index === 1)!
    const img = points.find((p) => p.index === screw!.index)!
    const da = img.fractional[0]! - base.fractional[0]!
    const dc = img.fractional[2]! - base.fractional[2]!
    const raw = applyOperatorRaw(screw!, base.fractional)
    expect(Math.abs(dc)).toBeLessThan(0.55)
    // Prefer −a side (raw image), not a≈¾ across the cell.
    expect(da).toBeLessThan(0)
    expect(img.fractional[0]!).toBeLessThan(0.5)
    // At most a half-cell wrap from raw (e.g. z: −½ → +½).
    expect(screwImageShiftOk(raw, img.fractional)).toBe(true)
    expect(
      screwAdvanceAlongSense(base.fractional, img.fractional, ax.direction),
    ).toBeGreaterThan(0)
  })

  it('P212121 c-screw Near advances along +c without a wild lattice hop', () => {
    const d = getDemo(19)!
    const screw = d.operators.find(
      (o) => o.classId === 'screw' && Math.abs(o.t[2]!) > 0.2,
    )!
    const { points } = placedPositions(d, screw.index, 'nearest')
    const base = points.find((p) => p.index === 1)!
    const img = points.find((p) => p.index === screw.index)!
    const dc = img.fractional[2]! - base.fractional[2]!
    expect(dc).toBeGreaterThan(0)
    expect(Math.abs(dc)).toBeLessThan(1.05)
  })
})

/** Allow a single unit wrap per axis from the raw Seitz image. */
function screwImageShiftOk(raw: [number, number, number], image: [number, number, number]) {
  for (let i = 0; i < 3; i++) {
    if (Math.abs(image[i]! - raw[i]!) > 1 + 1e-9) return false
  }
  return true
}
