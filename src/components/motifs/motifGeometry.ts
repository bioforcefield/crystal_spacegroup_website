/**
 * Lightweight three.js reproductions of the approved chiral motif concepts
 * (source: motif-designs/render_motifs.py — same primitives, directions,
 * radii and face placement, in the same object frame).
 *
 * Every feature (buds, arms, eyes, cheeks) is real geometry in ONE object
 * frame. The scene applies the operation's full linear map to the whole
 * group (rotation quaternion + parent scale.x = −1 for det −1), so faces turn
 * away / back under rotations and the whole object is reflected / inverted
 * under improper operations — never a billboard redraw.
 *
 * Geometry is built once per style, merged per colour (≤ 9 draw calls per
 * motif) and shared by every instance.
 */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { MotifStyleId } from './motifStyles'

export type V3 = [number, number, number]
/** Basis as COLUMNS [x, y, z] (local → object). */
type Frame = [V3, V3, V3]

export type MotifPart =
  | 'body'
  | 'coral'
  | 'mint'
  | 'gold'
  | 'lilac'
  | 'foot'
  | 'eye'
  | 'white'
  | 'cheek'

/** Cream body before class-colour tint (design PAL.body). */
export const MOTIF_BODY_BASE = '#FBE3C8'
/** Fixed feature palette from the design (landmark identity). */
export const MOTIF_PART_COLORS: Record<Exclude<MotifPart, 'body'>, string> = {
  coral: '#FF7F6E',
  mint: '#5ED3B0',
  gold: '#FFC24B',
  lilac: '#A98BFF',
  foot: '#E8866F',
  eye: '#22183A',
  white: '#FFFFFF',
  cheek: '#FF9E9E',
}

/**
 * Bounding radius (about the site point) every new style is normalised to.
 * Classic L reaches ≈ 0.175–0.19 (tip 0.15 + rotated cube half-diagonal), so
 * new styles occupy the same footprint and introduce no new overlaps.
 */
export const MOTIF_TARGET_RADIUS = 0.18

export type MeshStyleId = Exclude<MotifStyleId, 'classic'>

export interface MotifLandmark {
  name: string
  p: V3
}

export interface MotifModel {
  style: MeshStyleId
  parts: { part: MotifPart; geometry: THREE.BufferGeometry }[]
  /** Ordered: reference first, then three non-coplanar labelled features. */
  landmarks: MotifLandmark[]
  /** Uniform design→scene scale that was applied. */
  scale: number
}

// ---------- small vector helpers ----------
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const len = (a: V3) => Math.hypot(a[0], a[1], a[2])
export const nrm = (a: V3): V3 => mul(a, 1 / len(a))

const IDENT: Frame = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

/** Port of render_motifs.frame(ydir, hint): local +y → ydir. */
function frame(ydir: V3, hint: V3 = [0, 0, 1]): Frame {
  const y = nrm(ydir)
  let h = hint
  if (Math.abs(dot(nrm(h), y)) > 0.95) h = [1, 0, 0]
  const x = nrm(cross(y, h))
  const z = cross(x, y)
  return [x, y, z]
}

const toLocal = (F: Frame, p: V3): V3 => [dot(F[0], p), dot(F[1], p), dot(F[2], p)]

// ---------- body SDF (only to snap the smooth body + face onto the surface) ----------
type BodyPrim =
  | { kind: 'sphere'; c: V3; r: number; k: number }
  | { kind: 'ellip'; c: V3; F: Frame; r: V3; k: number }

function sdBody(p: BodyPrim, x: V3): number {
  if (p.kind === 'sphere') return len(sub(x, p.c)) - p.r
  const q = toLocal(p.F, sub(x, p.c))
  const k0 = len([q[0] / p.r[0], q[1] / p.r[1], q[2] / p.r[2]])
  const k1 = len([q[0] / (p.r[0] * p.r[0]), q[1] / (p.r[1] * p.r[1]), q[2] / (p.r[2] * p.r[2])])
  return (k0 * (k0 - 1)) / Math.max(k1, 1e-9)
}

function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b)
  const h = Math.min(1, Math.max(0, 0.5 + (0.5 * (b - a)) / k))
  return b * (1 - h) + a * h - k * h * (1 - h)
}

function bodyField(body: BodyPrim[], x: V3): number {
  let D = sdBody(body[0], x)
  for (let i = 1; i < body.length; i++) D = smin(D, sdBody(body[i], x), body[i].k)
  return D
}

/** Port of render_motifs.surf: march from the body centre along d. */
function surf(body: BodyPrim[], d: V3): V3 {
  let lo = 0
  let hi = 2
  for (let i = 0; i < 50; i++) {
    const m = 0.5 * (lo + hi)
    if (bodyField(body, mul(d, m)) < 0) lo = m
    else hi = m
  }
  return mul(d, lo)
}

// ---------- mesh primitives ----------
type Piece = { part: MotifPart; geometry: THREE.BufferGeometry }

function place(g: THREE.BufferGeometry, F: Frame, c: V3, s: V3 = [1, 1, 1]): THREE.BufferGeometry {
  const m = new THREE.Matrix4().set(
    F[0][0] * s[0], F[1][0] * s[1], F[2][0] * s[2], c[0],
    F[0][1] * s[0], F[1][1] * s[1], F[2][1] * s[2], c[1],
    F[0][2] * s[0], F[1][2] * s[1], F[2][2] * s[2], c[2],
    0, 0, 0, 1,
  )
  g.applyMatrix4(m)
  return g
}

/** 'lite' = low segment counts for the 2D-canvas software renderer (home page). */
export type MotifDetail = 'full' | 'lite'

class Builder {
  readonly detail: MotifDetail
  constructor(detail: MotifDetail = 'full') {
    this.detail = detail
  }
  /** Segment count for the current detail level (full keeps the 3D-viewer mesh unchanged). */
  seg(n: number, min: number): number {
    return this.detail === 'full' ? n : Math.max(min, Math.round(n * 0.55))
  }
  pieces: Piece[] = []
  body: BodyPrim[] = []
  bodyMeshPrims: BodyPrim[] = []

  bodySphere(c: V3, r: number, k = 0) {
    this.body.push({ kind: 'sphere', c, r, k })
  }
  bodyEllip(c: V3, F: Frame, r: V3, k = 0) {
    this.body.push({ kind: 'ellip', c, F, r, k })
  }
  sphere(part: MotifPart, c: V3, r: number, w = 14, h = 10) {
    this.pieces.push({ part, geometry: place(new THREE.SphereGeometry(r, this.seg(w, 6), this.seg(h, 4)), IDENT, c) })
  }
  ellip(part: MotifPart, c: V3, F: Frame, r: V3, w = 12, h = 8) {
    this.pieces.push({ part, geometry: place(new THREE.SphereGeometry(1, this.seg(w, 6), this.seg(h, 4)), F, c, r) })
  }
  rbox(part: MotifPart, c: V3, F: Frame, b: V3, r: number) {
    const g = new RoundedBoxGeometry(2 * (b[0] + r), 2 * (b[1] + r), 2 * (b[2] + r), this.detail === 'full' ? 2 : 1, r)
    this.pieces.push({ part, geometry: place(g, F, c) })
  }
  /** SDF torus lies in the local xz-plane (axis = local y). */
  torus(part: MotifPart, c: V3, F: Frame, Rm: number, r: number) {
    const g = new THREE.TorusGeometry(Rm, r, this.seg(8, 5), this.seg(20, 10))
    g.rotateX(Math.PI / 2)
    this.pieces.push({ part, geometry: place(g, F, c) })
  }
  /** Rounded cone from local y=0 (r1) to y=h (r2), like sd_rcone. */
  rcone(part: MotifPart, base: V3, F: Frame, r1: number, r2: number, h: number) {
    const cyl = new THREE.CylinderGeometry(r2, r1, h, this.seg(12, 8), 1, true)
    cyl.translate(0, h / 2, 0)
    this.pieces.push({ part, geometry: place(cyl, F, base) })
    this.pieces.push({ part, geometry: place(new THREE.SphereGeometry(r1, this.seg(12, 8), this.seg(8, 5)), F, base) })
    if (r2 > 0.02) {
      const cap = new THREE.SphereGeometry(r2, this.seg(10, 6), this.seg(6, 4))
      cap.translate(0, h, 0)
      this.pieces.push({ part, geometry: place(cap, F, base) })
    }
  }
  arm(base: V3, d: V3, L: number, r1: number, r2: number, part: MotifPart) {
    this.rcone(part, base, frame(d), r1, r2, L)
  }

  /** Port of render_motifs.face: eyes + highlights + cheeks ON the body surface. */
  face(n0: V3, rad: number, sep: number, er: [number, number], dy: [number, number] = [0, 0]) {
    const n = nrm(n0)
    const up = nrm(sub([0, 1, 0], mul(n, n[1])))
    const rt = cross(up, n)
    const sides: [number, number, number][] = [
      [-1, er[0], dy[0]],
      [1, er[1], dy[1]],
    ]
    for (const [sgn, r, ddy] of sides) {
      const dirn = nrm(add(add(mul(n, rad), mul(rt, sgn * sep)), mul(up, 0.04 + ddy)))
      const base = sub(surf(this.body, dirn), mul(dirn, r * 0.45))
      this.sphere('eye', base, r, 10, 8)
      const hl = sub(add(add(base, mul(n, r * 0.72)), mul(up, r * 0.42)), mul(rt, r * 0.32))
      this.sphere('white', hl, r * 0.3, 6, 4)
      const cd = nrm(sub(add(mul(n, rad), mul(rt, sgn * (sep + 0.085))), mul(up, 0.1)))
      const cs = surf(this.body, cd)
      this.ellip('cheek', sub(cs, mul(cd, 0.012)), frame(cd, up), [0.065, 0.016, 0.042], 8, 6)
    }
  }

  /** Smooth body: a sphere mesh whose vertices are snapped onto the SDF body. */
  bodyMesh() {
    let g: THREE.BufferGeometry = new THREE.SphereGeometry(1, this.seg(36, 20), this.seg(24, 14))
    g.deleteAttribute('uv')
    g.deleteAttribute('normal')
    g = mergeVertices(g)
    const pos = g.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const d = nrm([pos.getX(i), pos.getY(i), pos.getZ(i)])
      const p = surf(this.body, d)
      pos.setXYZ(i, p[0], p[1], p[2])
    }
    g.computeVertexNormals()
    this.pieces.unshift({ part: 'body', geometry: g })
  }
}

// ---------- the three concepts (ported from render_motifs.py) ----------
type Concept = { b: Builder; landmarks: MotifLandmark[] }

let buildDetail: MotifDetail = 'full'

/**
 * A · Tribo. Arm directions keep the concept's screen layout (ball up-right,
 * cube left, cone down-right) but the z-depths were pushed apart so the
 * landmark triple product is ≈ −0.64 (concept: −0.33, nearly planar).
 */
export const TRIBO_ARM_DIRS: [V3, V3, V3] = [
  nrm([0.7, 0.78, -0.75]),
  nrm([-0.92, -0.05, -0.55]),
  nrm([0.38, -0.8, 0.3]),
]

function conceptTribo(): Concept {
  const b = new Builder(buildDetail)
  b.bodyEllip([0, 0, 0], IDENT, [0.66, 0.62, 0.6])
  const [d1, d2, d3] = TRIBO_ARM_DIRS
  b.arm(mul(d1, 0.45), d1, 0.42, 0.15, 0.11, 'coral')
  b.sphere('coral', mul(d1, 1.05), 0.21)
  b.arm(mul(d2, 0.45), d2, 0.55, 0.15, 0.1, 'mint')
  b.rbox('mint', mul(d2, 1.13), frame(d2, [0, 1, 0]), [0.13, 0.13, 0.13], 0.06)
  b.arm(mul(d3, 0.45), d3, 0.62, 0.15, 0.1, 'gold')
  b.rcone('gold', mul(d3, 1.02), frame(d3), 0.2, 0.035, 0.42)
  b.face(nrm([0.05, 0.12, 1]), 0.6, 0.19, [0.088, 0.088])
  return {
    b,
    landmarks: [
      { name: 'centre', p: [0, 0, 0] },
      { name: 'ball', p: mul(d1, 1.05) },
      { name: 'cube', p: mul(d2, 1.13) },
      { name: 'cone', p: mul(d3, 1.44) },
    ],
  }
}

function conceptLopsy(): Concept {
  const b = new Builder(buildDetail)
  b.bodyEllip([0, 0, 0], frame([0.15, 1, 0]), [0.72, 0.58, 0.58])
  const earBase: V3 = [-0.25, 0.38, -0.05]
  const earDir = nrm([-0.55, 0.85, -0.25])
  b.arm(earBase, earDir, 0.62, 0.2, 0.12, 'coral')
  const earTip = add(earBase, mul(earDir, 0.62))
  const bud: V3 = [0.4, 0.5, 0.12]
  b.sphere('mint', bud, 0.15)
  const tail: V3 = [0.72, -0.12, -0.38]
  b.arm([0.45, -0.08, -0.25], nrm([1, -0.1, -0.6]), 0.22, 0.1, 0.07, 'gold')
  b.torus('gold', tail, frame(nrm([0.3, 0.4, 1])), 0.17, 0.065)
  const foot: V3 = [-0.28, -0.56, 0.24]
  b.ellip('foot', foot, frame([0, 1, 0], [0.6, 0, 1]), [0.17, 0.11, 0.26])
  b.face(nrm([0.08, 0.15, 1]), 0.575, 0.21, [0.105, 0.07], [0, 0.03])
  return {
    b,
    landmarks: [
      { name: 'foot', p: foot },
      { name: 'ear', p: earTip },
      { name: 'bud', p: bud },
      { name: 'tail', p: tail },
    ],
  }
}

type M3r = number[][] // row-major
const mm = (A: M3r, B: M3r): M3r =>
  A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]))
const mv = (A: M3r, v: V3): V3 => [dot(A[0] as V3, v), dot(A[1] as V3, v), dot(A[2] as V3, v)]
const frameRows = (F: Frame): M3r => [0, 1, 2].map((i) => [F[0][i], F[1][i], F[2][i]])
const tr = (A: M3r): M3r => [0, 1, 2].map((i) => [A[0][i], A[1][i], A[2][i]])

/** Tetra bud directions after the design's orientation (R0) + 28° twist. */
export function tetraBudDirs(): V3[] {
  const s3 = Math.sqrt(3)
  const V: V3[] = [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
  ].map((v) => mul(v as V3, 1 / s3))
  const a = nrm(add(V[0], V[1]))
  const target = nrm([0.12, 0.22, 1])
  const v = cross(a, target)
  const s = len(v)
  const c = dot(a, target)
  const K: M3r = [
    [0, -v[2], v[1]],
    [v[2], 0, -v[0]],
    [-v[1], v[0], 0],
  ]
  const K2 = mm(K, K)
  const f = (1 - c) / (s * s)
  const R0: M3r = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? 1 : 0) + K[i][j] + K2[i][j] * f))
  const tw = frameRows(frame(target, [0, 1, 0]))
  const ang = (28 * Math.PI) / 180
  const Ry: M3r = [
    [Math.cos(ang), 0, Math.sin(ang)],
    [0, 1, 0],
    [-Math.sin(ang), 0, Math.cos(ang)],
  ]
  const Rt = mm(mm(tw, Ry), tr(tw))
  const R = mm(Rt, R0)
  return V.map((x) => mv(R, x))
}

function conceptTetra(): Concept {
  const b = new Builder(buildDetail)
  const V = tetraBudDirs()
  const target = nrm([0.12, 0.22, 1])
  b.bodySphere([0, 0, 0], 0.44)
  for (const v of V) b.bodySphere(mul(v, 0.3), 0.36, 0.28)
  const cols: MotifPart[] = ['coral', 'mint', 'gold', 'lilac']
  const pos: V3[] = []
  V.forEach((v, i) => {
    b.arm(mul(v, 0.55), v, 0.25, 0.11, 0.08, cols[i])
    const tip = mul(v, 0.98)
    if (i === 0) {
      b.sphere('coral', tip, 0.19)
      pos.push(tip)
    } else if (i === 1) {
      b.rbox('mint', tip, frame(v, [0, 1, 0]), [0.12, 0.12, 0.12], 0.05)
      pos.push(tip)
    } else if (i === 2) {
      b.rcone('gold', mul(v, 0.82), frame(v), 0.17, 0.03, 0.36)
      pos.push(mul(v, 1.18))
    } else {
      const perp = nrm(cross(v, [0, 1, 0.3]))
      b.torus('lilac', mul(v, 0.93), frame(perp, v), 0.15, 0.055)
      pos.push(mul(v, 0.93))
    }
  })
  b.face(target, 0.535, 0.17, [0.08, 0.08])
  return {
    b,
    landmarks: [
      { name: 'ball', p: pos[0] },
      { name: 'cube', p: pos[1] },
      { name: 'cone', p: pos[2] },
      { name: 'ring', p: pos[3] },
    ],
  }
}

const CONCEPTS: Record<MeshStyleId, () => Concept> = {
  tetra: conceptTetra,
  tribo: conceptTribo,
  lopsy: conceptLopsy,
}

function mergePart(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  for (const g of geoms) if (g.getAttribute('uv')) g.deleteAttribute('uv')
  const allIndexed = geoms.every((g) => g.index)
  const list = allIndexed ? geoms : geoms.map((g) => (g.index ? g.toNonIndexed() : g))
  const merged = mergeGeometries(list, false)
  if (!merged) throw new Error('motif geometry merge failed')
  merged.computeBoundingSphere()
  return merged
}

const PART_ORDER: MotifPart[] = ['body', 'coral', 'mint', 'gold', 'lilac', 'foot', 'eye', 'white', 'cheek']

export function buildMotifModel(style: MeshStyleId, detail: MotifDetail = 'full'): MotifModel {
  buildDetail = detail
  let concept: Concept
  try {
    concept = CONCEPTS[style]()
  } finally {
    buildDetail = 'full'
  }
  const { b, landmarks } = concept
  b.bodyMesh()
  let maxR = 0
  for (const { geometry } of b.pieces) {
    const pos = geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      maxR = Math.max(maxR, Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)))
    }
  }
  const scale = MOTIF_TARGET_RADIUS / maxR
  const byPart = new Map<MotifPart, THREE.BufferGeometry[]>()
  for (const { part, geometry } of b.pieces) {
    geometry.scale(scale, scale, scale)
    const list = byPart.get(part) ?? []
    list.push(geometry)
    byPart.set(part, list)
  }
  const parts = PART_ORDER.filter((p) => byPart.has(p)).map((part) => ({
    part,
    geometry: mergePart(byPart.get(part)!),
  }))
  return {
    style,
    parts,
    landmarks: landmarks.map((l) => ({ name: l.name, p: mul(l.p, scale) })),
    scale,
  }
}

const cache = new Map<MeshStyleId, MotifModel>()

/** Shared, lazily built model (geometry is reused by every instance). */
export function getMotifModel(style: MeshStyleId): MotifModel {
  let m = cache.get(style)
  if (!m) {
    m = buildMotifModel(style)
    cache.set(style, m)
  }
  return m
}

/** Classic L landmarks (hub, ball +x, triangle +y, square +z) from ChiralMotif.tsx. */
export const CLASSIC_LANDMARKS: MotifLandmark[] = [
  { name: 'hub', p: [0, 0, 0] },
  { name: 'ball', p: [0.07, 0, 0] },
  { name: 'triangle', p: [0, 0.11, 0] },
  { name: 'square', p: [0, 0, 0.15] },
]

/** Signed, length-normalised landmark triple product (chirality indicator). */
export function landmarkHandedness(lm: V3[]): number {
  const [o, a, b, c] = lm
  const u = sub(a, o)
  const v = sub(b, o)
  const w = sub(c, o)
  return dot(u, cross(v, w)) / (len(u) * len(v) * len(w))
}
