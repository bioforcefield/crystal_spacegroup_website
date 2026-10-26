/**
 * Projection helpers for the interactive UCL/ITA-style 2D Pbca diagram.
 * Reuses SCREW_AXES / INVERSION_CENTERS / GLIDE_PLANES from symmetryElements.ts.
 */

import { CELL, type CellParams, type Vec3 } from './pbca'
import {
  GLIDE_PLANES,
  INVERSION_CENTERS,
  SCREW_AXES,
  type GlidePlaneSpec,
  type InversionCenterSpec,
  type ScrewAxisSpec,
} from './symmetryElements'

export type ProjectionDir = 'c' | 'b' | 'a'

export interface ProjectionInfo {
  dir: ProjectionDir
  /** Short toolbar label */
  label: string
  /** Axis labels for the projected edges (right, up) */
  axisU: string
  axisV: string
  /** Out-of-plane axis name */
  axisW: string
  /** Indices into Vec3 for (u, v, height) */
  uIndex: 0 | 1 | 2
  vIndex: 0 | 1 | 2
  wIndex: 0 | 1 | 2
  /** Physical size of the projected rectangle (for aspect) */
  sizeU: number
  sizeV: number
}

export const PROJECTIONS: Record<ProjectionDir, ProjectionInfo> = {
  c: {
    dir: 'c',
    label: '↓c (ab)',
    axisU: 'a',
    axisV: 'b',
    axisW: 'c',
    uIndex: 0,
    vIndex: 1,
    wIndex: 2,
    sizeU: CELL.a,
    sizeV: CELL.b,
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
    sizeU: CELL.a,
    sizeV: CELL.c,
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
    sizeU: CELL.b,
    sizeV: CELL.c,
  },
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

/** Format a fractional height for a site label (+.30, −.15, …). */
export function formatHeightLabel(w: number): string {
  const rounded = Math.round(w * 100) / 100
  const sign = rounded >= 0 ? '+' : '−'
  const body = Math.abs(rounded).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
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
  /** Footprint for end-on, or start of axis segment for in-plane */
  u: number
  v: number
  /** End of axis segment (in-plane only); same as (u,v) for end-on */
  u2: number
  v2: number
  /** Out-of-plane coordinate of axis (for height labels when useful) */
  w: number
}

/** Project a screw axis into the 2D diagram. */
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

  // Axis lies in (or parallel to) the projection plane: draw across the cell.
  const o = projectFrac(spec.origin, proj)
  const du = dir[proj.uIndex]
  // Parametrize so the segment spans the unit cell along the free coordinate.
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
  /** For trace: line from (u,v) to (u2,v2). For face: unused. */
  u: number
  v: number
  u2: number
  v2: number
  /** Plane height / constant along normal (fractional) */
  planeLabel: string
  /** Projected in-plane glide arrow (u,v components), or null if glide ‖ W */
  glideU: number
  glideV: number
  glideOutOfPlane: boolean
}

export function projectGlide(
  spec: GlidePlaneSpec,
  proj: ProjectionInfo,
): ProjectedGlide {
  const planeParallelToPage = spec.normalAxis === proj.wIndex

  if (planeParallelToPage) {
    const g = projectFrac(spec.glide, proj)
    return {
      spec,
      mode: 'face',
      u: 0,
      v: 0,
      u2: 1,
      v2: 1,
      planeLabel: formatQuarter(spec.planeValue),
      glideU: g.u,
      glideV: g.v,
      glideOutOfPlane: Math.abs(g.u) < 1e-9 && Math.abs(g.v) < 1e-9,
    }
  }

  // Vertical plane: trace is a line of constant projected coordinate.
  const constIsU = spec.normalAxis === proj.uIndex
  const constVal = spec.planeValue
  const g = projectFrac(spec.glide, proj)
  const glideOutOfPlane = Math.abs(g.u) < 1e-9 && Math.abs(g.v) < 1e-9

  if (constIsU) {
    return {
      spec,
      mode: 'trace',
      u: constVal,
      v: 0,
      u2: constVal,
      v2: 1,
      planeLabel: formatQuarter(spec.planeValue),
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
    planeLabel: formatQuarter(spec.planeValue),
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

/** Unique (u,v) footprints for inversion centers (collapse stacked heights). */
export function projectInversions(
  proj: ProjectionInfo,
): ProjectedInversion[] {
  const seen = new Map<string, ProjectedInversion>()
  for (const spec of INVERSION_CENTERS) {
    const { u, v, w } = projectFrac(spec.position, proj)
    const key = `${u.toFixed(3)},${v.toFixed(3)}`
    const existing = seen.get(key)
    if (!existing || (spec.primary && !existing.spec.primary)) {
      seen.set(key, { spec, u, v, w })
    }
  }
  return [...seen.values()]
}

export function allProjectedScrews(proj: ProjectionInfo): ProjectedScrew[] {
  return SCREW_AXES.map((s) => projectScrew(s, proj))
}

export function allProjectedGlides(proj: ProjectionInfo): ProjectedGlide[] {
  return GLIDE_PLANES.map((g) => projectGlide(g, proj))
}

/** Aspect size of the projected cell rectangle. */
export function projectedAspect(
  proj: ProjectionInfo,
  cell: CellParams = CELL,
): { width: number; height: number } {
  const sizes = [cell.a, cell.b, cell.c]
  return { width: sizes[proj.uIndex], height: sizes[proj.vIndex] }
}
