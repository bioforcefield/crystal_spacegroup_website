import { describe, expect, it } from 'vitest'
import { cartToFrac, fracToCart } from '../../math'
import type { CellParams, Vec3 } from '../../types'

function roundTrip(cell: CellParams, frac: Vec3, digits = 9) {
  const cart = fracToCart(frac, cell)
  const back = cartToFrac(cart, cell)
  for (let i = 0; i < 3; i++) {
    expect(back[i]).toBeCloseTo(frac[i], digits)
  }
  expect(cart.every((v) => Number.isFinite(v))).toBe(true)
}

describe('fracToCart / cartToFrac teaching cells', () => {
  it('orthogonal cell is diagonal', () => {
    const cell: CellParams = { a: 2, b: 3, c: 4 }
    expect(fracToCart([1, 0, 0], cell)).toEqual([2, 0, 0])
    expect(fracToCart([0, 1, 0], cell)).toEqual([0, 3, 0])
    expect(fracToCart([0, 0, 1], cell)).toEqual([0, 0, 4])
    roundTrip(cell, [0.2, 0.3, 0.4])
  })

  it('monoclinic unique-b β recovers classic parallelogram', () => {
    const cell: CellParams = { a: 1, b: 1.15, c: 1.35, betaDeg: 110 }
    const beta = (110 * Math.PI) / 180
    const p = fracToCart([0, 0, 1], cell)
    expect(p[0]).toBeCloseTo(1.35 * Math.cos(beta), 9)
    expect(p[1]).toBeCloseTo(0, 9)
    expect(p[2]).toBeCloseTo(1.35 * Math.sin(beta), 9)
    const aAxis = fracToCart([1, 0, 0], cell)
    expect(aAxis).toEqual([1, 0, 0])
    roundTrip(cell, [0.18, 0.22, 0.31])
    roundTrip(cell, [0.5, 0.25, 0.75])
  })

  it('hexagonal γ=120° places b at 120° in the ab plane', () => {
    const cell: CellParams = { a: 1, b: 1, c: 1.5, gammaDeg: 120 }
    const b = fracToCart([0, 1, 0], cell)
    expect(b[0]).toBeCloseTo(-0.5, 9)
    expect(b[1]).toBeCloseTo(Math.sqrt(3) / 2, 9)
    expect(b[2]).toBeCloseTo(0, 9)
    const c = fracToCart([0, 0, 1], cell)
    expect(c[0]).toBeCloseTo(0, 9)
    expect(c[1]).toBeCloseTo(0, 9)
    expect(c[2]).toBeCloseTo(1.5, 9)
    const a = fracToCart([1, 0, 0], cell)
    expect(a).toEqual([1, 0, 0])
    // |a|=|b|, angle 120°
    const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    expect(dot).toBeCloseTo(-0.5, 9)
    roundTrip(cell, [0.17, 0.23, 0.31])
    roundTrip(cell, [2 / 3, 1 / 3, 1 / 3])
    roundTrip(cell, [0.5, 0.5, 0.5])
  })

  it('β and γ together still round-trip (α = 90°)', () => {
    const cell: CellParams = {
      a: 1.1,
      b: 1.2,
      c: 1.3,
      betaDeg: 100,
      gammaDeg: 120,
    }
    roundTrip(cell, [0.11, 0.22, 0.33])
    roundTrip(cell, [0, 0, 0])
    roundTrip(cell, [1, 1, 1])
  })

  it('triclinic α ≠ 90° skews c out of the xz plane', () => {
    const cell: CellParams = {
      a: 1,
      b: 1.15,
      c: 1.35,
      alphaDeg: 75,
      betaDeg: 85,
      gammaDeg: 100,
    }
    const cAxis = fracToCart([0, 0, 1], cell)
    // With α ≠ 90, cy = (cosα − cosβ cosγ)/sinγ is nonzero → c has a y component
    expect(Math.abs(cAxis[1])).toBeGreaterThan(0.05)
    expect(cAxis[2]).toBeGreaterThan(0.5)
    roundTrip(cell, [0.17, 0.23, 0.31])
    roundTrip(cell, [0.5, 0.5, 0.5])
    roundTrip(cell, [0, 0, 0])
  })

  it('α = 90° reduces to prior monoclinic/hex formulas', () => {
    const mono: CellParams = { a: 1, b: 1.15, c: 1.35, betaDeg: 110 }
    const beta = (110 * Math.PI) / 180
    const p = fracToCart([0, 0, 1], mono)
    expect(p[0]).toBeCloseTo(1.35 * Math.cos(beta), 9)
    expect(p[1]).toBeCloseTo(0, 9)
    expect(p[2]).toBeCloseTo(1.35 * Math.sin(beta), 9)
  })
})
