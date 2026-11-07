/**
 * Pure 3D scene specs for the home page (primer cards + hero logo).
 * Every scene is a real 3D configuration: a BASE pose, an exact isometry
 * (L, t) in world coordinates, the operation's actual invariant element and
 * a parallel projection. Animation frames come from opPath.pathAffine, so
 * mirrors/glides pass through the drawn plane, inversions shrink through the
 * drawn centre, rotations/screws turn about the drawn axis.
 */
import { decompose, pathAffine, rotAxis, type Affine, type OpPath } from '../../data/opPath'
import type { Mat3, Vec3 } from '../../data/types'
import { makeView, project, type View } from './softRender'

export type PrimerDemoId = 'identity' | 'inversion' | 'twofold' | 'screw' | 'mirror' | 'glide'

export type SceneElement =
  | { kind: 'none' }
  | { kind: 'center'; p: Vec3 }
  | { kind: 'axis'; p: Vec3; dir: Vec3; half: number; screw?: boolean }
  | { kind: 'plane'; p: Vec3; normal: Vec3; u: Vec3; v: Vec3; halfU: number; halfV: number }

export interface OpScene {
  id: PrimerDemoId | 'hero'
  width: number
  height: number
  view: View
  /** Model → world scale (model radius 0.18). */
  modelScale: number
  /** BASE motif centre and orientation (world). */
  base: Vec3
  baseL: Mat3
  /** The operation as an exact world isometry x ↦ L x + t. */
  op: Affine
  path: OpPath
  element: SceneElement
  caption?: string
}

const I3: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]
const nrm = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a)
  return [a[0] / l, a[1] / l, a[2] / l]
}

/** Orthographic view: yaw about +y, then elevation (degrees). */
function yawPitchView(yawDeg: number, pitchDeg: number, k: number, origin: [number, number]): View {
  const th = (yawDeg * Math.PI) / 180
  const ph = (pitchDeg * Math.PI) / 180
  const f: Vec3 = [Math.sin(th) * Math.cos(ph), Math.sin(ph), Math.cos(th) * Math.cos(ph)]
  const right: Vec3 = nrm([Math.cos(th), 0, -Math.sin(th)])
  const up: Vec3 = [
    f[1] * right[2] - f[2] * right[1],
    f[2] * right[0] - f[0] * right[2],
    f[0] * right[1] - f[1] * right[0],
  ]
  return makeView(right, up, k, origin)
}

function scene(
  id: OpScene['id'],
  width: number,
  height: number,
  view: View,
  modelScale: number,
  base: Vec3,
  op: Affine,
  element: SceneElement,
  caption?: string,
  baseL: Mat3 = I3,
): OpScene {
  return { id, width, height, view, modelScale, base, baseL, op, path: decompose(op.L, op.t), element, caption }
}

/** Motif model radius 0.18 → ≈ 17 world units (≈ px) on a card. */
const CARD_SCALE = 96

export function primerScene(id: PrimerDemoId): OpScene {
  switch (id) {
    case 'identity':
      return scene(id, 120, 72, yawPitchView(-20, 12, 1, [60, 32]), CARD_SCALE, [0, 0, 0], { L: I3, t: [0, 0, 0] }, { kind: 'none' })
    case 'inversion': {
      // −x, −y, −z about the centre ⊙ at the origin.
      const L: Mat3 = [
        [-1, 0, 0],
        [0, -1, 0],
        [0, 0, -1],
      ]
      return scene(id, 120, 72, yawPitchView(-22, 14, 1, [60, 36]), CARD_SCALE * 0.92, [-30, 6, 9], { L, t: [0, 0, 0] }, { kind: 'center', p: [0, 0, 0] }, 'improper — hand flips')
    }
    case 'twofold': {
      // 180° about the axis pointing at the viewer (⊥ page), through the lens at the origin.
      const view = yawPitchView(0, 0, 1, [60, 36])
      const L = rotAxis(view.toward, Math.PI)
      return scene(id, 120, 72, view, CARD_SCALE * 0.95, [-28, 2, 0], { L, t: [0, 0, 0] }, { kind: 'axis', p: [0, 0, 0], dir: view.toward, half: 6 }, 'proper — hand kept')
    }
    case 'screw': {
      // 2₁ ‖ y through the origin: 180° about +y plus ½ (= 26 units) along +y.
      const L = rotAxis([0, 1, 0], Math.PI)
      return scene(id, 120, 78, yawPitchView(-18, 14, 1, [60, 38]), CARD_SCALE * 0.8, [-24, -13, 6], { L, t: [0, 26, 0] }, { kind: 'axis', p: [0, 0, 0], dir: [0, 1, 0], half: 27, screw: true }, 'proper — hand kept')
    }
    case 'mirror': {
      // Mirror plane x = 0 (normal +x).
      const L: Mat3 = [
        [-1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ]
      return scene(id, 120, 78, yawPitchView(-28, 12, 1, [60, 36]), CARD_SCALE * 0.85, [-28, 0, 6], { L, t: [0, 0, 0] }, { kind: 'plane', p: [0, 0, 0], normal: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], halfU: 24, halfV: 20 }, 'improper — hand flips')
    }
    case 'glide': {
      // Glide plane y = 0 (normal +y), glide +40 along x.
      const L: Mat3 = [
        [1, 0, 0],
        [0, -1, 0],
        [0, 0, 1],
      ]
      return scene(id, 120, 72, yawPitchView(-16, 16, 1, [60, 34]), CARD_SCALE * 0.75, [-22, 12, 3], { L, t: [42, 0, 0] }, { kind: 'plane', p: [0, 0, 0], normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], halfU: 48, halfV: 14 }, 'improper — hand flips')
    }
  }
}

/* ---------- hero logo: Lopsy, 1̄ through the unit-cell centre ---------- */

/** SVG cell centre (viewBox 220×200) and the B / I screen anchors (unchanged). */
export const HERO_CENTER = { x: 110, y: 105 } as const
export const HERO_B = { x: 72, y: 83 } as const
export const HERO_I = { x: 2 * HERO_CENTER.x - HERO_B.x, y: 2 * HERO_CENTER.y - HERO_B.y } as const

/**
 * The hero SVG draws the cube [−1, 1]³ in isometric projection (view along
 * (1,1,1)), 35 px per half-edge vertically and stretched ×(2/√3) horizontally.
 * That is a parallel projection followed by a 2D affine map, so 3D midpoints
 * and point inversion through the cell centre are preserved on screen.
 */
export const HERO_VIEW: View = makeView(
  nrm([1, 0, -1]),
  nrm([-1, 2, -1]),
  35 * Math.sqrt(1.5),
  [HERO_CENTER.x, HERO_CENTER.y],
  2 / Math.sqrt(3),
)

/** BASE position in the cube: projects to HERO_B, slightly toward the viewer. */
export const HERO_BASE: Vec3 = (() => {
  const v = HERO_VIEW
  const a = (HERO_B.x - HERO_CENTER.x) / (v.k * (v.sx ?? 1))
  const b = -(HERO_B.y - HERO_CENTER.y) / v.k
  const c = 0.22
  return [0, 1, 2].map((i) => a * v.right[i] + b * v.up[i] + c * v.toward[i]) as Vec3
})()

/** BASE orientation: Lopsy turned ~40° from the viewer so its face, ear, bud and tail all read. */
export const HERO_BASE_L: Mat3 = (() => {
  const v = HERO_VIEW
  const cols = [v.right, v.up, v.toward]
  const M: Mat3 = [0, 1, 2].map((i) => cols.map((c) => c[i])) as Mat3
  const yaw = rotAxis(v.up, (-40 * Math.PI) / 180)
  return mul3(yaw, M)
})()

function mul3(A: Mat3, B: Mat3): Mat3 {
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j])) as Mat3
}

export function heroScene(): OpScene {
  const L: Mat3 = [
    [-1, 0, 0],
    [0, -1, 0],
    [0, 0, -1],
  ]
  return scene('hero', 220, 200, HERO_VIEW, 2.4, HERO_BASE, { L, t: [0, 0, 0] }, { kind: 'center', p: [0, 0, 0] }, undefined, HERO_BASE_L)
}

/** World pose of the motif at path parameter s (exact unless a floor is given). */
export function scenePose(sc: OpScene, s: number, collapseFloor = 0): { L: Mat3; t: Vec3 } {
  const a = pathAffine(sc.path, s, collapseFloor)
  const L = mul3(a.L, sc.baseL)
  const p = sc.base
  const t: Vec3 = [0, 1, 2].map((i) => a.L[i][0] * p[0] + a.L[i][1] * p[1] + a.L[i][2] * p[2] + a.t[i]) as Vec3
  return { L, t }
}

export function sceneScreen(sc: OpScene, p: Vec3): [number, number] {
  return project(sc.view, p)
}
