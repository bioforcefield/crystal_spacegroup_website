/**
 * Build SpaceGroupDemo from gemmi/ITA general-position JSON + catalog meta.
 * Hand-polished demos stay as overrides in registry.ts.
 */

import itaJson from './itaSpaceGroups.json'
import {
  SPACE_GROUPS,
  type CrystalSystemId,
} from './spaceGroupCatalog'
import {
  buildOperatorsFromTriplets,
  deriveElements,
  isGeometryLimited,
  type DerivedElements,
} from './groups'
import { CLASS_PALETTE_ORDER, SYMMETRY_CLASSES } from './symmetryPalette'
import type {
  CellParams,
  Operator,
  SpaceGroupDemo,
  SymmetryClassId,
  Vec3,
} from './types'

export interface ItaGroupRecord {
  number: number
  hm: string
  hmSpaced: string
  xhm: string
  hall: string
  system: string
  lattice: string
  multiplicity: number
  triplets: string[]
}

interface ItaFile {
  source: string
  version: string
  groups: ItaGroupRecord[]
}

const ITA = itaJson as ItaFile
const itaByNumber = new Map(ITA.groups.map((g) => [g.number, g]))
const catalogByNumber = new Map(SPACE_GROUPS.map((g) => [g.number, g]))
const demoCache = new Map<number, SpaceGroupDemo>()

const SEED: Vec3 = [0.17, 0.23, 0.31]

/** Prefer these classes when building a short teaching focus list. */
const FOCUS_CLASS_PRIORITY: SymmetryClassId[] = [
  'identity',
  'inversion',
  'twofold',
  'screw',
  'threefold',
  'fourfold',
  'sixfold',
  'mirror',
  'a-glide',
  'b-glide',
  'c-glide',
  'n-glide',
  'd-glide',
]

function teachingCell(system: CrystalSystemId): CellParams {
  switch (system) {
    case 'triclinic':
      return { a: 1, b: 1.15, c: 1.35, alphaDeg: 75, betaDeg: 85, gammaDeg: 100 }
    case 'monoclinic':
      return { a: 1, b: 1.15, c: 1.35, betaDeg: 110 }
    case 'orthorhombic':
      return { a: 1, b: 1.2, c: 1.4 }
    case 'tetragonal':
      return { a: 1, b: 1, c: 1.3 }
    case 'trigonal':
    case 'hexagonal':
      return { a: 1, b: 1, c: 1.5, gammaDeg: 120 }
    case 'cubic':
      return { a: 1, b: 1, c: 1 }
    default:
      return { a: 1, b: 1.2, c: 1.4 }
  }
}

function latticeLabel(letter: string): string {
  switch (letter.toUpperCase()) {
    case 'P':
      return 'Primitive'
    case 'C':
      return 'C-centred'
    case 'A':
      return 'A-centred'
    case 'B':
      return 'B-centred'
    case 'I':
      return 'I-centred'
    case 'F':
      return 'F-centred'
    case 'R':
      return 'Rhombohedral'
    default:
      return letter || 'Primitive'
  }
}

/** Rough point-group token: strip leading lattice letter from HM. */
function pointGroupGuess(hm: string): string {
  if (hm.length <= 1) return hm
  return hm.slice(1)
}

function polishOperators(ops: Operator[]): Operator[] {
  return ops.map((op) => {
    if (op.classId === 'identity') {
      const hasT = op.t.some((c) => Math.abs(((c % 1) + 1) % 1) > 1e-6)
      return {
        ...op,
        seitz: hasT ? op.seitz : '{1 | 0}',
        label: hasT ? op.label : 'Identity',
      }
    }
    if (op.classId === 'inversion') {
      const nearZero = op.t.every((c) => Math.abs(((c % 1) + 1) % 1) < 1e-6)
      return {
        ...op,
        seitz: nearZero ? '{-1 | 0}' : op.seitz,
        label: 'Inversion (−1)',
      }
    }
    return op
  })
}

/**
 * Short teaching list: identity + one representative per class (priority order),
 * capped so high-Z groups (Fd-3m = 192) do not spam chips.
 */
export function pickOperatorFocusIndices(
  ops: Operator[],
  maxFocus = 12,
): number[] | undefined {
  if (ops.length <= 16) return undefined
  const chosen: number[] = []
  const seenClass = new Set<SymmetryClassId>()

  const identity = ops.find((o) => o.index === 1) ?? ops[0]
  if (identity) {
    chosen.push(identity.index)
    seenClass.add(identity.classId)
  }

  for (const classId of FOCUS_CLASS_PRIORITY) {
    if (chosen.length >= maxFocus) break
    if (seenClass.has(classId)) continue
    const op = ops.find((o) => o.classId === classId && !chosen.includes(o.index))
    if (op) {
      chosen.push(op.index)
      seenClass.add(classId)
    }
  }

  // Fill remaining slots with early non-chosen ops for browsing
  for (const op of ops) {
    if (chosen.length >= maxFocus) break
    if (!chosen.includes(op.index)) chosen.push(op.index)
  }

  return chosen.sort((a, b) => a - b)
}

function classSummary(ops: Operator[]): string {
  const counts = new Map<string, number>()
  for (const op of ops) {
    if (op.classId === 'identity' && op.index === 1) continue
    const label = SYMMETRY_CLASSES[op.classId]?.label ?? op.classId
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  const parts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, n]) => `${n}× ${label}`)
  return parts.length ? parts.join(', ') : 'identity only'
}

function makeLocusFn(
  ops: Operator[],
  derived: DerivedElements,
): (opIndex: number) => string | null {
  const axisByOp = new Map(derived.axes.map((a) => [a.opIndex, a.locus]))
  const glideByOp = new Map(derived.glides.map((g) => [g.opIndex, g.locus]))
  const invOps = ops.filter((o) => o.classId === 'inversion')
  const invLocus = new Map<number, string>()
  for (let i = 0; i < invOps.length; i++) {
    const center = derived.inversions[i]
    const op = invOps[i]!
    if (center) {
      invLocus.set(op.index, `inversion at ${center.locus}`)
    }
  }

  return (opIndex: number) => {
    const op = ops.find((o) => o.index === opIndex)
    if (!op || op.classId === 'identity') return null
    const inv = invLocus.get(opIndex)
    if (inv) return inv
    const axis = axisByOp.get(opIndex)
    if (axis) return axis
    const glide = glideByOp.get(opIndex)
    if (glide) return glide
    return op.label
  }
}

function geometryNoteFor(
  system: CrystalSystemId,
  derived: DerivedElements,
): string {
  const hasAxis = derived.axes.length > 0
  const hasGlide = derived.glides.length > 0
  const bySystem: Record<CrystalSystemId, string> = {
    triclinic:
      'Triclinic teaching overlays are mostly inversions; remaining ops are listed by Seitz symbol only.',
    monoclinic:
      'Unique-b monoclinic axes/glides are drawn when axis-aligned; unusual settings may omit a locus.',
    orthorhombic:
      'Axis-aligned 2/2₁ and a/b/c/n/d glides are drawn; diagonal elements in uncommon settings may be missing.',
    tetragonal:
      '4/4ₙ ‖ c and axis-aligned mirrors/glides are drawn; some diagonal glides may still be omitted.',
    trigonal:
      '3/3ₙ ‖ c (hex setting) and some diagonal c-glides are drawn; rhombohedral-axis special loci may be limited.',
    hexagonal:
      '6/6ₙ and 3 ‖ c plus axis-aligned mirrors/glides are drawn; a few diagonal planes may still be omitted.',
    cubic:
      '〈100〉 axes, 〈111〉 body-diagonal 3-folds, and many diagonal mirrors/glides are drawn when detected; a minority of d-glide / off-origin loci may still be incomplete.',
  }
  const base = bySystem[system] ?? 'Some geometric overlays could not be derived for this group.'
  const coverage =
    hasAxis || hasGlide
      ? `Derived so far: ${derived.axes.length} axis locus(i), ${derived.glides.length} plane(s), ${derived.inversions.length} inversion(s).`
      : 'No axis/plane loci derived yet — operator list and colours remain complete.'
  return `Limited geometry — ${base} ${coverage}`
}

/** Build (and cache) a generated demo for ITA number 1–230. */
export function buildGeneratedDemo(n: number): SpaceGroupDemo | undefined {
  if (n < 1 || n > 230) return undefined
  const cached = demoCache.get(n)
  if (cached) return cached

  const raw = itaByNumber.get(n)
  const catalog = catalogByNumber.get(n)
  if (!raw || !catalog) return undefined

  const operators = polishOperators(buildOperatorsFromTriplets(raw.triplets))

  const derived = deriveElements(operators)
  const present = new Set(operators.map((o) => o.classId))
  const classLegendOrder = CLASS_PALETTE_ORDER.filter((id) =>
    present.has(id),
  ) as SymmetryClassId[]

  const primaryInversion =
    operators.find((o) => o.classId === 'inversion')?.index ?? 1

  const systemName =
    catalog.system.charAt(0).toUpperCase() + catalog.system.slice(1)
  const lattice = latticeLabel(raw.lattice || catalog.hm.charAt(0))
  const summary = classSummary(operators)
  const limited = isGeometryLimited(derived, operators)
  // Also mark limited when cubic/trigonal with many ops but few derived axes
  // relative to rotation classes (body diagonals missing).
  const rotationClasses = operators.some(
    (o) =>
      o.classId === 'threefold' ||
      o.classId === 'fourfold' ||
      (o.classId === 'twofold' &&
        !derived.axes.some((a) => a.opIndex === o.index)),
  )
  const geometryLimited =
    limited ||
    (rotationClasses &&
      derived.axes.length + derived.glides.length < Math.min(4, operators.length / 8))

  const focus = pickOperatorFocusIndices(operators)

  const demo: SpaceGroupDemo = {
    meta: {
      number: n,
      hm: catalog.hm,
      system: catalog.system,
      pointGroup: pointGroupGuess(catalog.hm),
      lattice,
      multiplicity: raw.multiplicity,
      blurb: `ITA No. ${n} · ${catalog.hm} — ${systemName}, ${lattice.toLowerCase()} lattice, Z=${raw.multiplicity} general positions. ${summary}. Generated from standard ITA general positions; click an operator to highlight BASE → IMAGE.`,
    },
    cell: teachingCell(catalog.system),
    seed: SEED,
    operators,
    symmetryClasses: SYMMETRY_CLASSES,
    classLegendOrder,
    screwAxes: derived.axes,
    inversionCenters: derived.inversions,
    glidePlanes: derived.glides,
    elementLocusForOp: makeLocusFn(operators, derived),
    defaultProjection: catalog.system === 'monoclinic' ? 'b' : 'c',
    primaryInversionOp: primaryInversion,
    shortName: catalog.hm,
    operatorFocusIndices: focus,
    geometryLimited: geometryLimited || undefined,
    geometryNote: geometryLimited
      ? geometryNoteFor(catalog.system, derived)
      : undefined,
  }

  demoCache.set(n, demo)
  return demo
}

export function getItaRecord(n: number): ItaGroupRecord | undefined {
  return itaByNumber.get(n)
}

export function itaGroupCount(): number {
  return ITA.groups.length
}
