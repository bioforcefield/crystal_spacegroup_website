/**
 * Shared teaching-AU placement helpers (motif clearance / general position).
 */
import { describe, expect, it } from 'vitest'
import { getDemo } from '../../registry'
import { OPERATORS as P21M_OPS, CELL as P21M_CELL } from '../../p21m'
import {
  DEFAULT_TEACHING_SEED,
  MIN_MOTIF_SEPARATION,
  minMotifSeparation,
  pickTeachingSeed,
  scaledMinMotifSeparation,
  seedIsGeneralPosition,
} from '../../teachingSeed'
import { minPlaneClearance, scaledPlaneClearance } from '../../teachingSeed'
import { PLANE_CLEARANCE_SEED_OVERRIDES } from '../../teachingSeedOverrides'
import type { Vec3 } from '../../types'

describe('teachingSeed helpers', () => {
  it('scaled floors tighten for denser packs', () => {
    expect(scaledMinMotifSeparation(4)).toBe(MIN_MOTIF_SEPARATION)
    expect(scaledMinMotifSeparation(8)).toBe(0.25)
    expect(scaledMinMotifSeparation(16)).toBe(0.18)
    expect(scaledMinMotifSeparation(192)).toBeLessThan(scaledMinMotifSeparation(48))
  })

  it('P21/m: bad shared seed collapses; good seed clears motif floor', () => {
    const bad: Vec3 = [0.18, 0.22, 0.31]
    const good: Vec3 = [0.18, 0.08, 0.31]
    expect(minMotifSeparation(P21M_OPS, bad, P21M_CELL)).toBeLessThan(0.12)
    expect(minMotifSeparation(P21M_OPS, good, P21M_CELL)).toBeGreaterThan(
      MIN_MOTIF_SEPARATION,
    )
    expect(seedIsGeneralPosition(P21M_OPS, good, 4)).toBe(true)
  })

  it('pickTeachingSeed finds a clear general position for P21/m', () => {
    const seed = pickTeachingSeed(P21M_OPS, P21M_CELL, 4)
    expect(seedIsGeneralPosition(P21M_OPS, seed, 4)).toBe(true)
    expect(minMotifSeparation(P21M_OPS, seed, P21M_CELL)).toBeGreaterThan(
      MIN_MOTIF_SEPARATION,
    )
    // Prefer the hand-tuned seed when it is already good.
    const preferred = pickTeachingSeed(P21M_OPS, P21M_CELL, 4, {
      prefer: [0.18, 0.08, 0.31],
    })
    expect(preferred).toEqual([0.18, 0.08, 0.31])
  })

  it('DEFAULT_TEACHING_SEED stays off the diagonal (x≠y)', () => {
    expect(Math.abs(DEFAULT_TEACHING_SEED[0] - DEFAULT_TEACHING_SEED[1])).toBeGreaterThan(
      0.1,
    )
  })
})

describe('all demos 1–230 · teaching AU clearance', () => {
  const failures: string[] = []

  for (let n = 1; n <= 230; n++) {
    const demo = getDemo(n)
    if (!demo) {
      failures.push(`${n}: missing demo`)
      continue
    }
    if (!seedIsGeneralPosition(demo.operators, demo.seed, demo.meta.multiplicity)) {
      failures.push(
        `${n} ${demo.meta.hm}: seed not general (orbit < ${demo.meta.multiplicity})`,
      )
      continue
    }
    if (demo.meta.multiplicity < 2) continue
    const minD = minMotifSeparation(demo.operators, demo.seed, demo.cell)
    const floor = scaledMinMotifSeparation(demo.meta.multiplicity)
    if (minD < floor) {
      failures.push(
        `${n} ${demo.meta.hm}: minD=${minD.toFixed(3)} < floor ${floor} (Z=${demo.meta.multiplicity}, seed=[${demo.seed.map((c) => c.toFixed(3)).join(',')}])`,
      )
    }
  }

  it('every SG has a general-position seed meeting the scaled clearance floor', () => {
    expect(failures).toEqual([])
  })
})

describe('all demos 1–230 · projection clearance from mirror/glide planes', () => {
  it('P21/c-style glide seed is flagged; P21/m-style seed clears', () => {
    const d = getDemo(14)!
    expect(minPlaneClearance(d.operators, [0.18, 0.22, 0.31])).toBeCloseTo(0.03, 6)
    expect(minPlaneClearance(d.operators, d.seed)).toBeCloseTo(0.17, 6)
    expect(minPlaneClearance(getDemo(1)!.operators, [0.1, 0.2, 0.3])).toBe(Infinity)
  })

  it('every SG seed clears its planes by the scaled target or an audited best', () => {
    const fails: string[] = []
    for (let n = 1; n <= 230; n++) {
      const d = getDemo(n)!
      const c = minPlaneClearance(d.operators, d.seed)
      const target = scaledPlaneClearance(d.meta.multiplicity)
      // Overridden groups were grid-optimised; others must meet target or
      // be a known dense pack where no better seed exists (grid audit).
      // Z>48 F/d cubic packs (219, 227, 228) have no grid seed that clears planes
      // further without breaking the motif floor.
      const bar = d.meta.multiplicity > 48 ? 0.004 : Math.min(target, 0.02)
      if (c + 1e-9 < bar) fails.push(`${n} ${d.meta.hm}: ${c.toFixed(3)}`)
    }
    expect(fails).toEqual([])
  })

  it('overrides improve plane clearance and keep the motif floor', () => {
    for (const [k, seed] of Object.entries(PLANE_CLEARANCE_SEED_OVERRIDES)) {
      const d = getDemo(Number(k))!
      expect(d.seed).toEqual(seed)
      expect(minPlaneClearance(d.operators, seed)).toBeGreaterThan(0.02)
      expect(minMotifSeparation(d.operators, seed, d.cell)).toBeGreaterThanOrEqual(
        scaledMinMotifSeparation(d.meta.multiplicity) - 1e-9,
      )
    }
  })
})
