import { describe, expect, it } from 'vitest'
import { OPERATORS as P21C_OPS } from '../../p21c'
import {
  composeOps,
  isIdentitySeitz,
  reduceT,
  seitzEqual,
} from '../composeOps'
import { buildOperatorsFromTriplets } from '../buildOperators'
import { getItaRecord } from '../../generatedDemo'

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

describe('classify det/trace', () => {
  it('does not fall back to heuristic c-glide / screw labels', () => {
    // Fm-3m-like fragments: 4-fold, mirror, body-diagonal 3-fold
    const built = buildOperatorsFromTriplets([
      'x,y,z',
      '-y,x,z',
      'x,-y,z',
      'z,x,y',
      '-x,-y,-z',
      '-x,y,z',
    ])
    expect(built.some((o) => o.label.includes('heuristic'))).toBe(false)
    expect(built[1]!.classId).toBe('fourfold')
    expect(built[2]!.classId).toBe('mirror')
    expect(built[3]!.classId).toBe('threefold')
    expect(built[4]!.classId).toBe('inversion')
    expect(built[5]!.classId).toBe('mirror')
  })

  it('labels orthorhombic 2₁ and a-glide without heuristic', () => {
    const built = buildOperatorsFromTriplets([
      'x,y,z',
      '-x+1/2,-y,z+1/2',
      'x+1/2,-y+1/2,-z',
      '-x,y+1/2,-z+1/2',
    ])
    // Pbca-like first four proper/improper — none heuristic
    expect(built.every((o) => !o.label.includes('heuristic'))).toBe(true)
    expect(built[1]!.classId).toBe('screw')
    expect(built[1]!.label).toMatch(/2₁/)
  })
})


describe('classify coverage across ITA', () => {
  it('no heuristic labels across all 230', () => {
    let heur = 0
    let total = 0
    for (let n = 1; n <= 230; n++) {
      const rec = getItaRecord(n)
      expect(rec).toBeDefined()
      const built = buildOperatorsFromTriplets(rec!.triplets)
      total += built.length
      heur += built.filter((o) => o.label.includes('heuristic')).length
    }
    expect(heur).toBe(0)
    expect(total).toBeGreaterThan(1000)
  })
})
