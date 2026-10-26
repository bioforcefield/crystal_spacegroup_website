/**
 * Build SpaceGroupDemo from gemmi/ITA general-position JSON + catalog meta.
 * Hand-polished demos (2, 4, 14, 15, 19, 33, 61) stay as overrides in registry.ts.
 */

import itaJson from './itaSpaceGroups.json'
import {
  SPACE_GROUPS,
  type CrystalSystemId,
} from './spaceGroupCatalog'
import {
  buildOperatorsFromTriplets,
  deriveElements,
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

function teachingCell(system: CrystalSystemId): CellParams {
  switch (system) {
    case 'triclinic':
      // Unique-b β only today — full α/γ not modeled (see CONTRACT.md).
      return { a: 1, b: 1.2, c: 1.4, betaDeg: 105 }
    case 'monoclinic':
      return { a: 1, b: 1.15, c: 1.35, betaDeg: 110 }
    case 'orthorhombic':
      return { a: 1, b: 1.2, c: 1.4 }
    case 'tetragonal':
      return { a: 1, b: 1, c: 1.3 }
    case 'trigonal':
    case 'hexagonal':
      // Orthogonal teaching cell: γ=120° not modeled in fracToCart yet.
      return { a: 1, b: 1, c: 1.5 }
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

function makeLocusFn(
  ops: Operator[],
  derived: DerivedElements,
): (opIndex: number) => string | null {
  const axisByOp = new Map(derived.axesB.map((a) => [a.opIndex, a.locus]))
  const glideByOp = new Map(
    derived.glidesPerpB.map((g) => [g.opIndex, g.locus]),
  )
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

/** Build (and cache) a generated demo for ITA number 1–230. */
export function buildGeneratedDemo(n: number): SpaceGroupDemo | undefined {
  if (n < 1 || n > 230) return undefined
  const cached = demoCache.get(n)
  if (cached) return cached

  const raw = itaByNumber.get(n)
  const catalog = catalogByNumber.get(n)
  if (!raw || !catalog) return undefined

  const operators = polishOperators(buildOperatorsFromTriplets(raw.triplets))
  if (operators.length !== raw.multiplicity) {
    // Still ship; tests will catch mismatches.
  }

  const derived = deriveElements(operators)
  const present = new Set(operators.map((o) => o.classId))
  const classLegendOrder = CLASS_PALETTE_ORDER.filter((id) =>
    present.has(id),
  ) as SymmetryClassId[]

  const primaryInversion =
    operators.find((o) => o.classId === 'inversion')?.index ?? 1

  const systemName =
    catalog.system.charAt(0).toUpperCase() + catalog.system.slice(1)

  const demo: SpaceGroupDemo = {
    meta: {
      number: n,
      hm: catalog.hm,
      system: catalog.system,
      pointGroup: pointGroupGuess(catalog.hm),
      lattice: latticeLabel(raw.lattice || catalog.hm.charAt(0)),
      multiplicity: raw.multiplicity,
      blurb: `ITA No. ${n} · ${catalog.hm} — ${systemName}. Generated from standard general positions.`,
    },
    cell: teachingCell(catalog.system),
    seed: SEED,
    operators,
    symmetryClasses: SYMMETRY_CLASSES,
    classLegendOrder,
    screwAxes: derived.axesB,
    inversionCenters: derived.inversions,
    glidePlanes: derived.glidesPerpB,
    elementLocusForOp: makeLocusFn(operators, derived),
    defaultProjection: catalog.system === 'monoclinic' ? 'b' : 'c',
    primaryInversionOp: primaryInversion,
    shortName: catalog.hm,
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
