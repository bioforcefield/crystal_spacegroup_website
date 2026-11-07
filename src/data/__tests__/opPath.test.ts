/**
 * Honest ghost paths: endpoints, chosen lattice mates, midpoint geometry,
 * rigidity, screw pitch/sense, and renderer safety at the collapsed frame.
 */
import { describe, expect, it } from 'vitest'
import { getDemo } from '../registry'
import { placedPositions, type PlacementMode } from '../nearestImages'
import { cartesianLinear, fracToCart } from '../math'
import {
  applyAffine,
  buildOpPath,
  det3,
  easeInOut,
  ghostMatrixElements,
  inv3,
  mulMM,
  mulMV,
  pathAffine,
  RENDER_COLLAPSE_FLOOR,
  type OpPath,
} from '../opPath'
import type { CellParams, Mat3, SpaceGroupDemo, Vec3 } from '../types'

const I: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const len = (a: Vec3) => Math.hypot(...a)
const close = (a: Vec3, b: Vec3, tol = 1e-7) => len(sub(a, b)) < tol
const matClose = (A: Mat3, B: Mat3, tol = 1e-7) =>
  A.every((r, i) => r.every((v, j) => Math.abs(v - B[i][j]) < tol))

/** A small asymmetric cloud of "motif vertices" around the motif centre. */
const OFFSETS: Vec3[] = [
  [0, 0, 0],
  [0.12, 0.01, 0.0],
  [-0.03, 0.09, 0.02],
  [0.02, -0.04, 0.11],
  [-0.08, -0.06, -0.05],
]

function pairFor(demo: SpaceGroupDemo, index: number, mode: PlacementMode) {
  const pl = placedPositions(demo, index, mode)
  const base = pl.points.find((p) => p.index === 1)!
  const img = pl.points.find((p) => p.index === index)!
  return { pl, base, img }
}

function verts(path: OpPath, s: number, from: Vec3, Lf: Mat3): Vec3[] {
  const a = pathAffine(path, s)
  return OFFSETS.map((o) => applyAffine(a, [from[0] + mulMV(Lf, o)[0], from[1] + mulMV(Lf, o)[1], from[2] + mulMV(Lf, o)[2]]))
}

const allDemos = Array.from({ length: 230 }, (_, i) => getDemo(i + 1)!)

describe('every operation of all 230 groups (Near and Wrap)', () => {
  for (const mode of ['nearest', 'wrapped'] as PlacementMode[]) {
    it(`${mode}: exact endpoints, integer lattice mate, honest midpoint`, () => {
      let n = 0
      for (const demo of allDemos) {
        const A = [
          fracToCart([1, 0, 0], demo.cell),
          fracToCart([0, 1, 0], demo.cell),
          fracToCart([0, 0, 1], demo.cell),
        ]
        const Am: Mat3 = [
          [A[0][0], A[1][0], A[2][0]],
          [A[0][1], A[1][1], A[2][1]],
          [A[0][2], A[1][2], A[2][2]],
        ]
        const Ainv = inv3(Am)
        for (const op of demo.operators) {
          const { pl, base, img } = pairFor(demo, op.index, mode)
          const from = mode === 'nearest' ? pl.baseCartesian : base.cartesian
          const to = pl.imageCartesian
          const path = buildOpPath(from, base.operator.R, to, img.operator.R, demo.cell)
          // Endpoint = exactly the rendered IMAGE pose.
          const end = pathAffine(path, 1)
          const Lt = cartesianLinear(img.operator.R, demo.cell)
          expect(matClose(end.L, Lt, 1e-9)).toBe(true)
          expect(close(applyAffine(end, from), to, 1e-9)).toBe(true)
          // Start = identity.
          const st = pathAffine(path, 0)
          expect(matClose(st.L, I, 1e-12)).toBe(true)
          expect(len(st.t)).toBeLessThan(1e-12)
          // Cartesian translation is the Seitz t plus an integer lattice mate.
          const tf = mulMV(Ainv, path.t)
          for (let k = 0; k < 3; k++) {
            const lat = tf[k] - op.t[k]
            expect(Math.abs(lat - Math.round(lat))).toBeLessThan(1e-7)
          }
          // Kind matches the linear part.
          const d = det3(path.L)
          if (d > 0) {
            expect(['identity', 'translation', 'rotation', 'screw']).toContain(path.kind)
            for (const s of [0.25, 0.5, 0.75]) {
              const L = pathAffine(path, s).L
              const LtL = mulMM(
                [[L[0][0], L[1][0], L[2][0]], [L[0][1], L[1][1], L[2][1]], [L[0][2], L[1][2], L[2][2]]],
                L,
              )
              expect(matClose(LtL, I, 1e-9)).toBe(true)
              expect(det3(L)).toBeCloseTo(1, 9)
            }
          } else {
            expect(['mirror', 'glide', 'inversion', 'rotoinversion']).toContain(path.kind)
            const mid = verts(path, 0.5, from, I)
            if (path.kind === 'mirror' || path.kind === 'glide') {
              for (const v of mid) expect(Math.abs(dot(v, path.normal!) - path.planeOffset!)).toBeLessThan(1e-9)
            } else {
              for (const v of mid) expect(close(v, path.center!, 1e-9)).toBe(true)
              // The centre is a real fixed point of the operation.
              expect(close(applyAffine(end, path.center!), path.center!, 1e-9)).toBe(true)
            }
          }
          // Renderer matrix: finite and invertible at every sampled frame.
          for (const s of [0, 0.49, 0.5, 0.51, 1]) {
            const e = ghostMatrixElements(path, s, from, I)
            expect(e.every(Number.isFinite)).toBe(true)
            const M: Mat3 = [
              [e[0], e[4], e[8]],
              [e[1], e[5], e[9]],
              [e[2], e[6], e[10]],
            ]
            expect(Math.abs(det3(M))).toBeGreaterThan(RENDER_COLLAPSE_FLOOR ** 3 * 0.5)
          }
          n++
        }
      }
      expect(n).toBe(4425)
    }, 120_000)
  }
})

const ortho: CellParams = { a: 1, b: 1, c: 1 } as CellParams

describe('independent midpoint geometry', () => {
  it('mirror ⊥ x: tangential coordinates fixed, normal coordinate passes the plane', () => {
    // x' = −x + 0.5 → plane x = 0.25
    const R: Mat3 = [[-1, 0, 0], [0, 1, 0], [0, 0, 1]]
    const from: Vec3 = [0.1, 0.3, 0.4]
    const to: Vec3 = [-0.1 + 0.5, 0.3, 0.4]
    const path = buildOpPath(from, I, to, R, ortho)
    expect(path.kind).toBe('mirror')
    for (const s of [0.2, 0.5, 0.8]) {
      for (const v0 of OFFSETS.map((o): Vec3 => [from[0] + o[0], from[1] + o[1], from[2] + o[2]])) {
        const v = applyAffine(pathAffine(path, s), v0)
        expect(v[1]).toBeCloseTo(v0[1], 12)
        expect(v[2]).toBeCloseTo(v0[2], 12)
        expect(v[0] - 0.25).toBeCloseTo((1 - 2 * s) * (v0[0] - 0.25), 12)
      }
    }
  })

  it('c-glide ⊥ y: tangential progress s·c/2 plus reflection of y', () => {
    // x, −y + 0.5, z + 0.5 → plane y = 0.25, glide (0, 0, 0.5)
    const R: Mat3 = [[1, 0, 0], [0, -1, 0], [0, 0, 1]]
    const from: Vec3 = [0.2, 0.1, 0.3]
    const to: Vec3 = [0.2, 0.4, 0.8]
    const path = buildOpPath(from, I, to, R, ortho)
    expect(path.kind).toBe('glide')
    for (const s of [0.25, 0.5, 0.75]) {
      const v = applyAffine(pathAffine(path, s), from)
      expect(v[0]).toBeCloseTo(0.2, 12)
      expect(v[2]).toBeCloseTo(0.3 + 0.5 * s, 12)
      expect(v[1] - 0.25).toBeCloseTo((1 - 2 * s) * (0.1 - 0.25), 12)
    }
  })

  it('hexagonal mirror uses the real Cartesian normal (not a fractional axis)', () => {
    const demo = getDemo(191)!
    const op = demo.operators.find((o) => o.classId === 'mirror' && Math.abs(o.R[0][1]) > 0.5)!
    const { pl, base, img } = pairFor(demo, op.index, 'nearest')
    const path = buildOpPath(pl.baseCartesian, base.operator.R, pl.imageCartesian, img.operator.R, demo.cell)
    // Independent: normal ∝ IMAGE − BASE minus glide; here no glide → parallel.
    const dv = sub(pl.imageCartesian, pl.baseCartesian)
    const g = path.glide!
    const pureNormal = sub(dv, g)
    const c = Math.abs(dot(pureNormal, path.normal!)) / len(pureNormal)
    expect(c).toBeCloseTo(1, 9)
    // and the plane bisects BASE / IMAGE
    const midpoint: Vec3 = [(pl.baseCartesian[0] + pl.imageCartesian[0]) / 2, (pl.baseCartesian[1] + pl.imageCartesian[1]) / 2, (pl.baseCartesian[2] + pl.imageCartesian[2]) / 2]
    expect(dot(midpoint, path.normal!)).toBeCloseTo(path.planeOffset!, 9)
  })

  it('inversion: every vertex passes the midpoint of BASE and IMAGE, all axes 1→0→−1', () => {
    const demo = getDemo(2)!
    const { pl, base, img } = pairFor(demo, 2, 'nearest')
    const path = buildOpPath(pl.baseCartesian, base.operator.R, pl.imageCartesian, img.operator.R, demo.cell)
    expect(path.kind).toBe('inversion')
    const c: Vec3 = [0, 1, 2].map((k) => (pl.baseCartesian[k] + pl.imageCartesian[k]) / 2) as Vec3
    for (const s of [0.25, 0.5, 0.75]) {
      const a = pathAffine(path, s)
      // Linear part is a pure uniform scale (no rotation, not a mirror).
      expect(matClose(a.L, [[1 - 2 * s, 0, 0], [0, 1 - 2 * s, 0], [0, 0, 1 - 2 * s]], 1e-12)).toBe(true)
      for (const o of OFFSETS) {
        const v0: Vec3 = [pl.baseCartesian[0] + o[0], pl.baseCartesian[1] + o[1], pl.baseCartesian[2] + o[2]]
        const v = applyAffine(a, v0)
        expect(close(sub(v, c), sub(v0, c).map((x) => x * (1 - 2 * s)) as Vec3, 1e-12)).toBe(true)
      }
    }
    expect(close(path.center!, c, 1e-12)).toBe(true)
  })

  it('−4 rotoinversion: rotates about the real axis and collapses on its centre', () => {
    // −4 ‖ z at origin: (y, −x, −z)
    const R: Mat3 = [[0, 1, 0], [-1, 0, 0], [0, 0, -1]]
    const from: Vec3 = [0.3, 0.1, 0.2]
    const to = mulMV(R, from)
    const path = buildOpPath(from, I, to, R, ortho)
    expect(path.kind).toBe('rotoinversion')
    expect(Math.abs(path.axis![2])).toBeCloseTo(1, 12)
    expect(path.angle).toBeCloseTo(Math.PI / 2, 12)
    expect(close(path.center!, [0, 0, 0], 1e-12)).toBe(true)
    for (const v of verts(path, 0.5, from, I)) expect(len(v)).toBeLessThan(1e-12)
  })
})

describe('proper rotations and screws', () => {
  it('2-fold: rigid rotation about the real axis (axis points stay fixed)', () => {
    // 2 ‖ z through (½, 0, z): −x + 1, −y, z
    const R: Mat3 = [[-1, 0, 0], [0, -1, 0], [0, 0, 1]]
    const from: Vec3 = [0.2, 0.1, 0.3]
    const to: Vec3 = [0.8, -0.1, 0.3]
    const path = buildOpPath(from, I, to, R, ortho)
    expect(path.kind).toBe('rotation')
    const onAxis: Vec3 = [0.5, 0, 0.7]
    for (const s of [0.3, 0.5, 0.9]) {
      expect(close(applyAffine(pathAffine(path, s), onAxis), onAxis, 1e-12)).toBe(true)
      const a = pathAffine(path, s)
      const p = applyAffine(a, from)
      // distance to axis preserved (rigid), height unchanged
      expect(Math.hypot(p[0] - 0.5, p[1])).toBeCloseTo(Math.hypot(0.2 - 0.5, 0.1), 12)
      expect(p[2]).toBeCloseTo(0.3, 12)
    }
  })

  it('P4₁ / P4₃: +90° about +c with the ITA pitch (+¼c vs +¾c), path advance = chosen mate', () => {
    for (const [sg, pitch] of [[76, 0.25], [78, 0.75]] as const) {
      const demo = getDemo(sg)!
      // the 4-fold screw  −y, x, z + m/4  (+90° about +c)
      const op = demo.operators.find((o) => o.R[0][1] === -1 && o.R[1][0] === 1 && o.R[2][2] === 1)!
      const { pl, base, img } = pairFor(demo, op.index, 'nearest')
      const path = buildOpPath(pl.baseCartesian, base.operator.R, pl.imageCartesian, img.operator.R, demo.cell)
      expect(path.kind).toBe('screw')
      expect(path.angle).toBeCloseTo(Math.PI / 2, 12)
      expect(path.axis![2]).toBeCloseTo(1, 12) // counter-clockwise about +c
      const adv = path.t[2] / demo.cell.c
      expect(adv).toBeCloseTo(pitch, 9)
      // Path advance = actual IMAGE − BASE along the axis (chosen mate).
      expect(adv).toBeCloseTo((pl.imageCartesian[2] - pl.baseCartesian[2]) / demo.cell.c, 9)
      // Halfway: 45° turned and half the advance (constant pitch).
      const a = pathAffine(path, 0.5)
      const p = applyAffine(a, pl.baseCartesian)
      expect((p[2] - pl.baseCartesian[2]) / demo.cell.c).toBeCloseTo(adv / 2, 9)
      const ax = path.axisPoint!
      const ang = (q: Vec3) => Math.atan2(q[1] - ax[1], q[0] - ax[0])
      let dAng = ang(p) - ang(pl.baseCartesian)
      dAng = Math.atan2(Math.sin(dAng), Math.cos(dAng))
      expect(dAng).toBeCloseTo(Math.PI / 4, 9)
    }
  })
})

describe('renderer safety and timing', () => {
  it('ease maps 0→0, 1→1 (reduced motion jumps straight to the endpoint pose)', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(1)).toBe(1)
    const R: Mat3 = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]]
    const path = buildOpPath([0.1, 0.2, 0.3], I, [-0.1, -0.2, -0.3], R, ortho)
    const e = ghostMatrixElements(path, easeInOut(1), [0.1, 0.2, 0.3], I)
    expect(e.slice(0, 11)).toEqual([-1, -0, -0, 0, -0, -1, -0, 0, -0, -0, -1].map((v) => v + 0))
    expect(e.slice(12, 15).map((v) => +v.toFixed(12))).toEqual([-0.1, -0.2, -0.3])
  })

  it('collapsed midpoint is finite and keeps the floor, sign flips across s = ½', () => {
    const R: Mat3 = [[-1, 0, 0], [0, 1, 0], [0, 0, 1]]
    const path = buildOpPath([0.1, 0, 0], I, [-0.1, 0, 0], R, ortho)
    const before = ghostMatrixElements(path, 0.4999, [0.1, 0, 0], I)
    const at = ghostMatrixElements(path, 0.5, [0.1, 0, 0], I)
    const after = ghostMatrixElements(path, 0.5001, [0.1, 0, 0], I)
    expect(at.every(Number.isFinite)).toBe(true)
    expect(before[0]).toBeCloseTo(RENDER_COLLAPSE_FLOOR, 12)
    expect(after[0]).toBeCloseTo(-RENDER_COLLAPSE_FLOOR, 12)
    // exact path (no floor) really reaches the plane
    expect(pathAffine(path, 0.5).L[0][0]).toBe(0)
  })

  it('source pose already transformed: path composes relative to it', () => {
    // From a mirrored source to an inverted target: relative op = 2-fold ‖ x.
    const Rm: Mat3 = [[-1, 0, 0], [0, 1, 0], [0, 0, 1]]
    const Ri: Mat3 = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]]
    const from: Vec3 = [0.2, 0.3, 0.1]
    const rel: Mat3 = mulMM(Ri, inv3(Rm))
    const to = mulMV(rel, from)
    const path = buildOpPath(from, Rm, to, Ri, ortho)
    expect(path.kind).toBe('rotation')
    const e = ghostMatrixElements(path, 1, from, Rm)
    const M: Mat3 = [[e[0], e[4], e[8]], [e[1], e[5], e[9]], [e[2], e[6], e[10]]]
    expect(matClose(M, Ri, 1e-12)).toBe(true)
  })
})
