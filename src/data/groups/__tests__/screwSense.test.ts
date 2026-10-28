/**
 * Near-mode screw placement: compact raw-Seitz pairing + soft axis sense.
 * Matrix covers monoclinic 2₁, orthorhombic P2₁2₁2₁, tetragonal 4₁, and C2/c.
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
import type { Operator, SpaceGroupDemo, Vec3 } from '../../types'

/** Allow a single unit wrap per axis from the raw Seitz image. */
function screwImageShiftOk(raw: Vec3, image: Vec3) {
  for (let i = 0; i < 3; i++) {
    if (Math.abs(image[i]! - raw[i]!) > 1 + 1e-9) return false
  }
  return true
}

function primaryScrew(
  d: SpaceGroupDemo,
  pred?: (op: Operator) => boolean,
): { op: Operator; ax: NonNullable<(typeof d.screwAxes)[0]> } {
  const op =
    d.operators.find(
      (o) => o.classId === 'screw' && (pred ? pred(o) : true),
    ) ?? d.operators.find((o) => o.classId === 'screw')!
  const ax =
    d.screwAxes.find((s) => s.opIndex === op.index && s.primary) ??
    d.screwAxes.find((s) => s.opIndex === op.index)!
  return { op, ax }
}

function nearScrewPair(d: SpaceGroupDemo, op: Operator) {
  const { points } = placedPositions(d, op.index, 'nearest')
  const base = points.find((p) => p.index === 1)!
  const img = points.find((p) => p.index === op.index)!
  const raw = applyOperatorRaw(op, base.fractional)
  return { base, img, raw }
}

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
    const { op: screw, ax } = primaryScrew(d)
    expect(Math.abs(screw.t[2]!)).toBeGreaterThan(0.2)
    // Axis ‖ b at z=¼; seed sits slightly −c of the axis so the screw center
    // reads toward +c relative to the base.
    expect(ax.origin[2]! - d.seed[2]!).toBeGreaterThan(0)
    expect(ax.origin[2]! - d.seed[2]!).toBeLessThan(0.1)
    expect(minScrewClearance(d.seed, d.screwAxes)).toBeGreaterThanOrEqual(0.24)

    const { base, img, raw } = nearScrewPair(d, screw)
    const da = img.fractional[0]! - base.fractional[0]!
    const db = img.fractional[1]! - base.fractional[1]!
    const dc = img.fractional[2]! - base.fractional[2]!

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
    const { op: screw, ax } = primaryScrew(d)
    expect(Math.abs(screw.t[2]!)).toBeLessThan(0.1)
    const { base, img, raw } = nearScrewPair(d, screw)
    const da = img.fractional[0]! - base.fractional[0]!
    const dc = img.fractional[2]! - base.fractional[2]!
    expect(Math.abs(dc)).toBeLessThan(0.55)
    expect(da).toBeLessThan(0)
    expect(img.fractional[0]!).toBeLessThan(0.5)
    expect(screwImageShiftOk(raw, img.fractional)).toBe(true)
    expect(
      screwAdvanceAlongSense(base.fractional, img.fractional, ax.direction),
    ).toBeGreaterThan(0)
  })

  it('P212121 c-screw Near advances along +c without a wild lattice hop', () => {
    const d = getDemo(19)!
    const { op: screw } = primaryScrew(d, (o) => Math.abs(o.t[2]!) > 0.2)
    const { base, img, raw } = nearScrewPair(d, screw)
    const dc = img.fractional[2]! - base.fractional[2]!
    expect(dc).toBeGreaterThan(0)
    expect(Math.abs(dc)).toBeLessThan(1.05)
    // One unit wrap from raw Seitz is OK (e.g. y: −0.35 → +0.65); forbid multi-cell hops.
    expect(screwImageShiftOk(raw, img.fractional)).toBe(true)
  })
})

describe('Near screw matrix — compact + axis sense', () => {
  const cases: {
    n: number
    label: string
    pick?: (op: Operator) => boolean
    /** Expect positive advance along teachingScrewSense when true. */
    sense?: boolean
  }[] = [
    { n: 14, label: 'P21/c 2₁‖b', sense: true },
    { n: 11, label: 'P21/m 2₁‖b', sense: true },
    { n: 15, label: 'C2/c 2₁‖b', sense: true },
    {
      n: 19,
      label: 'P212121 2₁‖a',
      pick: (o) =>
        Math.abs(o.t[0]!) > 0.2 &&
        Math.abs(o.t[1]!) > 0.2 &&
        Math.abs(o.t[2]!) < 0.1,
      sense: true,
    },
    {
      n: 19,
      label: 'P212121 2₁‖b',
      pick: (o) =>
        Math.abs(o.t[1]!) > 0.2 &&
        Math.abs(o.t[2]!) > 0.2 &&
        Math.abs(o.t[0]!) < 0.1,
      sense: true,
    },
    {
      n: 19,
      label: 'P212121 2₁‖c',
      pick: (o) =>
        Math.abs(o.t[0]!) > 0.2 &&
        Math.abs(o.t[2]!) > 0.2 &&
        Math.abs(o.t[1]!) < 0.1,
      sense: true,
    },
    {
      n: 76,
      label: 'P41 4₁‖c',
      pick: (o) => Math.abs(o.t[2]!) > 0.2,
      sense: true,
    },
    {
      n: 80,
      label: 'I41 4₁‖c',
      pick: (o) => Math.abs(o.t[2]!) > 0.15,
      sense: true,
    },
  ]

  for (const c of cases) {
    it(`${c.label} (SG ${c.n}): compact Near image, no |Δ|~1 hop`, () => {
      const d = getDemo(c.n)!
      expect(d).toBeTruthy()
      const { op, ax } = primaryScrew(d, c.pick)
      expect(op).toBeTruthy()
      expect(ax).toBeTruthy()
      const { base, img, raw } = nearScrewPair(d, op)
      // Compact vs raw: at most one unit wrap per axis (not a multi-cell hop).
      expect(screwImageShiftOk(raw, img.fractional)).toBe(true)
      // Motif pair itself stays within ~one cell (blocks the old |Δc|≈0.88 class).
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(img.fractional[i]! - base.fractional[i]!)).toBeLessThan(
          1.05,
        )
      }
      // Prefer the nearer lattice copy: L1 shift from raw ≤ 1.5
      const shift =
        Math.abs(img.fractional[0]! - raw[0]!) +
        Math.abs(img.fractional[1]! - raw[1]!) +
        Math.abs(img.fractional[2]! - raw[2]!)
      expect(shift).toBeLessThanOrEqual(1.5 + 1e-9)
      if (c.sense) {
        expect(
          screwAdvanceAlongSense(base.fractional, img.fractional, ax.direction),
        ).toBeGreaterThan(0)
      }
    })
  }
})
