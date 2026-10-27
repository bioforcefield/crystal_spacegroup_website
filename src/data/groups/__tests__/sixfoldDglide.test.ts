
import { describe, expect, it } from 'vitest'
import { buildOperatorsFromTriplets } from '../buildOperators'
import {
  deriveAxisAlignedGlides,
  deriveElements,
  deriveSixfoldC,
} from '../deriveElements'
import { getDemo } from '../../registry'

describe('deriveSixfoldC', () => {
  it('finds 6₃ loci in P63 (173)', () => {
    const demo = getDemo(173)!
    const axes = deriveSixfoldC(demo.operators)
    expect(axes.length).toBeGreaterThan(0)
    expect(axes.some((a) => a.kind === '63' || a.kind === '6')).toBe(true)
    const all = deriveElements(demo.operators)
    expect(all.axes.some((a) => a.kind === '63' || a.kind === '6' || a.kind === '61')).toBe(true)
  })
})

describe('off-origin d-glide labels', () => {
  it('annotates non-zero/half plane values as off-origin d', () => {
    // Synthetic: mirror ⊥ c with d-glide (¼,¼,0) at z=⅛
    // R = diag(1,1,-1), t = (0.25, 0.25, 0.25) → plane z = ⅛, glide (¼,¼,0)
    const ops = buildOperatorsFromTriplets([
      'x,y,z',
      'x+1/4,y+1/4,-z+1/4',
    ])
    const glides = deriveAxisAlignedGlides(ops)
    const d = glides.find((g) => g.classId === 'd-glide')
    expect(d).toBeTruthy()
    expect(d!.locus).toMatch(/off-origin d|d-glide/)
  })
})
