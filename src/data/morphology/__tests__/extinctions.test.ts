import { describe, expect, it } from 'vitest'
import { buildOperatorsFromTriplets } from '../../groups'
import {
  isAllowedByOperators,
  reflectionGate,
  transformHkl,
} from '../extinctions'

describe('transformHkl', () => {
  it('maps 00l through 2₁-like R = diag(-1,-1,1) to itself', () => {
    const R: [[number, number, number], [number, number, number], [number, number, number]] = [
      [-1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ]
    expect(transformHkl(R, 0, 0, 2)).toEqual([0, 0, 2])
    expect(transformHkl(R, 1, 0, 0)).toEqual([-1, 0, 0])
  })
})

describe('isAllowedByOperators', () => {
  it('enforces 2₁ ‖ c: 00l extinct for odd l', () => {
    const ops = buildOperatorsFromTriplets(['x,y,z', '-x,-y,z+1/2'])
    expect(isAllowedByOperators(ops, 0, 0, 1)).toBe(false)
    expect(isAllowedByOperators(ops, 0, 0, 2)).toBe(true)
    expect(isAllowedByOperators(ops, 1, 0, 0)).toBe(true)
  })

  it('enforces c-glide ⊥ b (P21/c-like): h0l extinct for odd l', () => {
    // c-glide: x, -y, z+1/2
    const ops = buildOperatorsFromTriplets(['x,y,z', 'x,-y,z+1/2'])
    expect(isAllowedByOperators(ops, 1, 0, 1)).toBe(false)
    expect(isAllowedByOperators(ops, 1, 0, 2)).toBe(true)
    expect(isAllowedByOperators(ops, 0, 1, 1)).toBe(true)
  })

  it('allows all when operators missing', () => {
    expect(isAllowedByOperators(null, 0, 0, 1)).toBe(true)
    expect(isAllowedByOperators([], 0, 0, 1)).toBe(true)
  })
})

describe('reflectionGate', () => {
  it('centering-only without ops', () => {
    const g = reflectionGate('P 21/c', { a: 5, b: 5, c: 5 }, null)
    expect(g.mode).toBe('centering-only')
    expect(g.allowed(0, 0, 1)).toBe(true) // no screw without ops
  })

  it('centering+operators when ops present', () => {
    const ops = buildOperatorsFromTriplets(['x,y,z', '-x,-y,z+1/2'])
    const g = reflectionGate('P 21', { a: 5, b: 5, c: 5 }, ops)
    expect(g.mode).toBe('centering+operators')
    expect(g.allowed(0, 0, 1)).toBe(false)
  })

  it('F centering still blocks mixed parity', () => {
    const g = reflectionGate('F m -3 m', { a: 5, b: 5, c: 5 }, null)
    expect(g.allowed(1, 0, 0)).toBe(false)
    expect(g.allowed(1, 1, 1)).toBe(true)
  })
})
