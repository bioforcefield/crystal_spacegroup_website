/**
 * One authoritative source for the element class (and its colour) of every
 * operator on screen: chips, list swatches, motifs, ghost, legend, 2D and 3D
 * element overlays. Classes are derived from the exact Seitz pair with the
 * group's centring (opClassify), never from stored class ids or labels.
 */
import { centringOf, classifySeitz, hexBasisOf, type OpClassification } from './opClassify'
import type { Mat3, Operator, SpaceGroupDemo, Vec3 } from './types'

export type DisplayClassId =
  | 'identity'
  | 'twofold'
  | 'threefold'
  | 'fourfold'
  | 'sixfold'
  | 'screw'
  | 'inversion'
  | 'rotoinversion'
  | 'mirror'
  | 'a-glide'
  | 'b-glide'
  | 'c-glide'
  | 'n-glide'
  | 'd-glide'
  | 'e-glide'
  | 'g-glide'

export interface DisplayClass {
  id: DisplayClassId
  label: string
  color: string
}

const C = (id: DisplayClassId, label: string, color: string): DisplayClass => ({ id, label, color })

/** Palette (the historical class colours, plus three classes the data never had). */
export const DISPLAY_CLASSES: Record<DisplayClassId, DisplayClass> = {
  identity: C('identity', 'identity / translation', '#38bdf8'),
  twofold: C('twofold', '2-fold rotation', '#c4b5fd'),
  threefold: C('threefold', '3-fold rotation', '#67e8f9'),
  fourfold: C('fourfold', '4-fold rotation', '#a5b4fc'),
  sixfold: C('sixfold', '6-fold rotation', '#818cf8'),
  screw: C('screw', 'screw axis', '#a78bfa'),
  inversion: C('inversion', 'inversion centre', '#f472b6'),
  rotoinversion: C('rotoinversion', 'rotoinversion (3̄, 4̄, 6̄)', '#e879f9'),
  mirror: C('mirror', 'mirror', '#facc15'),
  'a-glide': C('a-glide', 'a-glide', '#fbbf24'),
  'b-glide': C('b-glide', 'b-glide', '#34d399'),
  'c-glide': C('c-glide', 'c-glide', '#fb923c'),
  'n-glide': C('n-glide', 'n-glide', '#2dd4bf'),
  'd-glide': C('d-glide', 'd-glide', '#f9a8d4'),
  'e-glide': C('e-glide', 'e-glide (double glide)', '#bef264'),
  'g-glide': C('g-glide', 'glide (other vector)', '#fca5a5'),
}

export const DISPLAY_CLASS_ORDER = Object.keys(DISPLAY_CLASSES) as DisplayClassId[]

export function displayClassId(c: OpClassification): DisplayClassId {
  switch (c.kind) {
    case 'identity':
    case 'translation':
      return 'identity'
    case 'rotation':
      return ({ 2: 'twofold', 3: 'threefold', 4: 'fourfold', 6: 'sixfold' } as const)[c.order as 2 | 3 | 4 | 6]
    case 'screw':
      return 'screw'
    case 'inversion':
      return 'inversion'
    case 'rotoinversion':
      return 'rotoinversion'
    case 'mirror':
      return 'mirror'
    case 'glide':
      return `${c.glideLetter ?? 'g'}-glide` as DisplayClassId
  }
}

export const displayClassOf = (c: OpClassification): DisplayClass => DISPLAY_CLASSES[displayClassId(c)]

const centringCache = new WeakMap<object, Vec3[]>()
/** Centring translations of a group, read from its own listed operators. */
export function groupCentring(demo: { operators: readonly Operator[] }): Vec3[] {
  let c = centringCache.get(demo.operators)
  if (!c) {
    c = centringOf(demo.operators)
    centringCache.set(demo.operators, c)
  }
  return c
}

const hexCache = new WeakMap<object, boolean>()
/** True when the group's operators are on hexagonal axes (glide letters n / d do not apply). */
export function groupHex(demo: { operators: readonly Operator[] }): boolean {
  let h = hexCache.get(demo.operators)
  if (h === undefined) {
    h = hexBasisOf(demo.operators)
    hexCache.set(demo.operators, h)
  }
  return h
}

/** Classify any coset member (W, w) of the group: centring + axes convention from its operators. */
export const classifyInGroup = (demo: { operators: readonly Operator[] }, W: Mat3, w: Vec3): OpClassification =>
  classifySeitz(W, w, groupCentring(demo), groupHex(demo))

const clsCache = new WeakMap<object, Map<Operator, OpClassification>>()
/** Canonical classification of a listed operator (its own triplet, group centring included). */
export function opClass(demo: { operators: readonly Operator[] }, op: Operator): OpClassification {
  let m = clsCache.get(demo.operators)
  if (!m) {
    m = new Map()
    clsCache.set(demo.operators, m)
  }
  let c = m.get(op)
  if (!c) {
    c = classifyInGroup(demo, op.R, op.t)
    m.set(op, c)
  }
  return c
}

export const opDisplayClass = (demo: { operators: readonly Operator[] }, op: Operator): DisplayClass =>
  displayClassOf(opClass(demo, op))

/** Legend: derived classes present among the listed operators (plus extras, e.g. a shown copy). */
export function legendClasses(demo: SpaceGroupDemo, extra: DisplayClassId[] = []): DisplayClass[] {
  const present = new Set<DisplayClassId>(extra)
  for (const op of demo.operators) present.add(displayClassId(opClass(demo, op)))
  return DISPLAY_CLASS_ORDER.filter((id) => present.has(id)).map((id) => DISPLAY_CLASSES[id])
}
