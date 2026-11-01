import { describe, expect, it } from 'vitest'
import { applySuperposition, jacobiEigen, kabsch, superpose } from '../kabsch'
import { lsFit } from '../analysis/geom'
import type { Vec3 } from '../../types'

const P: Vec3[] = [[0, 0, 0], [1.5, 0, 0], [1.5, 1.2, 0], [0.3, 2, 0.8], [-1, 0.4, 1.1]]
const rotZ = (t: number) => (p: Vec3): Vec3 => [Math.cos(t) * p[0] - Math.sin(t) * p[1] + 2, Math.sin(t) * p[0] + Math.cos(t) * p[1] - 1, p[2] + 0.5]
const Q = P.map(rotZ(0.7))

describe('single superposition solver', () => {
  it('kabsch and analysis lsFit give the same transform', () => {
    const k = kabsch(P, Q), f = lsFit(P, Q)
    expect(k.rmsd).toBeLessThan(1e-9)
    expect(f.rmsd).toBeLessThan(1e-9)
    for (const p of P) {
      const a = applySuperposition(k, p)
      const b = [0, 1, 2].map((i) => f.R[i]![0]! * p[0] + f.R[i]![1]! * p[1] + f.R[i]![2]! * p[2] + f.t[i]!)
      a.forEach((v, i) => expect(v).toBeCloseTo(b[i]!, 9))
    }
  })
  it('kabsch requires ≥ 3 pairs, superpose does not', () => {
    expect(() => kabsch(P.slice(0, 2), Q.slice(0, 2))).toThrow(/at least 3/)
    expect(superpose(P.slice(0, 2), Q.slice(0, 2)).n).toBe(2)
  })
  it('jacobiEigen diagonalises a symmetric matrix', () => {
    const { values } = jacobiEigen([[2, 1], [1, 2]])
    expect([...values].sort()).toEqual([expect.closeTo(1, 9), expect.closeTo(3, 9)])
  })
})
