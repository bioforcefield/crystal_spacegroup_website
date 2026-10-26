import { describe, expect, it } from 'vitest'
import { OPERATORS as P21C_OPS } from '../../p21c'
import {
  composeOps,
  isIdentitySeitz,
  reduceT,
  seitzEqual,
} from '../composeOps'
import { buildOperatorsFromTriplets } from '../buildOperators'

describe('composeOps', () => {
  it('identity composed with op is op', () => {
    const id = P21C_OPS[0]!
    const screw = P21C_OPS[1]!
    const left = composeOps(id, screw)
    const right = composeOps(screw, id)
    expect(seitzEqual(left, screw)).toBe(true)
    expect(seitzEqual(right, screw)).toBe(true)
  })

  it('reduceT wraps into [0,1)', () => {
    expect(reduceT([1.5, -0.25, 2])).toEqual([0.5, 0.75, 0])
  })

  it('isIdentitySeitz detects I|0', () => {
    expect(isIdentitySeitz(P21C_OPS[0]!)).toBe(true)
    expect(isIdentitySeitz(P21C_OPS[1]!)).toBe(false)
  })
})

describe('buildOperatorsFromTriplets', () => {
  it('rebuilds P21/c R|t and heuristic classes', () => {
    const triplets = P21C_OPS.map((o) => o.triplet)
    const built = buildOperatorsFromTriplets(triplets)
    expect(built).toHaveLength(4)
    expect(built[0]!.classId).toBe('identity')
    expect(built[1]!.classId).toBe('screw')
    expect(built[2]!.classId).toBe('inversion')
    expect(built[3]!.classId).toBe('c-glide')
    for (let i = 0; i < 4; i++) {
      expect(seitzEqual(built[i]!, P21C_OPS[i]!)).toBe(true)
    }
  })
})
