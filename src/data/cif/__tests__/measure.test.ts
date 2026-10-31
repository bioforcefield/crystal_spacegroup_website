import { describe, expect, it } from 'vitest'
import type { CellParams, Mat3, Vec3 } from '../../types'
import {
  angle,
  classifyOp,
  composeSeitz,
  dihedral,
  distance,
  drawnOp,
  invertSeitz,
  isIdentityOp,
  relatingOp,
  tripletOf,
  type SeitzOp,
} from '../measure'

/** Parse "x,y,z"-style triplet → Seitz op (test helper). */
function op(tr: string): SeitzOp {
  const R: Mat3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  const t: Vec3 = [0, 0, 0]
  tr.split(',').forEach((s, i) => {
    for (const m of s.replace(/\s/g, '').matchAll(/([+-]?)(\d+\/\d+|\d*\.?\d+)?(\*?[xyz])?/g)) {
      if (!m[0]) continue
      const sign = m[1] === '-' ? -1 : 1
      const num = m[2] ? (m[2].includes('/') ? Number(m[2].split('/')[0]) / Number(m[2].split('/')[1]) : Number(m[2])) : 1
      if (m[3]) R[i]![['x', 'y', 'z'].indexOf(m[3].replace('*', ''))] += sign * (m[2] ? num : 1)
      else t[i] += sign * num
    }
  })
  return { R, t }
}
const mono: CellParams = { a: 10, b: 12, c: 8, alphaDeg: 90, betaDeg: 105, gammaDeg: 90 } as CellParams
const hex: CellParams = { a: 7, b: 7, c: 9, alphaDeg: 90, betaDeg: 90, gammaDeg: 120 } as CellParams
const close = (a: number[] | null, b: number[]) => {
  expect(a).not.toBeNull()
  a!.forEach((v, i) => expect(v).toBeCloseTo(b[i]!, 6))
}

describe('measurements', () => {
  it('distance and angle', () => {
    expect(distance([0, 0, 0], [3, 4, 0])).toBeCloseTo(5, 9)
    expect(angle([1, 0, 0], [0, 0, 0], [0, 1, 0])).toBeCloseTo(90, 9)
    expect(angle([1, 0, 0], [0, 0, 0], [-1, 1e-9, 0])).toBeCloseTo(180, 5)
    expect(angle([1, 0, 0], [0, 0, 0], [0.5, Math.sqrt(3) / 2, 0])).toBeCloseTo(60, 9)
  })
  it('IUPAC signed dihedral', () => {
    const d = (deg: number) => {
      const r = (deg * Math.PI) / 180
      return dihedral([1, 0, 0], [0, 0, 0], [0, 0, 1], [Math.cos(r), Math.sin(r), 1])
    }
    expect(d(0)).toBeCloseTo(0, 9)
    expect(d(60)).toBeCloseTo(60, 9)
    expect(d(-60)).toBeCloseTo(-60, 9)
    expect(d(120)).toBeCloseTo(120, 9)
    expect(d(180)).toBeCloseTo(180, 9)
    // reversing the atom order keeps the sign
    expect(dihedral([0.5, 0.866, 1], [0, 0, 1], [0, 0, 0], [1, 0, 0])).toBeCloseTo(60, 2)
  })
})

describe('op composition', () => {
  it('inverse, composition and the A→B op', () => {
    const g = op('-x,y+1/2,-z+1/2')
    expect(isIdentityOp(composeSeitz(g, invertSeitz(g)))).toBe(true)
    const gA = op('-x,-y,-z')
    const gB = { ...op('x,-y+1/2,z+1/2') }
    const r = relatingOp(gA, gB) // gB · gA⁻¹ = (x,-y+1/2,z+1/2)(-x,-y,-z) = -x, y+1/2, -z+1/2
    expect(tripletOf(r)).toBe('-x,1/2+y,1/2-z')
    // mapping check on a point
    const p: Vec3 = [0.1, 0.2, 0.3]
    const apply = (s: SeitzOp, v: Vec3) => s.R.map((row, i) => row[0]! * v[0] + row[1]! * v[1] + row[2]! * v[2] + s.t[i]!)
    close(apply(r, apply(gA, p) as Vec3), apply(gB, p))
  })
  it('recovers the lattice translation of a drawn copy', () => {
    const g = op('-x,y+1/2,-z+1/2')
    const d = drawnOp(g.R, g.t, [0.1, 0.2, 0.3], [-0.1 + 1, 0.7, 0.2 - 1])
    close(d.t, [1, 0.5, -0.5])
  })
})

describe('classification + element location', () => {
  it('P2₁/c: inversion at 0,0,0', () => {
    const e = classifyOp(op('-x,-y,-z'), mono)
    expect(e.kind).toBe('inversion')
    close(e.point, [0, 0, 0])
    const e2 = classifyOp(op('-x+1,-y,-z+1'), mono)
    close(e2.point, [0.5, 0, 0.5])
  })
  it('P2₁/c: 2₁ along b at x=0, z=1/4', () => {
    const e = classifyOp(op('-x,y+1/2,-z+1/2'), mono)
    expect(e.kind).toBe('screw')
    expect(e.symbol).toBe('2₁')
    close(e.axis, [0, 1, 0])
    expect(e.point![0]).toBeCloseTo(0, 9)
    expect(e.point![2]).toBeCloseTo(0.25, 9)
    close(e.intrinsic, [0, 0.5, 0])
    expect(e.lines.join(' ')).toContain('0, y, 1/4')
  })
  it('P2₁/c: c-glide y=1/4 with glide (0,0,1/2)', () => {
    const e = classifyOp(op('x,-y+1/2,z+1/2'), mono)
    expect(e.kind).toBe('glide')
    expect(e.symbol).toBe('c')
    close(e.plane!.hkl, [0, 1, 0])
    expect(e.plane!.c).toBeCloseTo(0.25, 9)
    close(e.intrinsic, [0, 0, 0.5])
    expect(e.lines[0]).toContain('y = 1/4')
  })
  it('C2: 2-fold at x=0,z=0 and 2₁ at x=1/4,z=0', () => {
    const r = classifyOp(op('-x,y,-z'), mono)
    expect(r.kind).toBe('rotation')
    expect(r.symbol).toBe('2')
    close([r.point![0], r.point![2]], [0, 0])
    const s = classifyOp(op('-x+1/2,y+1/2,-z'), mono)
    expect(s.symbol).toBe('2₁')
    close([s.point![0], s.point![2]], [0.25, 0])
  })
  it('P-1 and identity / translation', () => {
    expect(classifyOp(op('-x,-y+1,-z'), mono).point).toEqual([0, 0.5, 0])
    expect(classifyOp(op('x,y,z'), mono).kind).toBe('identity')
    const t = classifyOp(op('x+1,y,z'), mono)
    expect(t.kind).toBe('translation')
    expect(t.lines[1]).toContain('10.000')
  })
  it('hexagonal 3₁ and 6₃ along c through the origin', () => {
    const a = classifyOp(op('-y,x-y,z+1/3'), hex)
    expect(a.symbol).toBe('3₁')
    close(a.axis, [0, 0, 1])
    close([a.point![0], a.point![1]], [0, 0])
    const b = classifyOp(op('x-y,x,z+1/2'), hex)
    expect(b.symbol).toBe('6₃')
    const c = classifyOp(op('-y,x-y,z+2/3'), hex)
    expect(c.symbol).toBe('3₂')
    // 3-fold off the origin: (−y+1, x−y, z) — fixed point (2/3, 1/3)
    const d = classifyOp(op('-y+1,x-y,z'), hex)
    close([d.point![0], d.point![1]], [2 / 3, 1 / 3])
  })
  it('mirror and rotoinversion −4, −3', () => {
    const m = classifyOp(op('x,-y,z'), mono)
    expect(m.kind).toBe('mirror')
    const r4 = classifyOp(op('y,-x,-z+1'), { a: 5, b: 5, c: 7 } as CellParams)
    expect(r4.symbol).toBe('-4')
    close(r4.point, [0, 0, 0.5])
    expect(classifyOp(op('y,-x+y,-z'), hex).symbol).toBe('-3')
  })
})
