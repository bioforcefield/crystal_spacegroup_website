import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cellCenterCart, cellCornersCart } from '../../math'
import { expandStructure } from '../expandStructure'
import {
  CIF_ASPECT_MAX,
  CIF_ASPECT_MIN,
  CIF_MIN_CANVAS_PX,
  aspectForFit,
  clampFitAspect,
  computeCifViewBounds,
  fitDistanceForSphere,
  isUsableCanvasSize,
} from '../fitCamera'
import { parseCif } from '../parseCif'
import { placeCifStructure } from '../placement'
import { elementsDemoForStructure } from '../demoWithCifCell'

describe('fitDistanceForSphere', () => {
  it('frames a unit sphere inside fov 42 at aspect 1', () => {
    const d = fitDistanceForSphere(1, 42, 1)
    // Vertical half-angle sin(21°) ≈ 0.358; margin 1.12 → ≈ 3.12
    expect(d).toBeGreaterThan(2.5)
    expect(d).toBeLessThan(4)
  })

  it('pulls back on narrow aspect so horizontal FOV still fits', () => {
    const wide = fitDistanceForSphere(5, 42, 2)
    const narrow = fitDistanceForSphere(5, 42, 0.5)
    expect(narrow).toBeGreaterThan(wide)
  })

  it('does not explode on pathological first-paint aspects', () => {
    const sane = fitDistanceForSphere(12, 42, 1.6)
    const needle = fitDistanceForSphere(12, 42, 0.001)
    const ribbon = fitDistanceForSphere(12, 42, 1000)
    // Clamped aspects stay within a small factor of a normal desktop fit
    expect(needle / sane).toBeLessThan(3)
    expect(ribbon / sane).toBeLessThan(1.5)
    expect(needle).toBeLessThan(200)
  })
})

describe('canvas size / aspect gates', () => {
  it('rejects zero and sub-threshold canvases', () => {
    expect(isUsableCanvasSize(0, 0)).toBe(false)
    expect(isUsableCanvasSize(CIF_MIN_CANVAS_PX - 1, 800)).toBe(false)
    expect(isUsableCanvasSize(1200, CIF_MIN_CANVAS_PX - 1)).toBe(false)
    expect(isUsableCanvasSize(CIF_MIN_CANVAS_PX, CIF_MIN_CANVAS_PX)).toBe(true)
  })

  it('aspectForFit returns null until the canvas is usable (forces retry)', () => {
    expect(aspectForFit(0, 0, 1.5)).toBeNull()
    expect(aspectForFit(8, 900, 1.5)).toBeNull()
    expect(aspectForFit(1200, 800)).toBeCloseTo(1.5, 5)
  })

  it('clampFitAspect bounds extreme ratios', () => {
    expect(clampFitAspect(0.01)).toBe(CIF_ASPECT_MIN)
    expect(clampFitAspect(50)).toBe(CIF_ASPECT_MAX)
    expect(clampFitAspect(1.25)).toBe(1.25)
    expect(clampFitAspect(NaN)).toBe(1)
  })
})

describe('computeCifViewBounds', () => {
  it('returns a unit fallback for empty point lists', () => {
    const b = computeCifViewBounds([])
    expect(b.radius).toBeGreaterThanOrEqual(1)
    expect(b.center).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('frames COD 1100303 (Li) near the cell size — not a speck', () => {
    const text = readFileSync(
      resolve(__dirname, '../../../../public/samples/cod/1100303.cif'),
      'utf8',
    )
    const structure = expandStructure(parseCif(text))
    const demo = elementsDemoForStructure(structure)
    const center = cellCenterCart(structure.cell)
    const toCentered = (p: readonly [number, number, number] | number[]) =>
      [p[0]! - center[0], p[1]! - center[1], p[2]! - center[2]] as [
        number,
        number,
        number,
      ]

    const cellPts = cellCornersCart(structure.cell).map(toCentered)
    const cellOnly = computeCifViewBounds(cellPts)

    for (const mode of ['nearest', 'wrapped'] as const) {
      const placed = placeCifStructure(structure, mode, 1, demo ?? null)
      const pts = [
        ...cellPts,
        ...placed.positions.map(toCentered),
      ]
      const bounds = computeCifViewBounds(pts)
      // Must stay within ~2× the bare cell — otherwise first paint looks empty
      expect(bounds.radius).toBeLessThan(cellOnly.radius * 2.2)
      expect(bounds.radius).toBeGreaterThan(cellOnly.radius * 0.9)

      const dist = fitDistanceForSphere(bounds.radius, 42, 1.6)
      expect(dist).toBeGreaterThan(20)
      expect(dist).toBeLessThan(120)
    }
  })
})
