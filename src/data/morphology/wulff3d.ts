/**
 * Minimal 3D Wulff / relative-velocity habit from a small face set.
 * Teaching schematic: intersection of half-spaces n·r ≤ rate.
 * Not a full morphological construction for arbitrary point groups.
 */

import { fracToCart } from '../math'
import type { CellParams, Vec3 } from '../types'
import type { BfdhFace } from './bfdh'

export type FaceSpec3D = {
  label: string
  nx: number
  ny: number
  nz: number
  rate: number
}

export type WulffVertex3D = {
  x: number
  y: number
  z: number
  faces: [string, string, string]
}

export type WulffEdge3D = {
  a: number
  b: number
  faces: [string, string]
}

export type WulffResult3D = {
  vertices: WulffVertex3D[]
  edges: WulffEdge3D[]
  /** Triangle indices into vertices (fan per face, approximate). */
  triangles: [number, number, number][]
  warnings: string[]
}

const EPS = 1e-9

function norm3(x: number, y: number, z: number): Vec3 {
  const L = Math.hypot(x, y, z)
  if (L < EPS) return [1, 0, 0]
  return [x / L, y / L, z / L]
}

/** Solve Mᵀ n = (h,k,l) for Cartesian plane normal (M columns = lattice vectors). */
export function planeNormalCart(
  cell: CellParams,
  h: number,
  k: number,
  l: number,
): Vec3 {
  const ax = fracToCart([1, 0, 0], cell)
  const bx = fracToCart([0, 1, 0], cell)
  const cx = fracToCart([0, 0, 1], cell)
  // Mᵀ = [[ax0,ax1,ax2],[bx0,...],[cx0,...]]
  // Solve Mᵀ n = hkl via Cramer's / inverse of 3×3
  const A: Vec3[] = [
    [ax[0], ax[1], ax[2]],
    [bx[0], bx[1], bx[2]],
    [cx[0], cx[1], cx[2]],
  ]
  const rhs: Vec3 = [h, k, l]
  const det =
    A[0]![0]! * (A[1]![1]! * A[2]![2]! - A[1]![2]! * A[2]![1]!) -
    A[0]![1]! * (A[1]![0]! * A[2]![2]! - A[1]![2]! * A[2]![0]!) +
    A[0]![2]! * (A[1]![0]! * A[2]![1]! - A[1]![1]! * A[2]![0]!)
  if (Math.abs(det) < 1e-14) return norm3(h, k, l)
  const inv = (r: number, c: number) => {
    // cofactor of A[c][r] for inverse of A (we need A^{-1} * rhs but A is Mᵀ so n = (Mᵀ)^{-1} rhs)
    const m = [
      [A[0]![0]!, A[0]![1]!, A[0]![2]!],
      [A[1]![0]!, A[1]![1]!, A[1]![2]!],
      [A[2]![0]!, A[2]![1]!, A[2]![2]!],
    ]
    const c0 = (c + 1) % 3
    const c1 = (c + 2) % 3
    const r0 = (r + 1) % 3
    const r1 = (r + 2) % 3
    const cof =
      m[c0]![r0]! * m[c1]![r1]! - m[c0]![r1]! * m[c1]![r0]!
    // careful with orientation — use standard adjugate
    return cof
  }
  // Standard inverse
  const m00 = A[1]![1]! * A[2]![2]! - A[1]![2]! * A[2]![1]!
  const m01 = A[0]![2]! * A[2]![1]! - A[0]![1]! * A[2]![2]!
  const m02 = A[0]![1]! * A[1]![2]! - A[0]![2]! * A[1]![1]!
  const m10 = A[1]![2]! * A[2]![0]! - A[1]![0]! * A[2]![2]!
  const m11 = A[0]![0]! * A[2]![2]! - A[0]![2]! * A[2]![0]!
  const m12 = A[0]![2]! * A[1]![0]! - A[0]![0]! * A[1]![2]!
  const m20 = A[1]![0]! * A[2]![1]! - A[1]![1]! * A[2]![0]!
  const m21 = A[0]![1]! * A[2]![0]! - A[0]![0]! * A[2]![1]!
  const m22 = A[0]![0]! * A[1]![1]! - A[0]![1]! * A[1]![0]!
  void inv
  const n0 = (m00 * rhs[0] + m01 * rhs[1] + m02 * rhs[2]) / det
  const n1 = (m10 * rhs[0] + m11 * rhs[1] + m12 * rhs[2]) / det
  const n2 = (m20 * rhs[0] + m21 * rhs[1] + m22 * rhs[2]) / det
  return norm3(n0, n1, n2)
}

/** Expand BFDH forms to ±(hkl) face specs for a closed habit. */
export function bfdhFaces3D(
  cell: CellParams,
  ranked: BfdhFace[],
  maxForms = 6,
): FaceSpec3D[] {
  const out: FaceSpec3D[] = []
  const seen = new Set<string>()
  for (const f of ranked.slice(0, maxForms)) {
    const variants: [number, number, number][] = [
      [f.h, f.k, f.l],
      [-f.h, -f.k, -f.l],
    ]
    // Add sign flips of individual indices for low-symmetry teaching closure
    if (f.h !== 0) variants.push([-f.h, f.k, f.l], [f.h, -f.k, -f.l])
    if (f.k !== 0) variants.push([f.h, -f.k, f.l], [-f.h, f.k, -f.l])
    if (f.l !== 0) variants.push([f.h, f.k, -f.l], [-f.h, -f.k, f.l])
    for (const [h, k, l] of variants) {
      if (h === 0 && k === 0 && l === 0) continue
      const key = `${h},${k},${l}`
      if (seen.has(key)) continue
      seen.add(key)
      const [nx, ny, nz] = planeNormalCart(cell, h, k, l)
      out.push({ label: f.form, nx, ny, nz, rate: f.relativeR })
    }
  }
  return out
}

function planeIntersect(
  n1: Vec3,
  d1: number,
  n2: Vec3,
  d2: number,
  n3: Vec3,
  d3: number,
): Vec3 | null {
  // Solve n_i · r = d_i
  const det =
    n1[0] * (n2[1] * n3[2] - n2[2] * n3[1]) -
    n1[1] * (n2[0] * n3[2] - n2[2] * n3[0]) +
    n1[2] * (n2[0] * n3[1] - n2[1] * n3[0])
  if (Math.abs(det) < 1e-12) return null
  const x =
    (d1 * (n2[1] * n3[2] - n2[2] * n3[1]) -
      n1[1] * (d2 * n3[2] - n2[2] * d3) +
      n1[2] * (d2 * n3[1] - n2[1] * d3)) /
    det
  const y =
    (n1[0] * (d2 * n3[2] - n2[2] * d3) -
      d1 * (n2[0] * n3[2] - n2[2] * n3[0]) +
      n1[2] * (n2[0] * d3 - d2 * n3[0])) /
    det
  const z =
    (n1[0] * (n2[1] * d3 - d2 * n3[1]) -
      n1[1] * (n2[0] * d3 - d2 * n3[0]) +
      d1 * (n2[0] * n3[1] - n2[1] * n3[0])) /
    det
  if (![x, y, z].every(Number.isFinite)) return null
  return [x, y, z]
}

function insideAll(p: Vec3, normals: Vec3[], dists: number[]): boolean {
  for (let i = 0; i < normals.length; i++) {
    const n = normals[i]!
    if (n[0] * p[0] + n[1] * p[1] + n[2] * p[2] > dists[i]! + 1e-5) return false
  }
  return true
}

/**
 * Build a closed 3D habit as the intersection of half-spaces n·r ≤ rate.
 */
export function wulffPolyhedron3D(faces: FaceSpec3D[]): WulffResult3D {
  const warnings: string[] = []
  const usable = faces.filter(
    (f) => f.rate > EPS && Math.hypot(f.nx, f.ny, f.nz) > EPS,
  )
  if (usable.length < 4) {
    return {
      vertices: [],
      edges: [],
      triangles: [],
      warnings: ['Need at least four half-spaces for a 3D outline.'],
    }
  }
  if (usable.length > 36) {
    warnings.push('Large face set — using first 36 half-spaces.')
  }
  const limited = usable.slice(0, 36)
  const normals = limited.map((f) => norm3(f.nx, f.ny, f.nz))
  const dists = limited.map((f) => f.rate)
  const labels = limited.map((f) => f.label)

  const raw: WulffVertex3D[] = []
  const n = limited.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const p = planeIntersect(
          normals[i]!,
          dists[i]!,
          normals[j]!,
          dists[j]!,
          normals[k]!,
          dists[k]!,
        )
        if (!p || !insideAll(p, normals, dists)) continue
        // Dedup
        let dup = false
        for (const v of raw) {
          if (
            Math.hypot(v.x - p[0], v.y - p[1], v.z - p[2]) < 1e-4
          ) {
            dup = true
            break
          }
        }
        if (dup) continue
        raw.push({
          x: p[0],
          y: p[1],
          z: p[2],
          faces: [labels[i]!, labels[j]!, labels[k]!],
        })
      }
    }
  }

  if (raw.length < 4) {
    return {
      vertices: raw,
      edges: [],
      triangles: [],
      warnings: [
        ...warnings,
        'Could not close a polyhedron from these rates — try enabling more forms.',
      ],
    }
  }

  // Edges: vertex pairs that share two face labels
  const edges: WulffEdge3D[] = []
  for (let a = 0; a < raw.length; a++) {
    for (let b = a + 1; b < raw.length; b++) {
      const fa = new Set(raw[a]!.faces)
      const shared = raw[b]!.faces.filter((f) => fa.has(f))
      if (shared.length >= 2) {
        edges.push({
          a,
          b,
          faces: [shared[0]!, shared[1]!],
        })
      }
    }
  }

  // Rough triangles: fan from centroid of each unique face label
  const triangles: [number, number, number][] = []
  const byFace = new Map<string, number[]>()
  for (let i = 0; i < raw.length; i++) {
    for (const lab of raw[i]!.faces) {
      if (!byFace.has(lab)) byFace.set(lab, [])
      byFace.get(lab)!.push(i)
    }
  }
  for (const idxs of byFace.values()) {
    const uniq = [...new Set(idxs)]
    if (uniq.length < 3) continue
    // Order around face normal via projected angle
    const cx =
      uniq.reduce((s, i) => s + raw[i]!.x, 0) / uniq.length
    const cy =
      uniq.reduce((s, i) => s + raw[i]!.y, 0) / uniq.length
    const cz =
      uniq.reduce((s, i) => s + raw[i]!.z, 0) / uniq.length
    // Build a local frame from first edge
    const p0 = raw[uniq[0]!]!
    let ex = p0.x - cx
    let ey = p0.y - cy
    let ez = p0.z - cz
    const eL = Math.hypot(ex, ey, ez) || 1
    ex /= eL
    ey /= eL
    ez /= eL
    // Normal ~ (p1-c) × (p0-c)
    const p1 = raw[uniq[1]!]!
    let nx = (p0.y - cy) * (p1.z - cz) - (p0.z - cz) * (p1.y - cy)
    let ny = (p0.z - cz) * (p1.x - cx) - (p0.x - cx) * (p1.z - cz)
    let nz = (p0.x - cx) * (p1.y - cy) - (p0.y - cy) * (p1.x - cx)
    const nL = Math.hypot(nx, ny, nz) || 1
    nx /= nL
    ny /= nL
    nz /= nL
    // Second axis
    let ux = ny * ez - nz * ey
    let uy = nz * ex - nx * ez
    let uz = nx * ey - ny * ex
    const ordered = [...uniq].sort((ia, ib) => {
      const a = raw[ia]!
      const b = raw[ib]!
      const aa = Math.atan2(
        (a.x - cx) * ux + (a.y - cy) * uy + (a.z - cz) * uz,
        (a.x - cx) * ex + (a.y - cy) * ey + (a.z - cz) * ez,
      )
      const bb = Math.atan2(
        (b.x - cx) * ux + (b.y - cy) * uy + (b.z - cz) * uz,
        (b.x - cx) * ex + (b.y - cy) * ey + (b.z - cz) * ez,
      )
      return aa - bb
    })
    for (let t = 1; t < ordered.length - 1; t++) {
      triangles.push([ordered[0]!, ordered[t]!, ordered[t + 1]!])
    }
  }

  return { vertices: raw, edges, triangles, warnings }
}
