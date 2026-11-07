import { describe, expect, it } from 'vitest'
import { applyAffine, det3, pathAffine } from '../../../data/opPath'
import type { Mat3, Vec3 } from '../../../data/types'
import { HERO_B, HERO_BASE, HERO_CENTER, HERO_I, HERO_VIEW, heroScene, primerScene, scenePose, type PrimerDemoId } from '../homeScenes'
import { drawMotif, getLiteMesh, project } from '../softRender'
import { timelineFrame } from '../OpSceneCanvas'
import { heroFrame } from '../../hero/HeroCellMotif'

const ids: PrimerDemoId[] = ['identity', 'inversion', 'twofold', 'screw', 'mirror', 'glide']
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const len = (a: Vec3) => Math.hypot(...a)

/** Lite-mesh vertices of a scene's motif at parameter s (world). */
function worldVerts(id: PrimerDemoId | 'hero', s: number): Vec3[] {
  const sc = id === 'hero' ? heroScene() : primerScene(id)
  const { L, t } = scenePose(sc, s)
  const m = getLiteMesh('tetra')
  const out: Vec3[] = []
  for (let i = 0; i < m.tris.length; i += 27) {
    const v: Vec3 = [m.tris[i] * sc.modelScale, m.tris[i + 1] * sc.modelScale, m.tris[i + 2] * sc.modelScale]
    out.push([0, 1, 2].map((r) => L[r][0] * v[0] + L[r][1] * v[1] + L[r][2] * v[2] + t[r]) as Vec3)
  }
  return out
}

describe('primer card scenes are real 3D operations', () => {
  it('proper vs improper matches the card', () => {
    const want: Record<PrimerDemoId, number> = { identity: 1, inversion: -1, twofold: 1, screw: 1, mirror: -1, glide: -1 }
    for (const id of ids) expect(Math.sign(det3(primerScene(id).op.L))).toBe(want[id])
    expect(primerScene('identity').path.kind).toBe('identity')
    expect(primerScene('inversion').path.kind).toBe('inversion')
    expect(primerScene('twofold').path.kind).toBe('rotation')
    expect(primerScene('screw').path.kind).toBe('screw')
    expect(primerScene('mirror').path.kind).toBe('mirror')
    expect(primerScene('glide').path.kind).toBe('glide')
  })

  it('drawn elements are the operation’s actual invariant elements', () => {
    const inv = primerScene('inversion')
    expect(len(sub(inv.path.center!, (inv.element as { p: Vec3 }).p))).toBeLessThan(1e-12)
    const two = primerScene('twofold')
    expect(Math.abs(dot(two.path.axis!, two.view.toward))).toBeCloseTo(1, 12) // axis ⊥ page
    const sc = primerScene('screw')
    expect(Math.abs(sc.path.axis![1])).toBeCloseTo(1, 12)
    expect(len(sc.path.axial!)).toBeCloseTo(26, 12)
    for (const id of ['mirror', 'glide'] as const) {
      const s = primerScene(id)
      const el = s.element as { normal: Vec3; p: Vec3 }
      expect(Math.abs(dot(s.path.normal!, el.normal))).toBeCloseTo(1, 12)
      expect(dot(el.p, s.path.normal!)).toBeCloseTo(s.path.planeOffset!, 12)
    }
  })

  it('mirror / glide: at s = ½ every vertex lies on the drawn plane; glide slid halfway', () => {
    for (const id of ['mirror', 'glide'] as const) {
      const s = primerScene(id)
      for (const v of worldVerts(id, 0.5)) expect(Math.abs(dot(v, s.path.normal!) - s.path.planeOffset!)).toBeLessThan(1e-9)
    }
    const g = primerScene('glide')
    const mid = applyAffine(pathAffine(g.path, 0.5), g.base)
    expect(mid[0] - g.base[0]).toBeCloseTo(21, 9)
  })

  it('inversion: at s = ½ every vertex is at ⊙; I is the full 3D inversion', () => {
    for (const v of worldVerts('inversion', 0.5)) expect(len(v)).toBeLessThan(1e-9)
    const b = worldVerts('inversion', 0)
    const i = worldVerts('inversion', 1)
    b.forEach((v, k) => expect(len(sub(i[k], [-v[0], -v[1], -v[2]]))).toBeLessThan(1e-9))
  })

  it('rotations stay rigid; the screw advances half its pitch at s = ½', () => {
    for (const id of ['twofold', 'screw'] as const) {
      const sc = primerScene(id)
      for (const s of [0.25, 0.5, 0.75]) expect(det3(pathAffine(sc.path, s).L)).toBeCloseTo(1, 12)
    }
    const sc = primerScene('screw')
    const p = applyAffine(pathAffine(sc.path, 0.5), sc.base)
    expect(p[1] - sc.base[1]).toBeCloseTo(13, 12)
    expect(Math.hypot(p[0], p[2])).toBeCloseTo(Math.hypot(sc.base[0], sc.base[2]), 12)
  })
})

describe('hero logo (Lopsy, 1̄ through the cell centre)', () => {
  it('uses the SVG cube projection: corners, centre, B and I line up', () => {
    const P = (p: Vec3) => project(HERO_VIEW, p).map((v) => +v.toFixed(6))
    expect(P([0, 0, 0])).toEqual([HERO_CENTER.x, HERO_CENTER.y])
    expect(P([-1, 1, -1])).toEqual([110, 35])
    expect(P([1, 1, -1])).toEqual([180, 70])
    expect(P([1, -1, -1])).toEqual([180, 140])
    expect(P([-1, -1, 1])).toEqual([40, 140])
    expect(P(HERO_BASE)).toEqual([HERO_B.x, HERO_B.y])
    expect(P([-HERO_BASE[0], -HERO_BASE[1], -HERO_BASE[2]])).toEqual([HERO_I.x, HERO_I.y])
  })

  it('ghost collapses through the centre and lands as the 3D inverse', () => {
    const sc = heroScene()
    expect(sc.path.kind).toBe('inversion')
    for (const v of worldVerts('hero', 0.5)) expect(len(v)).toBeLessThan(1e-9)
    const end = scenePose(sc, 1)
    const start = scenePose(sc, 0)
    const negI = start.L.map((r) => r.map((x) => -x)) as Mat3
    end.L.forEach((r, i) => r.forEach((x, j) => expect(x).toBeCloseTo(negI[i][j], 12)))
  })

  it('timeline: B first, ghost travels 12–48 %, I lands by 50 %', () => {
    expect(heroFrame(0.05).ghostAlpha).toBe(0)
    expect(heroFrame(0.3).s).toBeCloseTo(0.5, 6)
    expect(heroFrame(0.47).s).toBeGreaterThan(0.99)
    expect(heroFrame(0.4).iAlpha).toBe(0)
    expect(heroFrame(0.6)).toMatchObject({ bAlpha: 1, iAlpha: 1, ghostAlpha: 0 })
  })
})

describe('software renderer', () => {
  function mockCtx() {
    let fills = 0
    const ctx = {
      save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {},
      fill() { fills++ },
      set fillStyle(_v: string) {}, set strokeStyle(_v: string) {}, set globalAlpha(_v: number) {},
      set lineJoin(_v: string) {}, set lineWidth(_v: number) {},
    }
    return { ctx: ctx as unknown as CanvasRenderingContext2D, fills: () => fills }
  }

  it('lite meshes are light (shared, < 2500 triangles per style)', () => {
    for (const s of ['tetra', 'tribo', 'lopsy'] as const) {
      const m = getLiteMesh(s)
      expect(m.count).toBeGreaterThan(300)
      expect(m.count).toBeLessThan(2500)
      expect(getLiteMesh(s)).toBe(m)
    }
  })

  it('culling uses the transformed geometry: −I shows the opposite side, not a flipped sprite', () => {
    const view = heroScene().view
    const mesh = getLiteMesh('lopsy')
    const I: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    const N: Mat3 = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]]
    const a = mockCtx()
    const b = mockCtx()
    const nA = drawMotif(a.ctx, mesh, I, [0, 0, 0], 1, view, { tint: '#ffffff' })
    const nB = drawMotif(b.ctx, mesh, N, [0, 0, 0], 1, view, { tint: '#ffffff' })
    expect(a.fills()).toBe(nA)
    // Roughly half of a closed mesh faces the viewer either way …
    expect(nA).toBeGreaterThan(mesh.count * 0.3)
    expect(nB).toBeGreaterThan(mesh.count * 0.3)
    // … and the eye triangles (on the face side) are visible for B but hidden for −B.
    const eye = 6 // PARTS index of 'eye'
    let eyeFront = 0
    for (let i = 0; i < mesh.count; i++) {
      if (mesh.part[i] !== eye) continue
      const o = i * 9
      const ax = mesh.tris[o + 3] - mesh.tris[o], ay = mesh.tris[o + 4] - mesh.tris[o + 1], az = mesh.tris[o + 5] - mesh.tris[o + 2]
      const bx = mesh.tris[o + 6] - mesh.tris[o], by = mesh.tris[o + 7] - mesh.tris[o + 1], bz = mesh.tris[o + 8] - mesh.tris[o + 2]
      const n: Vec3 = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx]
      if (dot(n, view.toward) > 0) eyeFront++
    }
    expect(eyeFront).toBeGreaterThan(0)
  })

  it('collapsed frame draws without NaN coordinates', () => {
    const sc = heroScene()
    const { L, t } = scenePose(sc, 0.5, 0.02)
    const calls: number[] = []
    const ctx = {
      save() {}, restore() {}, beginPath() {}, closePath() {}, stroke() {}, fill() {},
      moveTo(x: number, y: number) { calls.push(x, y) }, lineTo(x: number, y: number) { calls.push(x, y) },
    } as unknown as CanvasRenderingContext2D
    drawMotif(ctx, getLiteMesh('lopsy'), L, t, sc.modelScale, sc.view, { tint: '#fff' })
    expect(calls.length).toBeGreaterThan(0)
    expect(calls.every(Number.isFinite)).toBe(true)
  })

  it('card timeline: starts at BASE, holds at IMAGE', () => {
    expect(timelineFrame(0).s).toBe(0)
    expect(timelineFrame(0.75)).toEqual({ s: 1, alpha: 1 })
    expect(timelineFrame(0.37).s).toBeCloseTo(0.5, 6)
  })
})
