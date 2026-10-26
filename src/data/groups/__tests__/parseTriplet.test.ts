import { describe, expect, it } from 'vitest'
import { OPERATORS as P21C_OPS } from '../../p21c'
import { OPERATORS as C2C_OPS } from '../../c2c'
import { matClose, tCloseMod1 } from '../composeOps'
import { parseTriplet } from '../parseTriplet'

function expectMatchesOp(
  triplet: string,
  R: (typeof P21C_OPS)[0]['R'],
  t: (typeof P21C_OPS)[0]['t'],
) {
  const parsed = parseTriplet(triplet)
  expect(matClose(parsed.R, R)).toBe(true)
  expect(tCloseMod1(parsed.t, t)).toBe(true)
}

describe('parseTriplet', () => {
  it('parses P21/c unicode triplets to existing R|t', () => {
    for (const op of P21C_OPS) {
      expectMatchesOp(op.triplet, op.R, op.t)
    }
  })

  it('parses C2/c unicode triplets to existing R|t', () => {
    for (const op of C2C_OPS) {
      expectMatchesOp(op.triplet, op.R, op.t)
    }
  })

  it('accepts ASCII minus and slash fractions', () => {
    const a = parseTriplet('-x,y+1/2,-z+1/2')
    const b = parseTriplet('−x, y+½, −z+½')
    expect(matClose(a.R, b.R)).toBe(true)
    expect(tCloseMod1(a.t, b.t)).toBe(true)
    expect(a.R).toEqual([
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ])
    expect(tCloseMod1(a.t, [0, 0.5, 0.5])).toBe(true)
  })

  it('parses quarters', () => {
    const p = parseTriplet('x+1/4, -y+3/4, z+1/2')
    expect(p.R).toEqual([
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ])
    expect(tCloseMod1(p.t, [0.25, 0.75, 0.5])).toBe(true)
  })
})
