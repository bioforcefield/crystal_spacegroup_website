import { describe, expect, it } from 'vitest'
import { planeNormalCart, wulffPolyhedron3D } from '../wulff3d'

describe('planeNormalCart', () => {
  it('gives axis normals for cubic (100)/(010)/(001)', () => {
    const cell = { a: 5, b: 5, c: 5 }
    const n100 = planeNormalCart(cell, 1, 0, 0)
    expect(Math.abs(n100[0])).toBeCloseTo(1, 5)
    expect(Math.abs(n100[1])).toBeLessThan(1e-6)
  })
})

describe('wulffPolyhedron3D', () => {
  it('builds a closed cube from six {100} faces', () => {
    const faces = [
      { label: '{100}', nx: 1, ny: 0, nz: 0, rate: 1 },
      { label: '{100}', nx: -1, ny: 0, nz: 0, rate: 1 },
      { label: '{010}', nx: 0, ny: 1, nz: 0, rate: 1 },
      { label: '{010}', nx: 0, ny: -1, nz: 0, rate: 1 },
      { label: '{001}', nx: 0, ny: 0, nz: 1, rate: 1 },
      { label: '{001}', nx: 0, ny: 0, nz: -1, rate: 1 },
    ]
    const r = wulffPolyhedron3D(faces)
    expect(r.vertices.length).toBe(8)
    expect(r.edges.length).toBeGreaterThanOrEqual(12)
    expect(r.triangles.length).toBeGreaterThan(0)
  })
})
