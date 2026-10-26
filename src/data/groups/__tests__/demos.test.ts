import { describe, expect, it } from 'vitest'
import { allDemos, getDemo } from '../../registry'
import {
  applyOperator,
  cartToFrac,
  det3,
  fracToCart,
  wrap01,
} from '../../math'
import { checkClosure } from '../closure'
import {
  deriveElements,
  fracNear,
} from '../deriveElements'
import { OPERATORS as P21C_OPS } from '../../p21c'

describe('registry smoke', () => {
  it('resolves ready demos by number and slug', () => {
    expect(getDemo(2)?.meta.hm).toBe('P-1')
    expect(getDemo(14)?.meta.hm).toBe('P21/c')
    expect(getDemo(15)?.meta.hm).toBe('C2/c')
    expect(getDemo(61)?.meta.hm).toBe('Pbca')
    expect(getDemo('pbar1')?.meta.number).toBe(2)
    expect(getDemo('P-1')?.meta.number).toBe(2)
    expect(getDemo('p-1')?.meta.number).toBe(2)
    expect(getDemo('p21c')?.meta.number).toBe(14)
    expect(getDemo('P21/c')?.meta.number).toBe(14)
    expect(getDemo('c2c')?.meta.number).toBe(15)
    expect(getDemo('pbca')?.meta.number).toBe(61)
    // Do not map bare p1 → P-1 (reserved for future P1)
    expect(getDemo('p1')).toBeUndefined()
  })
})

describe('allDemos suite', () => {
  const demos = allDemos()

  it('has the four golden demos', () => {
    expect(demos.map((d) => d.meta.number).sort((a, b) => a - b)).toEqual([
      2, 14, 15, 61,
    ])
  })

  for (const demo of demos) {
    describe(`${demo.meta.number} · ${demo.meta.hm}`, () => {
      it('operators.length === meta.multiplicity', () => {
        expect(demo.operators.length).toBe(demo.meta.multiplicity)
      })

      it('|det3(R)| ≈ 1 for every operator', () => {
        for (const op of demo.operators) {
          expect(Math.abs(det3(op.R))).toBeCloseTo(1, 9)
        }
      })

      it('is closed under composition mod lattice', () => {
        const result = checkClosure(demo.operators)
        expect(result.hasIdentity).toBe(true)
        expect(result.errors).toEqual([])
        expect(result.ok).toBe(true)
      })

      it('seed yields multiplicity distinct wrapped images', () => {
        const keys = new Set<string>()
        for (const op of demo.operators) {
          const p = applyOperator(op, demo.seed)
          const key = p.map((c) => wrap01(c).toFixed(8)).join(',')
          keys.add(key)
        }
        expect(keys.size).toBe(demo.meta.multiplicity)
      })

      it('fracToCart / cartToFrac round-trip', () => {
        const samples = [demo.seed, [0, 0, 0] as const, [0.5, 0.25, 0.75] as const]
        for (const frac of samples) {
          const cart = fracToCart([...frac], demo.cell)
          const back = cartToFrac(cart, demo.cell)
          for (let i = 0; i < 3; i++) {
            expect(back[i]).toBeCloseTo(frac[i], 9)
          }
          expect(cart.every((v) => Number.isFinite(v))).toBe(true)
        }
      })
    })
  }
})

describe('deriveElements P21/c smoke', () => {
  it('finds inversion near origin and c-glide plane near y=¼', () => {
    const derived = deriveElements(P21C_OPS)
    const originInv = derived.inversions.find((c) =>
      fracNear(c.position[0], 0) &&
      fracNear(c.position[1], 0) &&
      fracNear(c.position[2], 0),
    )
    expect(originInv).toBeDefined()

    const glide = derived.glidesPerpB.find(
      (g) => g.classId === 'c-glide' && fracNear(g.planeValue, 0.25),
    )
    expect(glide).toBeDefined()
    expect(fracNear(glide!.glide[2], 0.5)).toBe(true)

    const screw = derived.axesB.find((a) => a.kind === '21')
    expect(screw).toBeDefined()
    expect(fracNear(screw!.origin[2], 0.25)).toBe(true)
  })
})
