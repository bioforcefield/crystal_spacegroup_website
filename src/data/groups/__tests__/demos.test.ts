import { describe, expect, it } from 'vitest'
import { allDemos, allHandDemos, getDemo } from '../../registry'
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
import { itaGroupCount } from '../../generatedDemo'

describe('registry smoke', () => {
  it('resolves hand demos by number and slug', () => {
    expect(getDemo(2)?.meta.hm).toBe('P-1')
    expect(getDemo(14)?.meta.hm).toBe('P21/c')
    expect(getDemo(15)?.meta.hm).toBe('C2/c')
    expect(getDemo(61)?.meta.hm).toBe('Pbca')
    expect(getDemo(19)?.meta.hm).toBe('P212121')
    expect(getDemo(33)?.meta.hm).toBe('Pna21')
    expect(getDemo(4)?.meta.hm).toBe('P21')
    expect(getDemo(9)?.meta.hm).toBe('Cc')
    expect(getDemo(148)?.meta.hm).toBe('R-3')
    expect(getDemo(7)?.meta.hm).toBe('Pc')
    expect(getDemo(11)?.meta.hm).toBe('P21/m')
    expect(getDemo(12)?.meta.hm).toBe('C2/m')
    expect(getDemo(13)?.meta.hm).toBe('P2/c')
    expect(getDemo(18)?.meta.hm).toBe('P21212')
    expect(getDemo(88)?.meta.hm).toBe('I41/a')
    expect(getDemo(56)?.meta.hm).toBe('Pccn')
    expect(getDemo(43)?.meta.hm).toBe('Fdd2')
    expect(getDemo(20)?.meta.hm).toBe('C2221')
    expect(getDemo(36)?.meta.hm).toBe('Cmc21')
    expect(getDemo(146)?.meta.hm).toBe('R3')
    expect(getDemo(82)?.meta.hm).toBe('I-4')
    expect(getDemo(64)?.meta.hm).toBe('Cmca')
    expect(getDemo(92)?.meta.hm).toBe('P41212')
    expect(getDemo(96)?.meta.hm).toBe('P43212')
    expect(getDemo(167)?.meta.hm).toBe('R-3c')
    expect(getDemo(76)?.meta.hm).toBe('P41')
    expect(getDemo(80)?.meta.hm).toBe('I41')
    expect(getDemo(227)?.meta.hm).toBe('Fd-3m')
    expect(getDemo(147)?.meta.hm).toBe('P-3')
    expect(getDemo('pbar1')?.meta.number).toBe(2)
    expect(getDemo('P-1')?.meta.number).toBe(2)
    expect(getDemo('p-1')?.meta.number).toBe(2)
    expect(getDemo('p21c')?.meta.number).toBe(14)
    expect(getDemo('P21/c')?.meta.number).toBe(14)
    expect(getDemo('c2c')?.meta.number).toBe(15)
    expect(getDemo('pbca')?.meta.number).toBe(61)
    expect(getDemo('p212121')?.meta.number).toBe(19)
    expect(getDemo('P212121')?.meta.number).toBe(19)
    expect(getDemo('pna21')?.meta.number).toBe(33)
    expect(getDemo('Pna21')?.meta.number).toBe(33)
    expect(getDemo('p21')?.meta.number).toBe(4)
    expect(getDemo('P21')?.meta.number).toBe(4)
    expect(getDemo('cc')?.meta.number).toBe(9)
    expect(getDemo('Cc')?.meta.number).toBe(9)
    expect(getDemo('rbar3')?.meta.number).toBe(148)
    expect(getDemo('R-3')?.meta.number).toBe(148)
    expect(getDemo('pc')?.meta.number).toBe(7)
    expect(getDemo('p21m')?.meta.number).toBe(11)
    expect(getDemo('c2m')?.meta.number).toBe(12)
    expect(getDemo('p2c')?.meta.number).toBe(13)
    expect(getDemo('p21212')?.meta.number).toBe(18)
  })

  it('resolves P1 as number 1 (not P-1)', () => {
    expect(getDemo('p1')?.meta.number).toBe(1)
    expect(getDemo('P1')?.meta.hm).toBe('P1')
    expect(getDemo(1)?.meta.hm).toBe('P1')
  })

  it('ITA JSON covers all 230 numbers', () => {
    expect(itaGroupCount()).toBe(230)
  })
})

describe('allDemos suite (hand-polished)', () => {
  const demos = allDemos()

  it('has the 34 golden demos', () => {
    expect(demos.map((d) => d.meta.number).sort((a, b) => a - b)).toEqual([
      1, 2, 4, 5, 7, 9, 11, 12, 13, 14, 15, 18, 19, 20, 29, 33, 36, 43, 56, 60, 61, 62, 64, 76, 80, 82, 88, 92, 96, 146, 147, 148, 167, 227,
    ])
    expect(allHandDemos()).toEqual(demos)
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

describe('generated catalog 1–230', () => {
  it('getDemo(n) defined with operators.length === multiplicity for every n', () => {
    const mismatches: string[] = []
    for (let n = 1; n <= 230; n++) {
      const demo = getDemo(n)
      if (!demo) {
        mismatches.push(`${n}: missing`)
        continue
      }
      if (demo.operators.length !== demo.meta.multiplicity) {
        mismatches.push(
          `${n} ${demo.meta.hm}: ops=${demo.operators.length} mult=${demo.meta.multiplicity}`,
        )
      }
    }
    expect(mismatches).toEqual([])
  })

  it('|det3(R)| ≈ 1 for every operator across all 230', () => {
    const bad: string[] = []
    for (let n = 1; n <= 230; n++) {
      const demo = getDemo(n)!
      for (const op of demo.operators) {
        if (Math.abs(Math.abs(det3(op.R)) - 1) > 1e-8) {
          bad.push(`${n} op ${op.index}`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('hand overrides win over generated for hand-polished set', () => {
    const handNums = [1, 2, 4, 5, 7, 9, 11, 12, 13, 14, 15, 18, 19, 20, 29, 33, 36, 43, 56, 60, 61, 62, 64, 76, 80, 82, 88, 92, 96, 146, 147, 148, 167, 227]
    for (const n of handNums) {
      expect(getDemo(n)!.meta.blurb.startsWith('ITA No.')).toBe(false)
    }
    expect(getDemo(1)).toBe(getDemo('p1'))
    expect(getDemo(2)).toBe(getDemo('pbar1'))
    expect(getDemo(4)).toBe(getDemo('p21'))
    expect(getDemo(5)).toBe(getDemo('c2'))
    expect(getDemo(9)).toBe(getDemo('cc'))
    expect(getDemo(19)).toBe(getDemo('p212121'))
    expect(getDemo(29)).toBe(getDemo('pca21'))
    expect(getDemo(33)).toBe(getDemo('pna21'))
    expect(getDemo(60)).toBe(getDemo('pbcn'))
    expect(getDemo(62)).toBe(getDemo('pnma'))
    expect(getDemo(14)?.meta.blurb).toMatch(/P21\/c/)
    expect(getDemo(1)!.operators.length).toBe(1)
    expect(getDemo(5)!.operators.length).toBe(4)
    expect(getDemo(5)!.screwAxes.length).toBe(4)
    expect(getDemo(62)!.operators.length).toBe(8)
    expect(getDemo(62)!.glidePlanes.length).toBe(6)
    expect(getDemo(60)!.operators.length).toBe(8)
    expect(getDemo(29)!.operators.length).toBe(4)
    expect(getDemo(19)!.screwAxes.length).toBe(6)
    expect(getDemo(148)!.operators.length).toBe(18)
    expect(getDemo(148)!.cell.gammaDeg).toBe(120)
    expect(getDemo(148)!.screwAxes.some((a) => a.kind === '3')).toBe(true)
    expect(getDemo(7)!.operators.length).toBe(2)
    expect(getDemo(11)!.operators.length).toBe(4)
    expect(getDemo(12)!.operators.length).toBe(8)
    expect(getDemo(13)!.operators.length).toBe(4)
    expect(getDemo(18)!.operators.length).toBe(4)
    expect(getDemo(88)!.operators.length).toBe(16)
    expect(getDemo(88)!.screwAxes.some((a) => a.kind === '41')).toBe(true)
    expect(getDemo(56)!.operators.length).toBe(8)
    expect(getDemo(43)!.glidePlanes.some((g) => g.classId === 'd-glide')).toBe(true)
    expect(getDemo(43)!.operators.length).toBe(16)
    expect(getDemo(20)!.operators.length).toBe(8)
    expect(getDemo(92)!.screwAxes.some((a) => a.kind === '41')).toBe(true)
    expect(getDemo(96)!.screwAxes.some((a) => a.kind === '43')).toBe(true)
    expect(getDemo(167)!.operators.length).toBe(36)
    expect(getDemo(167)!.cell.gammaDeg).toBe(120)
    expect(getDemo(167)!.glidePlanes.some((g) => !!g.corners)).toBe(true)
    expect(getDemo(76)!.screwAxes.some((a) => a.kind === '41')).toBe(true)
    expect(getDemo(80)!.operators.length).toBe(8)
    expect(getDemo(227)!.operators.length).toBe(192)
    expect(getDemo(227)!.operatorFocusIndices?.length).toBeGreaterThan(0)
    expect(getDemo(147)!.cell.gammaDeg).toBe(120)
  })
})

/** Stratified samples across systems (not every group — keep CI fast). */
const CLOSURE_SAMPLES = [1, 19, 33, 62, 75, 143, 168, 195, 225, 230]

describe('generated closure samples', () => {
  for (const n of CLOSURE_SAMPLES) {
    it(`ITA ${n} closed + full seed orbit`, () => {
      const demo = getDemo(n)!
      expect(demo).toBeDefined()
      const result = checkClosure(demo.operators)
      expect(result.ok).toBe(true)
      expect(result.errors).toEqual([])

      const keys = new Set<string>()
      for (const op of demo.operators) {
        const p = applyOperator(op, demo.seed)
        keys.add(p.map((c) => wrap01(c).toFixed(8)).join(','))
      }
      expect(keys.size).toBe(demo.meta.multiplicity)
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
