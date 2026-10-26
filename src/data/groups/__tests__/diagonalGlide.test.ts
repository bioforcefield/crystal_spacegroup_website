
import { describe, expect, it } from 'vitest'
import { projectGlide, buildProjections } from '../../diagram2d'
import type { GlidePlaneSpec } from '../../types'

describe('diagonal glide overlays', () => {
  const cell = { a: 1, b: 1, c: 1.5, gammaDeg: 120 }
  const proj = buildProjections(cell).c

  it('projects corner-defined vertical c-glide as a UV trace', () => {
    const plane: GlidePlaneSpec = {
      corners: [
        [0, 0, 0],
        [1, -1, 0],
        [1, -1, 1],
        [0, 0, 1],
      ],
      glide: [0, 0, 0.5],
      label: 'c-glide',
      classId: 'c-glide',
      opIndex: 10,
      primary: true,
      locus: 'x = −y',
    }
    const g = projectGlide(plane, proj)
    expect(g.mode).toBe('trace')
    expect(Math.hypot(g.u2 - g.u, g.v2 - g.v)).toBeGreaterThan(0.5)
    expect(g.glideOutOfPlane).toBe(true)
  })

  it('keeps axis-aligned planes working', () => {
    const plane: GlidePlaneSpec = {
      planeValue: 0.25,
      normalAxis: 1,
      glide: [0, 0, 0.5],
      label: 'c-glide',
      classId: 'c-glide',
      opIndex: 2,
      primary: true,
      locus: 'y = ¼',
    }
    const g = projectGlide(plane, proj)
    expect(g.mode).toBe('trace')
    expect(g.v).toBe(0.25)
    expect(g.v2).toBe(0.25)
  })
})
