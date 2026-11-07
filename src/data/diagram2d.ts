/**
 * Projection helpers for interactive UCL/ITA-style 2D space-group diagrams.
 */

import { betaRad, gammaRad } from './math'
import type { DisplayElement } from './elementGeometry'
import type {
  CellParams,
  GlidePlaneSpec,
  InversionCenterSpec,
  ProjectionDir,
  ProjectionInfo,
  ScrewAxisSpec,
  SpaceGroupDemo,
  Vec3,
} from './types'

export type { ProjectionDir, ProjectionInfo }

export function buildProjections(cell: CellParams): Record<ProjectionDir, ProjectionInfo> {
  return {
    c: {
      dir: 'c',
      label: '↓c (ab)',
      axisU: 'a',
      axisV: 'b',
      axisW: 'c',
      uIndex: 0,
      vIndex: 1,
      wIndex: 2,
      sizeU: cell.a,
      sizeV: cell.b,
    },
    b: {
      dir: 'b',
      label: '↓b (ac)',
      axisU: 'a',
      axisV: 'c',
      axisW: 'b',
      uIndex: 0,
      vIndex: 2,
      wIndex: 1,
      sizeU: cell.a,
      sizeV: cell.c,
    },
    a: {
      dir: 'a',
      label: '↓a (bc)',
      axisU: 'b',
      axisV: 'c',
      axisW: 'a',
      uIndex: 1,
      vIndex: 2,
      wIndex: 0,
      sizeU: cell.b,
      sizeV: cell.c,
    },
  }
}

export const DEFAULT_PROJECTION: ProjectionDir = 'c'

export function projectFrac(
  p: Vec3,
  proj: ProjectionInfo,
): { u: number; v: number; w: number } {
  return {
    u: p[proj.uIndex],
    v: p[proj.vIndex],
    w: p[proj.wIndex],
  }
}

/**
 * Map fractional (u,v) in the projection plane to orthogonal drawing coords.
 * For ↓b (ac) with β ≠ 90°, returns a parallelogram embedding.
 */
export function planeEmbed(
  u: number,
  v: number,
  proj: ProjectionInfo,
  cell: CellParams,
): { x: number; y: number } {
  if (proj.dir === 'b') {
    const beta = betaRad(cell)
    const cosB = Math.cos(beta)
    const sinB = Math.sin(beta)
    return {
      x: u * cell.a + v * cell.c * cosB,
      y: v * cell.c * sinB,
    }
  }
  // ↓c (ab): hexagonal/trigonal γ ≠ 90° → parallelogram
  if (proj.dir === 'c') {
    const gamma = gammaRad(cell)
    const cosG = Math.cos(gamma)
    const sinG = Math.sin(gamma)
    return {
      x: u * cell.a + v * cell.b * cosG,
      y: v * cell.b * sinG,
    }
  }
  return { x: u * proj.sizeU, y: v * proj.sizeV }
}

export function formatHeightLabel(w: number): string {
  const rounded = Math.round(w * 100) / 100
  const sign = rounded >= 0 ? '+' : '−'
  const body = Math.abs(rounded)
    .toFixed(2)
    .replace(/0+$/, '')
    .replace(/\.$/, '')
  return `${sign}${body || '0'}`
}

export function formatQuarter(v: number): string {
  if (Math.abs(v - 0.25) < 1e-9) return '¼'
  if (Math.abs(v - 0.5) < 1e-9) return '½'
  if (Math.abs(v - 0.75) < 1e-9) return '¾'
  if (Math.abs(v) < 1e-9) return '0'
  return v.toFixed(2)
}

export type ScrewDrawMode = 'end-on' | 'in-plane'

export interface ProjectedScrew {
  spec: ScrewAxisSpec
  mode: ScrewDrawMode
  u: number
  v: number
  u2: number
  v2: number
  w: number
}

export function projectScrew(
  spec: ScrewAxisSpec,
  proj: ProjectionInfo,
): ProjectedScrew {
  const dir = spec.direction
  const axisAlongW =
    Math.abs(dir[proj.wIndex]) > 0.5 &&
    Math.abs(dir[proj.uIndex]) < 0.5 &&
    Math.abs(dir[proj.vIndex]) < 0.5

  if (axisAlongW) {
    const { u, v, w } = projectFrac(spec.origin, proj)
    return { spec, mode: 'end-on', u, v, u2: u, v2: v, w }
  }

  const o = projectFrac(spec.origin, proj)
  const du = dir[proj.uIndex]
  if (Math.abs(du) > 0.5) {
    return {
      spec,
      mode: 'in-plane',
      u: 0,
      v: o.v,
      u2: 1,
      v2: o.v,
      w: o.w,
    }
  }
  return {
    spec,
    mode: 'in-plane',
    u: o.u,
    v: 0,
    u2: o.u,
    v2: 1,
    w: o.w,
  }
}

export type GlideDrawMode = 'trace' | 'face'

export interface ProjectedGlide {
  spec: GlidePlaneSpec
  mode: GlideDrawMode
  u: number
  v: number
  u2: number
  v2: number
  planeLabel: string
  glideU: number
  glideV: number
  glideOutOfPlane: boolean
}

export function projectGlide(
  spec: GlidePlaneSpec,
  proj: ProjectionInfo,
): ProjectedGlide {
  const g = projectFrac(spec.glide, proj)
  const glideOutOfPlane = Math.abs(g.u) < 1e-9 && Math.abs(g.v) < 1e-9

  // Diagonal / explicit parallelogram: project corners → 2D trace or face.
  if (spec.corners && spec.corners.length === 4) {
    const pts = spec.corners.map((c) => projectFrac(c, proj))
    const wSpread =
      Math.max(...pts.map((p) => p.w)) - Math.min(...pts.map((p) => p.w))
    const label = spec.locus || spec.label
    // Nearly parallel to page → face (bounding box of projected corners)
    if (wSpread < 0.15) {
      const us = pts.map((p) => p.u)
      const vs = pts.map((p) => p.v)
      return {
        spec,
        mode: 'face',
        u: Math.min(...us),
        v: Math.min(...vs),
        u2: Math.max(...us),
        v2: Math.max(...vs),
        planeLabel: label,
        glideU: g.u,
        glideV: g.v,
        glideOutOfPlane,
      }
    }
    // Vertical / steep: use the in-plane edge with largest UV span as the trace
    let best = { u: pts[0].u, v: pts[0].v, u2: pts[1].u, v2: pts[1].v, len: 0 }
    for (let i = 0; i < 4; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % 4]
      const len = Math.hypot(b.u - a.u, b.v - a.v)
      if (len > best.len) best = { u: a.u, v: a.v, u2: b.u, v2: b.v, len }
    }
    return {
      spec,
      mode: 'trace',
      u: best.u,
      v: best.v,
      u2: best.u2,
      v2: best.v2,
      planeLabel: label,
      glideU: g.u,
      glideV: g.v,
      glideOutOfPlane,
    }
  }

  const planeParallelToPage = spec.normalAxis === proj.wIndex

  if (planeParallelToPage) {
    return {
      spec,
      mode: 'face',
      u: 0,
      v: 0,
      u2: 1,
      v2: 1,
      planeLabel: formatQuarter(spec.planeValue ?? 0),
      glideU: g.u,
      glideV: g.v,
      glideOutOfPlane,
    }
  }

  const constIsU = spec.normalAxis === proj.uIndex
  const constVal = spec.planeValue ?? 0

  if (constIsU) {
    return {
      spec,
      mode: 'trace',
      u: constVal,
      v: 0,
      u2: constVal,
      v2: 1,
      planeLabel: formatQuarter(constVal),
      glideU: g.u,
      glideV: g.v,
      glideOutOfPlane,
    }
  }
  return {
    spec,
    mode: 'trace',
    u: 0,
    v: constVal,
    u2: 1,
    v2: constVal,
    planeLabel: formatQuarter(constVal),
    glideU: g.u,
    glideV: g.v,
    glideOutOfPlane,
  }
}

export interface ProjectedInversion {
  spec: InversionCenterSpec
  u: number
  v: number
  w: number
}

export function projectInversions(
  centers: InversionCenterSpec[],
  proj: ProjectionInfo,
): ProjectedInversion[] {
  const seen = new Map<string, ProjectedInversion>()
  for (const spec of centers) {
    const { u, v, w } = projectFrac(spec.position, proj)
    const key = `${u.toFixed(3)},${v.toFixed(3)}`
    const existing = seen.get(key)
    if (!existing || (spec.primary && !existing.spec.primary)) {
      seen.set(key, { spec, u, v, w })
    }
  }
  return [...seen.values()]
}

export function allProjectedScrews(
  axes: ScrewAxisSpec[],
  proj: ProjectionInfo,
): ProjectedScrew[] {
  return axes.map((s) => projectScrew(s, proj))
}

export function allProjectedGlides(
  planes: GlidePlaneSpec[],
  proj: ProjectionInfo,
): ProjectedGlide[] {
  return planes.map((g) => projectGlide(g, proj))
}

export function projectedAspect(
  proj: ProjectionInfo,
  cell: CellParams,
): { width: number; height: number } {
  if (proj.dir === 'b') {
    const beta = betaRad(cell)
    const sinB = Math.sin(beta)
    // Bounding box of parallelogram
    const cosB = Math.cos(beta)
    const width = cell.a + Math.abs(cell.c * cosB)
    const height = cell.c * Math.abs(sinB)
    return { width, height }
  }
  if (proj.dir === 'c') {
    const gamma = gammaRad(cell)
    const cosG = Math.cos(gamma)
    const sinG = Math.sin(gamma)
    const width = cell.a + Math.abs(cell.b * cosG)
    const height = cell.b * Math.abs(sinG)
    return { width, height }
  }
  const sizes = [cell.a, cell.b, cell.c]
  return { width: sizes[proj.uIndex], height: sizes[proj.vIndex] }
}

export function demoProjections(demo: SpaceGroupDemo) {
  return buildProjections(demo.cell)
}

/* ---------- derived elements (elementGeometry) projected onto the page ---------- */


export type ProjectedElement =
  | { el: DisplayElement; mode: 'end-on'; u: number; v: number; w: number }
  | { el: DisplayElement; mode: 'line'; u: number; v: number; u2: number; v2: number; inclined: boolean; w: number | null }
  | { el: DisplayElement; mode: 'trace'; u: number; v: number; u2: number; v2: number }
  | { el: DisplayElement; mode: 'face'; w: number }
  | { el: DisplayElement; mode: 'inclined-plane'; poly: { u: number; v: number }[] }
  | { el: DisplayElement; mode: 'point'; u: number; v: number; w: number }

/**
 * Project one derived element along the viewing axis (fractional coordinate
 * w): axes ∥ w are end-on symbols, other axes are segments (inclined when
 * they also climb in w); planes containing w are traces, planes ⊥ w are
 * faces (height given), any other plane is an inclined polygon.
 */
export function projectElement(el: DisplayElement, proj: ProjectionInfo): ProjectedElement | null {
  const g = el.geom
  const P = (p: Vec3) => projectFrac(p, proj)
  if (g.type === 'point') {
    const q = P(g.pos)
    return { el, mode: 'point', u: q.u, v: q.v, w: q.w }
  }
  if (g.type === 'axis') {
    const d = projectFrac(g.dir, proj)
    if (Math.abs(d.u) < 1e-9 && Math.abs(d.v) < 1e-9) {
      const q = P(g.p0)
      return { el, mode: 'end-on', u: q.u, v: q.v, w: q.w }
    }
    const a = P(g.p0)
    const b = P(g.p1)
    if (Math.hypot(b.u - a.u, b.v - a.v) < 1e-6) return null
    const inclined = Math.abs(d.w) > 1e-9
    return { el, mode: 'line', u: a.u, v: a.v, u2: b.u, v2: b.v, inclined, w: inclined ? null : a.w }
  }
  const h = projectFrac(g.normal, proj)
  if (Math.abs(h.u) < 1e-9 && Math.abs(h.v) < 1e-9) return { el, mode: 'face', w: g.offset / h.w }
  const pts = g.poly.map(P)
  if (Math.abs(h.w) < 1e-9) {
    let best = { a: pts[0], b: pts[0], d: -1 }
    for (const a of pts)
      for (const b of pts) {
        const dd = Math.hypot(a.u - b.u, a.v - b.v)
        if (dd > best.d) best = { a, b, d: dd }
      }
    if (best.d < 1e-6) return null
    return { el, mode: 'trace', u: best.a.u, v: best.a.v, u2: best.b.u, v2: best.b.v }
  }
  return { el, mode: 'inclined-plane', poly: pts.map((p) => ({ u: p.u, v: p.v })) }
}

/** Dedupe projections that coincide on the page (same symbol, same 2D footprint). */
export function dedupeProjected(list: ProjectedElement[]): ProjectedElement[] {
  const seen = new Map<string, ProjectedElement>()
  const r = (x: number) => Math.round(x * 1e4) / 1e4
  for (const p of list) {
    let k = `${p.mode}:${p.el.symbol}:${p.el.classId}:`
    if (p.mode === 'end-on' || p.mode === 'point') k += `${r(p.u)},${r(p.v)}`
    else if (p.mode === 'line' || p.mode === 'trace') {
      const a = `${r(p.u)},${r(p.v)}`
      const b = `${r(p.u2)},${r(p.v2)}`
      k += [a, b].sort().join('|') + (p.mode === 'line' ? `:${p.w === null ? 'i' : r(p.w)}` : '')
    } else if (p.mode === 'face') k += r(((p.w % 1) + 1) % 1)
    else k += p.poly.map((q) => `${r(q.u)},${r(q.v)}`).sort().join('|')
    if (!seen.has(k)) seen.set(k, p)
  }
  return [...seen.values()]
}
