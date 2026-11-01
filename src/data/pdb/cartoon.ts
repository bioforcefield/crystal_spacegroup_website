/**
 * Cartoon mesh builder (pure; no three.js): helix ribbons, strand arrows, coil
 * tubes through Cα, and a P-trace + base "ladder" for nucleic acids.
 * Output arrays are ready for a BufferGeometry (indexed) with vertex colors
 * and a per-vertex atom index for picking.
 */
import type { Vec3 } from '../types'
import type { SsCode } from './secondary'

export interface CartoonResidue {
  ca: Vec3
  /** Carbonyl O (peptide-plane guide); optional. */
  o?: Vec3
  ss: SsCode
  color: [number, number, number]
  ai: number
}
export interface LadderRung { from: Vec3; to: Vec3; color: [number, number, number]; ai: number }
export interface CartoonMesh {
  positions: number[]
  normals: number[]
  colors: number[]
  atomIndex: number[]
  indices: number[]
}

const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Vec3): Vec3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

function catmull(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t2 = t * t, t3 = t2 * t
  const f = (i: 0 | 1 | 2) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3)
  return [f(0), f(1), f(2)]
}

export const CARTOON_SEGMENTS = 6
const PROFILE = 8

export function emptyMesh(): CartoonMesh { return { positions: [], normals: [], colors: [], atomIndex: [], indices: [] } }

/** Append one tube/ribbon along a path of frames to the mesh. */
function sweep(mesh: CartoonMesh, frames: { p: Vec3; n: Vec3; b: Vec3; w: number; h: number; c: [number, number, number]; ai: number }[]) {
  const start = mesh.positions.length / 3
  for (const f of frames) {
    for (let k = 0; k < PROFILE; k++) {
      const th = (k / PROFILE) * Math.PI * 2
      const cs = Math.cos(th), sn = Math.sin(th)
      const p = add(add(f.p, f.n, cs * f.w), f.b, sn * f.h)
      const nn = norm(add([f.n[0] * cs / f.w, f.n[1] * cs / f.w, f.n[2] * cs / f.w], f.b, sn / f.h))
      mesh.positions.push(p[0], p[1], p[2])
      mesh.normals.push(nn[0], nn[1], nn[2])
      mesh.colors.push(f.c[0], f.c[1], f.c[2])
      mesh.atomIndex.push(f.ai)
    }
  }
  for (let i = 0; i + 1 < frames.length; i++) {
    for (let k = 0; k < PROFILE; k++) {
      const a = start + i * PROFILE + k, b = start + i * PROFILE + ((k + 1) % PROFILE)
      const c = a + PROFILE, d = b + PROFILE
      mesh.indices.push(a, c, b, b, c, d)
    }
  }
}

/** Build the cartoon for one contiguous chain segment (≥ 2 residues). */
export function cartoonSegment(mesh: CartoonMesh, res: CartoonResidue[]) {
  const n = res.length
  if (n < 2) return
  // guide normals: CA→O, flipped for continuity
  const guides: Vec3[] = []
  for (let i = 0; i < n; i++) {
    let g: Vec3
    if (res[i]!.o) g = sub(res[i]!.o!, res[i]!.ca)
    else {
      const a = res[Math.max(0, i - 1)]!.ca, c = res[Math.min(n - 1, i + 1)]!.ca
      g = sub(add(a, c, 1).map((v) => v / 2) as Vec3, res[i]!.ca)
      if (Math.hypot(...g) < 1e-3) g = [0, 0, 1]
    }
    g = norm(g)
    if (i > 0 && dot(g, guides[i - 1]!) < 0) g = [-g[0], -g[1], -g[2]]
    guides.push(g)
  }
  const S = CARTOON_SEGMENTS
  const frames: { p: Vec3; n: Vec3; b: Vec3; w: number; h: number; c: [number, number, number]; ai: number }[] = []
  for (let i = 0; i < n - 1; i++) {
    const p0 = res[Math.max(0, i - 1)]!.ca, p1 = res[i]!.ca, p2 = res[i + 1]!.ca, p3 = res[Math.min(n - 1, i + 2)]!.ca
    const last = i === n - 2
    for (let s = 0; s < S + (last ? 1 : 0); s++) {
      const t = s / S
      const p = catmull(p0, p1, p2, p3, t)
      const pn = catmull(p0, p1, p2, p3, Math.min(1, t + 0.05))
      const pp = catmull(p0, p1, p2, p3, Math.max(0, t - 0.05))
      const tan = norm(sub(pn, pp))
      const g = norm(add(guides[i]!, guides[i + 1]!, 0).map((v, k) => v * (1 - t) + guides[i + 1]![k]! * t) as Vec3)
      let nn = norm(sub(g, [tan[0] * dot(g, tan), tan[1] * dot(g, tan), tan[2] * dot(g, tan)]))
      if (!Number.isFinite(nn[0])) nn = [0, 0, 1]
      const b = norm(cross(tan, nn))
      const arrow = res[i]!.ss === 'E' && res[i + 1]!.ss !== 'E'
      const r = arrow || t < 0.5 ? res[i]! : res[i + 1]!
      let w = 0.25, h = 0.25
      if (arrow) { w = 1.6 * (1 - t) + 0.25 * t; h = 0.22 }
      else if (r.ss === 'H') { w = 1.3; h = 0.22 }
      else if (r.ss === 'E') { w = 1.0; h = 0.22 }
      frames.push({ p, n: nn, b, w, h, c: r.color, ai: r.ai })
    }
  }
  sweep(mesh, frames)
}

/** P-trace tube (nucleic acids). */
export function traceTube(mesh: CartoonMesh, pts: { p: Vec3; color: [number, number, number]; ai: number }[]) {
  if (pts.length < 2) return
  cartoonSegment(mesh, pts.map((q) => ({ ca: q.p, ss: 'C' as const, color: q.color, ai: q.ai })))
}

/** Base "rung" tube from C1′ to the base N1/N3. */
export function rung(mesh: CartoonMesh, r: LadderRung, radius = 0.3) {
  const t = norm(sub(r.to, r.from))
  let ref: Vec3 = Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
  const nn = norm(cross(t, ref))
  ref = norm(cross(t, nn))
  sweep(mesh, [
    { p: r.from, n: nn, b: ref, w: radius, h: radius, c: r.color, ai: r.ai },
    { p: r.to, n: nn, b: ref, w: radius, h: radius, c: r.color, ai: r.ai },
  ])
}

/** Split an ordered residue list into contiguous runs (Cα–Cα ≤ maxGap). */
export function splitRuns<T extends { ca: Vec3 }>(res: T[], maxGap = 4.3): T[][] {
  const out: T[][] = []
  let cur: T[] = []
  for (const r of res) {
    if (cur.length && dist(cur[cur.length - 1]!.ca, r.ca) > maxGap) { out.push(cur); cur = [] }
    cur.push(r)
  }
  if (cur.length) out.push(cur)
  return out
}
