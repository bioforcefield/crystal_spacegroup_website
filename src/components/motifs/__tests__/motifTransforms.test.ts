import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { getDemo } from '../../../data/registry'
import { cartesianLinear, det3 } from '../../../data/math'
import type { Mat3 } from '../../../data/types'
import { orientationFromR } from '../../ChiralMotif'
import {
  buildMotifModel,
  CLASSIC_LANDMARKS,
  getMotifModel,
  landmarkHandedness,
  MOTIF_TARGET_RADIUS,
  TRIBO_ARM_DIRS,
  type MeshStyleId,
  type V3,
} from '../motifGeometry'

const MESH_STYLES: MeshStyleId[] = ['tetra', 'tribo', 'lopsy']

const apply = (M: Mat3, v: V3): V3 => [
  M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
  M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
  M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
]
const mm = (A: Mat3, B: Mat3): Mat3 =>
  A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j])) as Mat3
const maxDiff = (A: Mat3, B: Mat3) =>
  Math.max(...A.flatMap((r, i) => r.map((v, j) => Math.abs(v - B[i][j]))))

/** Build the scene's motif group exactly as UnitCellScene does. */
function sceneGroup(style: MeshStyleId, R: Mat3, cell?: Parameters<typeof orientationFromR>[1]) {
  const { quaternion, mirror } = orientationFromR(R, cell)
  const g = new THREE.Group()
  g.quaternion.copy(quaternion)
  g.scale.set(mirror ? -1 : 1, 1, 1)
  const inner = new THREE.Group()
  for (const { part, geometry } of getMotifModel(style).parts) {
    const m = new THREE.Mesh(geometry)
    m.name = part
    inner.add(m)
  }
  g.add(inner)
  g.updateMatrixWorld(true)
  return { g, mirror, quaternion }
}

/** Linear 3×3 of a group's world matrix. */
function linearOf(o: THREE.Object3D): Mat3 {
  const e = o.matrixWorld.elements // column-major
  return [
    [e[0], e[4], e[8]],
    [e[1], e[5], e[9]],
    [e[2], e[6], e[10]],
  ]
}

const s = Math.sqrt(3) / 2
// Independent, hand-written Cartesian matrices (not derived from site code).
const OPS: Record<string, { M: Mat3; det: 1 | -1 }> = {
  identity: { M: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], det: 1 },
  'twofold z': { M: [[-1, 0, 0], [0, -1, 0], [0, 0, 1]], det: 1 },
  'twofold y': { M: [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], det: 1 },
  'fourfold z': { M: [[0, -1, 0], [1, 0, 0], [0, 0, 1]], det: 1 },
  'threefold [111]': { M: [[0, 0, 1], [1, 0, 0], [0, 1, 0]], det: 1 },
  'sixfold z': { M: [[0.5, -s, 0], [s, 0.5, 0], [0, 0, 1]], det: 1 },
  'mirror ⊥x': { M: [[-1, 0, 0], [0, 1, 0], [0, 0, 1]], det: -1 },
  'mirror ⊥z': { M: [[1, 0, 0], [0, 1, 0], [0, 0, -1]], det: -1 },
  'diagonal mirror x↔y': { M: [[0, 1, 0], [1, 0, 0], [0, 0, 1]], det: -1 },
  inversion: { M: [[-1, 0, 0], [0, -1, 0], [0, 0, -1]], det: -1 },
  '−3 [111]': { M: [[0, 0, -1], [-1, 0, 0], [0, -1, 0]], det: -1 },
  '−4 z': { M: [[0, 1, 0], [-1, 0, 0], [0, 0, -1]], det: -1 },
}

describe('motif models reproduce the design geometry', () => {
  it('each style is bounded like the classic L (no new overlaps)', () => {
    // Classic farthest point: square centre 0.15 + rotated cube half-diagonal.
    const classicR = 0.15 + (Math.sqrt(3) * 0.026 * 1.55) / 2
    for (const st of MESH_STYLES) {
      const m = getMotifModel(st)
      let r = 0
      for (const { geometry } of m.parts) {
        const p = geometry.getAttribute('position')
        for (let i = 0; i < p.count; i++) r = Math.max(r, Math.hypot(p.getX(i), p.getY(i), p.getZ(i)))
      }
      expect(r).toBeCloseTo(MOTIF_TARGET_RADIUS, 6)
      expect(r).toBeLessThanOrEqual(classicR + 1e-9)
      expect(r * 1.08).toBeLessThan(0.15 + (Math.sqrt(3) * 0.032 * 1.55) / 2 + 0.002)
    }
  })

  it('ports the concept handedness (design verification.json signs)', () => {
    const h = (st: MeshStyleId) => landmarkHandedness(getMotifModel(st).landmarks.map((l) => l.p))
    expect(h('tetra')).toBeCloseTo(-0.729, 2)
    expect(h('lopsy')).toBeCloseTo(0.388, 2)
    // Tribo: same sign as the concept, depth strengthened from −0.334.
    expect(h('tribo')).toBeLessThan(-0.5)
    const [a, b, c] = TRIBO_ARM_DIRS
    const trip = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])
    expect(trip).toBeCloseTo(-0.644, 2)
    expect(landmarkHandedness(CLASSIC_LANDMARKS.map((l) => l.p))).toBeCloseTo(1, 9)
  })

  it('has real face geometry on the front of the body, and distinct buds', () => {
    for (const st of MESH_STYLES) {
      const parts = getMotifModel(st).parts.map((p) => p.part)
      expect(parts).toEqual(expect.arrayContaining(['body', 'eye', 'white', 'cheek', 'coral', 'mint', 'gold']))
      const eye = getMotifModel(st).parts.find((p) => p.part === 'eye')!.geometry
      eye.computeBoundingBox()
      const c = new THREE.Vector3()
      eye.boundingBox!.getCenter(c)
      expect(c.z).toBeGreaterThan(0.05) // faces +z (toward default viewer side)
    }
    expect(getMotifModel('tetra').parts.map((p) => p.part)).toContain('lilac')
    expect(getMotifModel('lopsy').parts.map((p) => p.part)).toContain('foot')
  })

  it('is deterministic and cached (shared geometry)', () => {
    expect(getMotifModel('tetra')).toBe(getMotifModel('tetra'))
    const a = buildMotifModel('lopsy')
    const b = buildMotifModel('lopsy')
    expect(a.landmarks).toEqual(b.landmarks)
    expect(a.parts.length).toBeLessThanOrEqual(9)
  })
})

describe('full affine transform applied to every mesh feature', () => {
  for (const [name, { M, det }] of Object.entries(OPS)) {
    it(`${name}: world matrix = M, all vertices + landmarks follow, hand ${det > 0 ? 'kept' : 'reversed'}`, () => {
      for (const st of MESH_STYLES) {
        const { g, mirror } = sceneGroup(st, M)
        expect(mirror).toBe(det < 0)
        const L = linearOf(g)
        expect(maxDiff(L, M)).toBeLessThan(1e-9)
        expect(Math.sign(det3(L))).toBe(det)
        // Every vertex of every part (eyes, cheeks, buds, body) moves by M.
        g.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return
          const pos = o.geometry.getAttribute('position')
          const v = new THREE.Vector3()
          for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 40))) {
            v.fromBufferAttribute(pos, i)
            const want = apply(M, [v.x, v.y, v.z])
            v.applyMatrix4(o.matrixWorld)
            expect(Math.abs(v.x - want[0]) + Math.abs(v.y - want[1]) + Math.abs(v.z - want[2])).toBeLessThan(1e-9)
          }
        })
        const lm = getMotifModel(st).landmarks.map((l) => l.p)
        const h0 = landmarkHandedness(lm)
        const h1 = landmarkHandedness(lm.map((p) => apply(M, p)))
        expect(Math.sign(h1)).toBe(Math.sign(h0) * det)
        expect(Math.abs(h1)).toBeCloseTo(Math.abs(h0), 9)
      }
    })
  }

  it('inversion is a 2-fold × mirror (−I), not just a mirror', () => {
    const inv = orientationFromR(OPS.inversion.M)
    const mir = orientationFromR(OPS['mirror ⊥x'].M)
    expect(inv.mirror && mir.mirror).toBe(true)
    expect(Math.abs(inv.quaternion.w)).toBeLessThan(1e-9) // 180° rotation
    expect(Math.abs(mir.quaternion.w)).toBeCloseTo(1, 9) // no rotation
    // Faces: a 2-fold about y turns the face away; inversion also turns it away.
    for (const st of MESH_STYLES) {
      for (const op of ['twofold y', 'inversion'] as const) {
        const { g } = sceneGroup(st, OPS[op].M)
        const eye = g.getObjectByName('eye') as THREE.Mesh
        const box = new THREE.Box3().setFromObject(eye)
        expect(box.getCenter(new THREE.Vector3()).z).toBeLessThan(-0.05)
      }
      const { g } = sceneGroup(st, OPS['mirror ⊥x'].M)
      const box = new THREE.Box3().setFromObject(g.getObjectByName('eye')!)
      expect(box.getCenter(new THREE.Vector3()).z).toBeGreaterThan(0.05) // mirror ⊥x keeps it facing +z
    }
  })
})

describe('all 230 groups: Cartesian linear part and orientation', () => {
  const demos = Array.from({ length: 230 }, (_, i) => getDemo(i + 1)!)
  it('covers 230 groups', () => {
    expect(new Set(demos.map((d) => d.meta.number)).size).toBe(230)
  })

  it('A·R·A⁻¹ is an isometry with det(R); orientation reproduces it; chirality rule holds', () => {
    const lm = getMotifModel('tetra').landmarks.map((l) => l.p)
    const h0 = landmarkHandedness(lm)
    let improper = 0
    let inversions = 0
    for (const d of demos) {
      for (const op of d.operators) {
        const Rc = cartesianLinear(op.R, d.cell)
        const RtR = mm([0, 1, 2].map((i) => Rc.map((r) => r[i])) as Mat3, Rc)
        expect(maxDiff(RtR, [[1, 0, 0], [0, 1, 0], [0, 0, 1]])).toBeLessThan(1e-9)
        const dt = det3(op.R)
        expect(det3(Rc)).toBeCloseTo(dt, 9)
        const { g } = sceneGroup('tetra', op.R, d.cell)
        expect(maxDiff(linearOf(g), Rc)).toBeLessThan(1e-9)
        const h1 = landmarkHandedness(lm.map((p) => apply(Rc, p)))
        expect(Math.sign(h1)).toBe(Math.sign(h0) * Math.sign(dt))
        if (dt < 0) improper++
        if (maxDiff(op.R, [[-1, 0, 0], [0, -1, 0], [0, 0, -1]]) < 1e-12) inversions++
      }
    }
    expect(improper).toBeGreaterThan(0)
    expect(inversions).toBeGreaterThan(0)
  })

  it('hexagonal: fractional 6-fold maps to a true 60° Cartesian rotation', () => {
    const cell = { a: 1, b: 1, c: 1.4, gammaDeg: 120 }
    const R6: Mat3 = [[1, -1, 0], [1, 0, 0], [0, 0, 1]] // x−y, x, z
    expect(maxDiff(cartesianLinear(R6, cell), OPS['sixfold z'].M)).toBeLessThan(1e-9)
    // The fractional matrix itself is not orthogonal (why the cell is needed).
    const Rt = [0, 1, 2].map((i) => R6.map((r) => r[i])) as Mat3
    expect(maxDiff(mm(Rt, R6), [[1, 0, 0], [0, 1, 0], [0, 0, 1]])).toBeGreaterThan(0.5)
  })

  it('composition: M(g)·M(h) = M(g∘h) for the scene transform', () => {
    for (const n of [2, 14, 61, 148, 191, 225]) {
      const d = getDemo(n)!
      for (const a of d.operators.slice(0, 8)) {
        for (const b of d.operators.slice(0, 8)) {
          const Rab = mm(a.R, b.R)
          const c = d.operators.find((o) => maxDiff(o.R, Rab) < 1e-9)
          expect(c, `SG${n} closure`).toBeTruthy()
          const Ma = linearOf(sceneGroup('tribo', a.R, d.cell).g)
          const Mb = linearOf(sceneGroup('tribo', b.R, d.cell).g)
          const Mc = linearOf(sceneGroup('tribo', c!.R, d.cell).g)
          expect(maxDiff(mm(Ma, Mb), Mc)).toBeLessThan(1e-9)
        }
      }
    }
  })
})
