/**
 * Helper to build hand-polished teaching demos from ITA triplets + curated copy.
 * Used for the second wave of hand demos beyond the original ~57.
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
} from './groups'
import { CLASS_PALETTE_ORDER, SYMMETRY_CLASSES } from './symmetryPalette'
import { pickOperatorFocusIndices } from './generatedDemo'
import type {
  CellParams,
  Operator,
  SpaceGroupDemo,
  SymmetryClassId,
  Vec3,
} from './types'
import { pickTeachingSeed } from './teachingSeed'
import { TEACHING_SEED_PREFER } from './teachingSeedOverrides'

interface ItaGroupRecord {
  number: number
  hm: string
  system: string
  lattice: string
  multiplicity: number
  triplets: string[]
}

const ITA = itaJson as { groups: ItaGroupRecord[] }
const itaByNumber = new Map(ITA.groups.map((g) => [g.number, g]))
const catalogByNumber = new Map(SPACE_GROUPS.map((g) => [g.number, g]))

function teachingCell(system: CrystalSystemId): CellParams {
  switch (system) {
    case 'triclinic':
      return { a: 1, b: 1.15, c: 1.35, alphaDeg: 75, betaDeg: 85, gammaDeg: 100 }
    case 'monoclinic':
      return { a: 1, b: 1.15, c: 1.35, betaDeg: 110 }
    case 'orthorhombic':
      return { a: 1, b: 1.2, c: 1.4 }
    case 'tetragonal':
      return { a: 1, b: 1, c: 1.35 }
    case 'trigonal':
    case 'hexagonal':
      return { a: 1, b: 1, c: 1.55, gammaDeg: 120 }
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
    case 'I':
      return 'I-centred'
    case 'F':
      return 'F-centred'
    case 'R':
      return 'Rhombohedral'
    default:
      return letter
  }
}

function pointGroupGuess(hm: string): string {
  // Rough teaching label from HM (not a full point-group derivation).
  const cleaned = hm.split(':')[0] ?? hm
  const m = cleaned.match(/[2346mincd]/gi)
  return m ? m.join('') : cleaned
}

export interface HandDemoSpec {
  number: number
  shortName: string
  blurb: string
  /** Override operator labels / classIds after ITA build. */
  relabel?: (op: Operator) => Operator
  classLegendOrder?: SymmetryClassId[]
  defaultProjection?: 'a' | 'b' | 'c'
  cell?: CellParams
  seed?: Vec3
}

export function makeHandDemo(spec: HandDemoSpec): SpaceGroupDemo {
  const raw = itaByNumber.get(spec.number)
  const catalog = catalogByNumber.get(spec.number)
  if (!raw || !catalog) {
    throw new Error(`makeHandDemo: missing ITA/catalog for ${spec.number}`)
  }
  let operators = buildOperatorsFromTriplets(raw.triplets)
  if (spec.relabel) operators = operators.map(spec.relabel)

  const derived = deriveElements(operators)
  const geometryLimited = isGeometryLimited(derived, operators)
  const legend =
    spec.classLegendOrder ??
    CLASS_PALETTE_ORDER.filter((id) =>
      operators.some((o) => o.classId === id),
    )

  const elementLocusForOp = (opIndex: number): string | null => {
    if (opIndex === 1) return null
    const ax = derived.axes.find((a) => a.opIndex === opIndex)
    if (ax) return ax.locus
    const gl = derived.glides.find((g) => g.opIndex === opIndex)
    if (gl) return gl.locus ?? gl.label
    const op = operators.find((o) => o.index === opIndex)
    if (op?.classId === 'inversion' && derived.inversions[0]) {
      return derived.inversions[0].locus
    }
    return null
  }

  const locusOps = new Set<number>([
    ...derived.axes.map((a) => a.opIndex),
    ...derived.glides.map((g) => g.opIndex),
    ...operators.filter((o) => o.classId === 'inversion').map((o) => o.index),
  ])
  const focus =
    pickOperatorFocusIndices(operators, 12, locusOps) ??
    [
      1,
      ...operators
        .filter((o) => o.classId !== 'identity')
        .slice(0, 5)
        .map((o) => o.index),
    ]

  return {
    meta: {
      number: spec.number,
      hm: catalog.hm,
      system: catalog.system,
      pointGroup: pointGroupGuess(catalog.hm),
      lattice: latticeLabel(raw.lattice),
      multiplicity: raw.multiplicity,
      blurb: spec.blurb,
    },
    cell: spec.cell ?? teachingCell(catalog.system),
    seed:
      spec.seed ??
      TEACHING_SEED_PREFER[spec.number] ??
      pickTeachingSeed(operators, spec.cell ?? teachingCell(catalog.system), raw.multiplicity),
    operators,
    symmetryClasses: SYMMETRY_CLASSES,
    classLegendOrder: legend.length ? legend : ['identity'],
    screwAxes: derived.axes,
    inversionCenters: derived.inversions,
    glidePlanes: derived.glides,
    elementLocusForOp,
    defaultProjection: spec.defaultProjection ?? 'c',
    primaryInversionOp: operators.find((o) => o.classId === 'inversion')?.index ?? 1,
    shortName: spec.shortName,
    geometryLimited,
    geometryNote: geometryLimited
      ? 'Some loci for this group are still limited; operator list is complete.'
      : undefined,
    operatorFocusIndices: focus,
    demoSource: 'hand',
  }
}
