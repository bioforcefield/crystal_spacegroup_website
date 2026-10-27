/**
 * 2D Wulff-style outline from relative face growth rates.
 * Teaching schematic: distance from origin to face ∝ growth rate.
 * Not a full 3D Wulff construction for arbitrary point groups.
 */

export type Vec2 = { x: number; y: number }

export type FaceSpec = {
  /** Miller-style label for display, e.g. "{100}" */
  label: string
  /** Outward normal (need not be unit; will be normalized) */
  nx: number
  ny: number
  /** Relative growth rate / Wulff distance (> 0) */
  rate: number
}

export type WulffVertex = Vec2 & {
  /** Faces that meet at this vertex (labels) */
  faces: [string, string]
}

export type WulffResult = {
  vertices: WulffVertex[]
  /** Axis-aligned extents of the outline */
  width: number
  height: number
  aspect: number
}

const EPS = 1e-9

function norm2(nx: number, ny: number): Vec2 {
  const L = Math.hypot(nx, ny)
  if (L < EPS) return { x: 1, y: 0 }
  return { x: nx / L, y: ny / L }
}

function lineIntersect(
  n1: Vec2,
  d1: number,
  n2: Vec2,
  d2: number,
): Vec2 | null {
  const det = n1.x * n2.y - n1.y * n2.x
  if (Math.abs(det) < EPS) return null
  return {
    x: (d1 * n2.y - d2 * n1.y) / det,
    y: (n1.x * d2 - n2.x * d1) / det,
  }
}

function insideAll(
  p: Vec2,
  normals: Vec2[],
  dists: number[],
): boolean {
  for (let i = 0; i < normals.length; i++) {
    const n = normals[i]!
    if (n.x * p.x + n.y * p.y > dists[i]! + 1e-6) return false
  }
  return true
}

/**
 * Build the closed 2D crystal outline as the intersection of half-planes
 * n·r ≤ rate for each face.
 */
export function wulffPolygon2D(faces: FaceSpec[]): WulffResult {
  const usable = faces.filter((f) => f.rate > EPS && Math.hypot(f.nx, f.ny) > EPS)
  if (usable.length < 3) {
    return { vertices: [], width: 0, height: 0, aspect: 1 }
  }

  const normals = usable.map((f) => norm2(f.nx, f.ny))
  const dists = usable.map((f) => f.rate)
  const labels = usable.map((f) => f.label)

  const raw: WulffVertex[] = []
  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const p = lineIntersect(normals[i]!, dists[i]!, normals[j]!, dists[j]!)
      if (!p) continue
      if (!insideAll(p, normals, dists)) continue
      // Deduplicate near-duplicates
      const dup = raw.some(
        (v) => Math.hypot(v.x - p.x, v.y - p.y) < 1e-5,
      )
      if (dup) continue
      raw.push({
        x: p.x,
        y: p.y,
        faces: [labels[i]!, labels[j]!],
      })
    }
  }

  if (raw.length < 3) {
    return { vertices: [], width: 0, height: 0, aspect: 1 }
  }

  // Sort CCW around origin (centroid ≈ 0 for centered Wulff)
  const cx = raw.reduce((s, v) => s + v.x, 0) / raw.length
  const cy = raw.reduce((s, v) => s + v.y, 0) / raw.length
  raw.sort(
    (a, b) =>
      Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
  )

  const xs = raw.map((v) => v.x)
  const ys = raw.map((v) => v.y)
  const width = Math.max(...xs) - Math.min(...xs)
  const height = Math.max(...ys) - Math.min(...ys)
  const lo = Math.min(width, height)
  const hi = Math.max(width, height)
  const aspect = lo < EPS ? 1 : hi / lo

  return { vertices: raw, width, height, aspect }
}

/**
 * Teaching face set: anisotropic {100}/{010} plus optional {110} cuts.
 * Ra = rate of ±x faces, Rb = ±y, Rc = diagonal {110} family.
 */
export function teachingFaces2D(
  Ra: number,
  Rb: number,
  Rc: number,
): FaceSpec[] {
  const s = Math.SQRT1_2
  return [
    { label: '{100}', nx: 1, ny: 0, rate: Ra },
    { label: '{100}', nx: -1, ny: 0, rate: Ra },
    { label: '{010}', nx: 0, ny: 1, rate: Rb },
    { label: '{010}', nx: 0, ny: -1, rate: Rb },
    { label: '{110}', nx: s, ny: s, rate: Rc },
    { label: '{110}', nx: -s, ny: s, rate: Rc },
    { label: '{110}', nx: s, ny: -s, rate: Rc },
    { label: '{110}', nx: -s, ny: -s, rate: Rc },
  ]
}

/** Unique face families present on the outline (by label). */
export function activeFaceLabels(result: WulffResult): string[] {
  const set = new Set<string>()
  for (const v of result.vertices) {
    set.add(v.faces[0])
    set.add(v.faces[1])
  }
  return [...set].sort()
}
