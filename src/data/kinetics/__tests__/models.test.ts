import { describe, expect, it } from 'vitest'
import {
  criticalRadius,
  growthRate,
  inductionTime,
  nucleationBarrier,
  nucleationRate,
  seriesToPolyline,
  sigmaGrid,
  sizeVsTime,
  supersaturationFromS,
} from '../models'

describe('supersaturation & nucleation', () => {
  it('maps S to σ', () => {
    expect(supersaturationFromS(1.5)).toBeCloseTo(0.5)
    expect(supersaturationFromS(0.8)).toBe(0)
  })

  it('barrier falls as σ rises', () => {
    const lo = nucleationBarrier(0.2, 1)
    const hi = nucleationBarrier(0.8, 1)
    expect(hi).toBeLessThan(lo)
  })

  it('critical radius shrinks with σ', () => {
    expect(criticalRadius(0.5, 1)).toBeLessThan(criticalRadius(0.2, 1))
  })

  it('nucleation rate rises sharply with σ', () => {
    const a = nucleationRate(0.15, 1)
    const b = nucleationRate(0.6, 1)
    expect(b).toBeGreaterThan(a * 10)
  })

  it('induction time falls as rate rises', () => {
    const tLo = inductionTime(0.2, 1)
    const tHi = inductionTime(0.7, 1)
    expect(tHi).toBeLessThan(tLo)
  })
})

describe('growth mechanisms', () => {
  it('spiral ≈ σ²', () => {
    expect(growthRate(0.5, 'spiral')).toBeCloseTo(0.25)
    expect(growthRate(1, 'spiral')).toBeCloseTo(1)
  })

  it('rough is linear in σ', () => {
    expect(growthRate(0.4, 'rough')).toBeCloseTo(0.4)
  })

  it('birth-and-spread is near zero at tiny σ then rises', () => {
    const tiny = growthRate(0.05, 'birth')
    const mid = growthRate(0.5, 'birth')
    expect(mid).toBeGreaterThan(tiny)
  })
})

describe('sizeVsTime & plot helpers', () => {
  it('grows linearly', () => {
    expect(sizeVsTime(10, 0.2, 1)).toBeCloseTo(3)
  })

  it('sigmaGrid includes endpoints', () => {
    const g = sigmaGrid(1, 5)
    expect(g[0]).toBe(0)
    expect(g[g.length - 1]).toBe(1)
    expect(g).toHaveLength(5)
  })

  it('seriesToPolyline emits point pairs', () => {
    const s = seriesToPolyline(
      [0, 1],
      [0, 1],
      { x0: 0, y0: 0, x1: 100, y1: 50 },
      { xmin: 0, xmax: 1, ymin: 0, ymax: 1 },
    )
    expect(s).toContain('0.00,50.00')
    expect(s).toContain('100.00,0.00')
  })
})
