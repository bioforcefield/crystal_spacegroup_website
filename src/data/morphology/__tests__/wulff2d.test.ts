import { describe, expect, it } from 'vitest'
import {
  activeFaceLabels,
  teachingFaces2D,
  wulffPolygon2D,
} from '../wulff2d'
import { classifyHabit, HABIT_PRESETS } from '../habit'

describe('wulffPolygon2D', () => {
  it('returns a square for equal Ra=Rb with distant diagonals', () => {
    const faces = teachingFaces2D(1, 1, 2)
    const r = wulffPolygon2D(faces)
    expect(r.vertices.length).toBeGreaterThanOrEqual(4)
    expect(r.aspect).toBeLessThan(1.05)
    expect(Math.abs(r.width - 2)).toBeLessThan(0.05)
    expect(Math.abs(r.height - 2)).toBeLessThan(0.05)
    const labels = activeFaceLabels(r)
    expect(labels).toContain('{100}')
    expect(labels).toContain('{010}')
    expect(labels).not.toContain('{110}')
  })

  it('expresses {110} when diagonal rate is low enough', () => {
    const faces = teachingFaces2D(1, 1, 0.9)
    const r = wulffPolygon2D(faces)
    expect(activeFaceLabels(r)).toContain('{110}')
    expect(r.vertices.length).toBeGreaterThanOrEqual(6)
  })

  it('elongates when Rb >> Ra', () => {
    const faces = teachingFaces2D(1, 4, 5)
    const r = wulffPolygon2D(faces)
    expect(r.height).toBeGreaterThan(r.width * 2)
    expect(r.aspect).toBeGreaterThan(2)
  })

  it('returns empty for fewer than 3 valid faces', () => {
    const r = wulffPolygon2D([
      { label: 'a', nx: 1, ny: 0, rate: 1 },
      { label: 'b', nx: -1, ny: 0, rate: 1 },
    ])
    expect(r.vertices).toHaveLength(0)
  })
})

describe('classifyHabit', () => {
  it('labels cube for isotropic square', () => {
    const h = classifyHabit({
      aspect: 1.02,
      hasDiagonalFaces: false,
      orthoRatio: 1,
    })
    expect(h.kind).toBe('cube')
  })

  it('labels octagon when diagonals cut', () => {
    const h = classifyHabit({
      aspect: 1.05,
      hasDiagonalFaces: true,
      orthoRatio: 1,
    })
    expect(h.kind).toBe('octagon')
  })

  it('labels needle for high aspect', () => {
    const h = classifyHabit({
      aspect: 5,
      hasDiagonalFaces: false,
      orthoRatio: 5,
    })
    expect(h.kind).toBe('needle')
  })

  it('presets stay finite and positive', () => {
    for (const p of HABIT_PRESETS) {
      expect(p.Ra).toBeGreaterThan(0)
      expect(p.Rb).toBeGreaterThan(0)
      expect(p.Rc).toBeGreaterThan(0)
      const r = wulffPolygon2D(teachingFaces2D(p.Ra, p.Rb, p.Rc))
      expect(r.vertices.length).toBeGreaterThanOrEqual(4)
    }
  })
})
