/**
 * Symmetry-element geometry for every overlay (3D cell, 2D projection, CIF
 * map), derived from the exact classification of each operation — never
 * from the stored screwAxes / glidePlanes / inversionCenters, which are
 * kept only for the (unchanged) placement scoring.
 *
 *  - Context: every operator's canonical element, all lattice translates
 *    that meet the unit cell, merged per geometric element (an axis shows
 *    its highest-order operation, e.g. 4₂ rather than the 2 it contains).
 *  - Selection: the element of the copy that is actually shown (W, w + L),
 *    clipped to a box that covers the cell and the BASE / IMAGE motifs, so
 *    the highlighted axis / plane / centre is exactly the one the ghost uses.
 */
import { fmtFrac, type OpClassification } from './opClassify'
import { displayClassId, DISPLAY_CLASSES, classifyInGroup, type DisplayClassId } from './elementClasses'
import type { Mat3, SpaceGroupDemo, Vec3 } from './types'

export type ElementGeom =
  | { type: 'axis'; p0: Vec3; p1: Vec3; point: Vec3; dir: Vec3 }
  | { type: 'plane'; poly: Vec3[]; point: Vec3; normal: Vec3; offset: number }
  | { type: 'point'; pos: Vec3 }

export interface DisplayElement {
  key: string
  /** Listed operators whose canonical element (or a lattice translate) this is. */
  opIndices: number[]
  cls: OpClassification
  classId: DisplayClassId
  color: string
  /** Element symbol, e.g. "2₁", "4₂", "3̄", "1̄", "m", "b", "n", "g". */
  symbol: string
  geom: ElementGeom
  /** Inversion point of a rotoinversion axis. */
  centre?: Vec3
  /** Element glide vector (fractional) of a glide plane. */
  glide?: Vec3
  /** The operation (W, w) this element was derived from. */
  seitz: { R: Mat3; t: Vec3 }
  /** Every operation type found on this element (axis: e.g. 4, 4̄, 2 on a 4/m axis). */
  members: ElementMember[]
}

export interface Box {
  lo: Vec3
  hi: Vec3
}

export const UNIT_BOX: Box = { lo: [0, 0, 0], hi: [1, 1, 1] }
const EPS = 1e-7
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const scl = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const inBox = (p: Vec3, b: Box, tol = 1e-6) => p.every((x, i) => x >= b.lo[i] - tol && x <= b.hi[i] + tol)

/** Segment of the line p + λu inside the box (slab method), or null. */
export function clipLine(p: Vec3, u: Vec3, box: Box): [Vec3, Vec3] | null {
  let t0 = -Infinity
  let t1 = Infinity
  for (let i = 0; i < 3; i++) {
    if (Math.abs(u[i]) < EPS) {
      if (p[i] < box.lo[i] - 1e-6 || p[i] > box.hi[i] + 1e-6) return null
      continue
    }
    let a = (box.lo[i] - p[i]) / u[i]
    let b = (box.hi[i] - p[i]) / u[i]
    if (a > b) [a, b] = [b, a]
    t0 = Math.max(t0, a)
    t1 = Math.min(t1, b)
  }
  if (!(t1 - t0 > 1e-6)) return null
  return [add(p, scl(u, t0)), add(p, scl(u, t1))]
}

/** Convex polygon of the plane h·x = d inside the box, ordered around its centroid, or null. */
export function clipPlane(h: Vec3, d: number, box: Box): Vec3[] | null {
  const corners: Vec3[] = []
  for (const x of [box.lo[0], box.hi[0]]) for (const y of [box.lo[1], box.hi[1]]) for (const z of [box.lo[2], box.hi[2]]) corners.push([x, y, z])
  const pts: Vec3[] = []
  const push = (q: Vec3) => {
    if (!pts.some((r) => Math.abs(r[0] - q[0]) + Math.abs(r[1] - q[1]) + Math.abs(r[2] - q[2]) < 1e-7)) pts.push(q)
  }
  for (let i = 0; i < 8; i++)
    for (let j = i + 1; j < 8; j++) {
      const a = corners[i]
      const b = corners[j]
      const diff = sub(b, a)
      if (diff.filter((x) => Math.abs(x) > EPS).length !== 1) continue // box edges only
      const fa = dot(h, a) - d
      const fb = dot(h, b) - d
      if (Math.abs(fa) < 1e-9) push(a)
      if (Math.abs(fb) < 1e-9) push(b)
      if (fa * fb < 0) push(add(a, scl(diff, fa / (fa - fb))))
    }
  if (pts.length < 3) return null
  const c = scl(pts.reduce((s, q) => add(s, q), [0, 0, 0] as Vec3), 1 / pts.length)
  // In-plane frame for angular ordering (affine, so convex order is preserved).
  const e1 = sub(pts[0], c)
  const e2 = cross(h, e1)
  pts.sort((p, q) => {
    const a = Math.atan2(dot(sub(p, c), e2), dot(sub(p, c), e1))
    const b = Math.atan2(dot(sub(q, c), e2), dot(sub(q, c), e1))
    return a - b
  })
  // Reject degenerate (zero-area) polygons, e.g. a plane touching only an edge.
  let area = 0
  for (let i = 1; i + 1 < pts.length; i++) {
    const cr = cross(sub(pts[i], pts[0]), sub(pts[i + 1], pts[0]))
    area += Math.hypot(...cr)
  }
  return area > 1e-6 ? pts : null
}

/** Element symbol for an overlay (the element type, not the operation). */
export function elementSymbol(c: OpClassification): string {
  switch (c.kind) {
    case 'rotation':
      return String(c.order)
    case 'screw':
      return c.short
    case 'rotoinversion':
      return `${c.order}\u0304`
    case 'inversion':
      return '1\u0304'
    case 'mirror':
      return 'm'
    case 'glide':
      return c.glideLetter ?? 'g'
    default:
      return ''
  }
}

/** The element of one classified operation, clipped to a box (null when it misses the box). */
export function elementInBox(c: OpClassification, box: Box): ElementGeom | null {
  switch (c.kind) {
    case 'rotation':
    case 'screw':
    case 'rotoinversion': {
      const seg = clipLine(c.point, c.axis!, box)
      return seg ? { type: 'axis', p0: seg[0], p1: seg[1], point: c.point, dir: c.axis! } : null
    }
    case 'mirror':
    case 'glide': {
      const h = c.normal!
      const d = dot(h, c.point)
      const poly = clipPlane(h, d, box)
      return poly ? { type: 'plane', poly, point: c.point, normal: h, offset: d } : null
    }
    case 'inversion':
      return inBox(c.centre!, box) ? { type: 'point', pos: c.centre! } : null
    default:
      return null
  }
}

/** Box covering the unit cell and the given fractional points, padded. */
export function boxAround(points: Vec3[], pad = 0.15): Box {
  const lo: Vec3 = [0, 0, 0]
  const hi: Vec3 = [1, 1, 1]
  for (const p of points)
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], p[i] - pad)
      hi[i] = Math.max(hi[i], p[i] + pad)
    }
  return { lo, hi }
}

const r6 = (x: number) => (Math.abs(x) < 5e-7 ? 0 : Math.round(x * 1e5) / 1e5)
const vkey = (v: Vec3) => v.map(r6).join(',')

function geomKey(g: ElementGeom): string {
  if (g.type === 'point') return `p:${vkey(g.pos)}`
  if (g.type === 'axis') {
    const [a, b] = [vkey(g.p0), vkey(g.p1)].sort()
    return `a:${a}|${b}`
  }
  return `pl:${g.normal.join(',')}:${r6(g.offset)}`
}

/**
 * Which operation names an axis shared by several operations (the others are
 * kept in `members` and, where ITA has one, a composite symbol):
 *  - higher order first, so 4̄ outranks the 2 it contains and 6̄ the 3;
 *  - at the same order a proper rotation / screw outranks the rotoinversion
 *    (4 with 4̄ is the 4/m axis, not a bare 4̄) …
 *  - … except 3̄, which contains the 3 on its axis and is the element (ITA).
 * Planes and points have one kind per locus (a lattice partner of a mirror
 * that is a glide lies on a different plane or is the same element type).
 */
export function rank(c: OpClassification): number {
  const proper = c.kind === 'rotation' || c.kind === 'screw'
  const bar = c.kind === 'rotoinversion'
  let sub = 0
  if (c.order === 3) sub = bar ? 2 : 1
  else sub = proper ? 2 : bar ? 1 : 0
  return c.order * 10 + sub
}

/** One operation type present on a shared element. */
export interface ElementMember {
  kind: OpClassification['kind']
  symbol: string
  centre?: Vec3
}

/**
 * ITA composite symbol for an axis carrying a proper n-fold (rotation or the
 * non-enantiomorphic screw n_{n/2}) and the same-order rotoinversion n̄: the
 * product of the two is a mirror ⊥ the axis, so the axis is n/m (4/m, 4₂/m,
 * 6/m, 6₃/m). Other coincidences keep the ranked symbol.
 */
export function compositeSymbol(top: OpClassification, members: ElementMember[]): string {
  const proper = top.kind === 'rotation' || (top.kind === 'screw' && top.screwM !== undefined && 2 * top.screwM === top.order)
  if (!proper || (top.order !== 4 && top.order !== 6)) return elementSymbol(top)
  const hasBar = members.some((m) => m.kind === 'rotoinversion' && m.symbol.startsWith(`${top.order}\u0304`))
  return hasBar ? `${elementSymbol(top)}/m` : elementSymbol(top)
}

function memberOf(c: OpClassification): ElementMember {
  return { kind: c.kind, symbol: elementSymbol(c), centre: c.kind === 'rotoinversion' ? c.centre : undefined }
}

function addMember(e: DisplayElement, c: OpClassification) {
  const m = memberOf(c)
  const same = (a: ElementMember) =>
    a.symbol === m.symbol && (!a.centre || !m.centre || a.centre.every((x, i) => Math.abs(x - m.centre![i]) < 1e-6))
  if (!e.members.some(same)) e.members.push(m)
}

function makeElement(c: OpClassification, geom: ElementGeom, opIndex: number, seitz: { R: Mat3; t: Vec3 }): DisplayElement {
  const classId = displayClassId(c)
  return {
    key: geomKey(geom),
    opIndices: [opIndex],
    cls: c,
    classId,
    color: DISPLAY_CLASSES[classId].color,
    symbol: elementSymbol(c),
    geom,
    centre: c.kind === 'rotoinversion' ? c.centre : undefined,
    glide: c.kind === 'glide' ? c.intrinsic : undefined,
    seitz,
    members: [memberOf(c)],
  }
}

const contextCache = new WeakMap<object, DisplayElement[]>()

/**
 * All symmetry elements of the group that meet the unit cell (derived;
 * cached per demo). Every operation (W, w + n) of the coset of a listed
 * operator is classified — its element can sit elsewhere and even be of a
 * different type (a mirror's lattice partner may be a glide, a 2's a 2₁).
 */
export function contextElements(demo: SpaceGroupDemo): DisplayElement[] {
  const hit = contextCache.get(demo.operators)
  if (hit) return hit
  const out = contextElementsInRange(demo, -1, 2)
  contextCache.set(demo.operators, out)
  return out
}

/** Uncached enumeration over coset members (W, w + n), n ∈ [lo, hi]³ (exported for the range test). */
export function contextElementsInRange(demo: SpaceGroupDemo, lo: number, hi: number): DisplayElement[] {
  const byKey = new Map<string, DisplayElement>()
  for (const op of demo.operators) {
    const isTranslation = op.R.every((r, i) => r.every((x, j) => x === (i === j ? 1 : 0)))
    if (isTranslation) continue
    for (let i = lo; i <= hi; i++)
      for (let j = lo; j <= hi; j++)
        for (let k = lo; k <= hi; k++) {
          const w: Vec3 = [op.t[0] + i, op.t[1] + j, op.t[2] + k]
          const tc = classifyInGroup(demo, op.R, w)
          const g = elementInBox(tc, UNIT_BOX)
          if (!g) continue
          const key = geomKey(g)
          const prev = byKey.get(key)
          if (!prev) byKey.set(key, makeElement(tc, g, op.index, { R: op.R, t: w }))
          else {
            if (!prev.opIndices.includes(op.index)) prev.opIndices.push(op.index)
            addMember(prev, tc)
            if (rank(tc) > rank(prev.cls)) {
              const next = makeElement(tc, g, op.index, { R: op.R, t: w })
              next.opIndices = prev.opIndices
              next.members = prev.members
              byKey.set(key, next)
            }
          }
        }
  }
  const out = [...byKey.values()]
  for (const e of out) {
    e.members.sort((a, b) => (a.symbol === e.symbol ? -1 : b.symbol === e.symbol ? 1 : 0))
    e.symbol = compositeSymbol(e.cls, e.members)
  }
  return out
}

/** Element of the shown copy, clipped to a box around the cell and the given motif positions. */
export function selectedElement(
  shown: OpClassification,
  opIndex: number,
  around: Vec3[],
  seitz: { R: Mat3; t: Vec3 },
): DisplayElement | null {
  let g = elementInBox(shown, boxAround(around))
  if (!g && around.length) {
    // The shown copy's element lies outside the cell (e.g. a body-centred
    // screw beyond the face): extend the box to its point nearest the motif.
    const m = scl(around.reduce((a, p) => add(a, p), [0, 0, 0] as Vec3), 1 / around.length)
    g = elementInBox(shown, boxAround([...around, footOn(shown, m)]))
  }
  return g ? makeElement(shown, g, opIndex, seitz) : null
}

/** Point of the element nearest m (fractional, for box extension only). */
function footOn(c: OpClassification, m: Vec3): Vec3 {
  if (c.axis) {
    const u = c.axis
    const s = dot(sub(m, c.point), u) / dot(u, u)
    return add(c.point, scl(u, s))
  }
  if (c.normal) {
    const h = c.normal
    const s = (dot(h, c.point) - dot(h, m)) / dot(h, h)
    return add(m, scl(h, s))
  }
  return c.centre ?? c.point
}

/** Short locus text with heights, for titles. */
export function elementTitle(e: DisplayElement): string {
  const extra = e.centre ? `; centre ${e.centre.map(fmtFrac).join(', ')}` : ''
  const base = `${e.cls.label}${e.cls.kind === 'inversion' ? '' : ` (${e.cls.locus}${extra})`}`
  const others = (e.members ?? []).filter((m) => m.symbol !== elementSymbol(e.cls))
  if (!others.length) return base
  const list = others.map((m) => (m.centre ? `${m.symbol} (centre ${m.centre.map(fmtFrac).join(', ')})` : m.symbol)).join(', ')
  return `${e.symbol} axis: ${base}; also ${list} on this axis`
}
