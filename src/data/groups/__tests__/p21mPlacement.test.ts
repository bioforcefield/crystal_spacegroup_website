/**
 * SG 11 · P21/m — operators must match ITA unique-axis-b general positions,
 * and the teaching AU must not collapse onto the mirror at y = ¼.
 */
import { describe, expect, it } from 'vitest'
import itaJson from '../../itaSpaceGroups.json'
import { getDemo } from '../../registry'
import { OPERATORS, SEED, CELL, META, p21mDemo } from '../../p21m'
import {
  applyOperator,
  fracToCart,
  wrap01,
} from '../../math'
import { parseTriplet } from '../parseTriplet'
import { checkClosure } from '../closure'
import type { Vec3 } from '../../types'

const ITA_SG11 = (
  itaJson as {
    groups: { number: number; triplets: string[]; multiplicity: number; hm: string }[]
  }
).groups.find((g) => g.number === 11)!

/** Motif arms span ~0.15 cell units; centres closer than this read as overlaps. */
const MIN_MOTIF_SEPARATION = 0.3

function cartDist(a: Vec3, b: Vec3): number {
  const ca = fracToCart(a, CELL)
  const cb = fracToCart(b, CELL)
  const dx = ca[0] - cb[0]
  const dy = ca[1] - cb[1]
  const dz = ca[2] - cb[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function minPairwiseCart(seed: Vec3): number {
  const pts = OPERATORS.map((op) => applyOperator(op, seed))
  let min = Infinity
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      min = Math.min(min, cartDist(pts[i]!, pts[j]!))
    }
  }
  return min
}

describe('SG 11 · P21/m teaching cell', () => {
  it('registry resolves number 11 / p21m as P21/m', () => {
    expect(getDemo(11)?.meta.hm).toBe('P21/m')
    expect(getDemo('p21m')?.meta.number).toBe(11)
    expect(META.number).toBe(11)
    expect(META.hm).toBe('P21/m')
    expect(META.multiplicity).toBe(4)
    expect(p21mDemo.operators).toHaveLength(4)
  })

  it('operators match ITA unique-axis-b triplets (P 1 21/m 1)', () => {
    expect(ITA_SG11.hm).toMatch(/P.?1.?21\/m.?1|P21\/m/i)
    expect(ITA_SG11.multiplicity).toBe(4)
    expect(ITA_SG11.triplets).toHaveLength(4)

    const expected = [
      'x,y,z',
      '-x,y+1/2,-z',
      '-x,-y,-z',
      'x,-y+1/2,z',
    ]
    for (let i = 0; i < 4; i++) {
      const ita = parseTriplet(ITA_SG11.triplets[i]!)
      const demo = OPERATORS[i]!
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          expect(demo.R[r]![c]).toBeCloseTo(ita.R[r]![c]!, 9)
        }
        expect(demo.t[r]).toBeCloseTo(ita.t[r]!, 9)
      }
      // Hand demo triplets use unicode fractions; matrices/t must match ITA ASCII.
      const hand = parseTriplet(demo.triplet)
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          expect(hand.R[r]![c]).toBeCloseTo(ita.R[r]![c]!, 9)
        }
        expect(hand.t[r]).toBeCloseTo(ita.t[r]!, 9)
      }
    }

    expect(OPERATORS[1]!.classId).toBe('screw')
    expect(OPERATORS[2]!.classId).toBe('inversion')
    expect(OPERATORS[3]!.classId).toBe('mirror')
    // Mirror t = (0, ½, 0) → plane at y = ¼ (no glide component).
    expect(OPERATORS[3]!.t[0]).toBeCloseTo(0, 9)
    expect(OPERATORS[3]!.t[1]).toBeCloseTo(0.5, 9)
    expect(OPERATORS[3]!.t[2]).toBeCloseTo(0, 9)
    // 2₁ ‖ b: t = (0, ½, 0) — not the P21/c (0, ½, ½).
    expect(OPERATORS[1]!.t).toEqual([0, 0.5, 0])
  })

  it('operator set is closed under composition', () => {
    const result = checkClosure(OPERATORS)
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('teaching seed is a general position (4 distinct wrapped images)', () => {
    const keys = new Set(
      OPERATORS.map((op) =>
        applyOperator(op, SEED)
          .map((c) => wrap01(c).toFixed(8))
          .join(','),
      ),
    )
    expect(keys.size).toBe(4)
    // Explicitly off the mirror plane y = ¼ / ¾.
    expect(Math.abs(SEED[1] - 0.25)).toBeGreaterThan(0.1)
    expect(Math.abs(SEED[1] - 0.75)).toBeGreaterThan(0.1)
  })

  it('expanded AU motifs have no near-coincident overlaps', () => {
    const minD = minPairwiseCart(SEED)
    expect(minD).toBeGreaterThan(MIN_MOTIF_SEPARATION)

    // Regression: the old P21/c-shared seed collapses onto the mirror.
    const badSeed: Vec3 = [0.18, 0.22, 0.31]
    expect(minPairwiseCart(badSeed)).toBeLessThan(0.12)
  })

  it('identity↔mirror separation equals 2·|y_seed − ¼|·b (true mirror, no glide)', () => {
    const id = applyOperator(OPERATORS[0]!, SEED)
    const mir = applyOperator(OPERATORS[3]!, SEED)
    expect(id[0]).toBeCloseTo(mir[0]!, 9)
    expect(id[2]).toBeCloseTo(mir[2]!, 9)
    const dy = Math.abs(id[1]! - mir[1]!)
    expect(dy).toBeCloseTo(2 * Math.abs(SEED[1] - 0.25), 9)
    expect(dy * CELL.b).toBeGreaterThan(MIN_MOTIF_SEPARATION)
  })
})
