import { describe, expect, it } from 'vitest'
import { CRITERIA, hbondAnglesOk, isPlanar, lateralOffset } from '../interactions'
import type { Vec3 } from '../../types'

describe('PLIP-aligned interaction criteria', () => {
  it('uses PLIP default distance thresholds', () => {
    expect(CRITERIA.hbondMax).toBe(4.1)
    expect(CRITERIA.saltMax).toBe(5.5)
    expect(CRITERIA.metalMax).toBe(3.0)
    expect(CRITERIA.piMax).toBe(5.5)
    expect(CRITERIA.piOffsetMax).toBe(2.0)
    expect(CRITERIA.cationPiMax).toBe(6.0)
  })
  it('rejects an H-bond when a heavy neighbour points at the partner', () => {
    const D: Vec3 = [0, 0, 0], A: Vec3 = [3, 0, 0]
    // linear C–D···A (180°) ok
    expect(hbondAnglesOk(D, [[-1.4, 0, 0]], A, [], 90)).toBe(true)
    // neighbour on the acceptor side (angle ~ 20°) fails
    expect(hbondAnglesOk(D, [[1.3, 0.5, 0]], A, [], 90)).toBe(false)
    // acceptor neighbour pointing back at donor fails
    expect(hbondAnglesOk(D, [], A, [[1.8, 0.3, 0]], 90)).toBe(false)
  })
  it('measures lateral ring offset and planarity', () => {
    expect(lateralOffset([0, 0, 0], [0, 0, 1], [1.5, 0, 3.5])).toBeCloseTo(1.5)
    const hex: Vec3[] = Array.from({ length: 6 }, (_, i) => [1.4 * Math.cos((i * Math.PI) / 3), 1.4 * Math.sin((i * Math.PI) / 3), 0])
    expect(isPlanar(hex, 0.15)).toBe(true)
    const chair: Vec3[] = hex.map((p, i) => [p[0], p[1], i % 2 ? 0.25 : -0.25])
    expect(isPlanar(chair, 0.15)).toBe(false)
  })
})
