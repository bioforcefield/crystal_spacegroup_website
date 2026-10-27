/**
 * Reuse a teaching space-group demo's element loci (screws, glides,
 * inversions, mirrors) but place them with the loaded CIF cell metric.
 * Fractional loci stay the same; only frac→Cartesian uses the real a,b,c,α,β,γ.
 *
 * When expansion used CIF-listed operators (non-standard setting / origin),
 * derive loci from those same operators so overlays match the packing.
 */
import {
  deriveElements,
  isGeometryLimited,
} from '../groups'
import { getDemo } from '../registry'
import {
  CLASS_PALETTE_ORDER,
  SYMMETRY_CLASSES,
} from '../symmetryPalette'
import type { CellParams, Operator, SpaceGroupDemo, Vec3 } from '../types'
import type { ExpandedStructure } from './types'

/** Count drawn geometric overlays (not operator chips). */
export function countDemoElements(demo: SpaceGroupDemo): number {
  return (
    demo.screwAxes.length +
    demo.inversionCenters.length +
    demo.glidePlanes.length
  )
}

/**
 * Return the ITA teaching demo for `spaceGroupNumber` with `cell` substituted.
 * Returns undefined when the SG is unknown or not in 1–230.
 */
export function demoWithCifCell(
  spaceGroupNumber: number | null | undefined,
  cell: CellParams,
): SpaceGroupDemo | undefined {
  if (spaceGroupNumber == null || spaceGroupNumber < 1 || spaceGroupNumber > 230) {
    return undefined
  }
  const demo = getDemo(spaceGroupNumber)
  if (!demo) return undefined
  return { ...demo, cell }
}

function locusFnFromDerived(
  ops: Operator[],
  axes: { opIndex: number; locus: string }[],
  glides: { opIndex: number; locus: string }[],
  inversions: { locus: string }[],
): (opIndex: number) => string | null {
  const axisByOp = new Map(axes.map((a) => [a.opIndex, a.locus]))
  const glideByOp = new Map(glides.map((g) => [g.opIndex, g.locus]))
  const invOps = ops.filter((o) => o.classId === 'inversion')
  const invLocus = new Map<number, string>()
  for (let i = 0; i < invOps.length; i++) {
    const center = inversions[i]
    const op = invOps[i]!
    if (center) invLocus.set(op.index, `inversion at ${center.locus}`)
  }
  return (opIndex: number) =>
    axisByOp.get(opIndex) ??
    glideByOp.get(opIndex) ??
    invLocus.get(opIndex) ??
    null
}

/**
 * Build a SpaceGroupDemo whose operators AND element loci match the
 * expanded structure (required for Near placement + overlays).
 *
 * - operatorSource === 'demo': hand/ITA teaching loci (best quality)
 * - otherwise: deriveElements from the structure's own operators
 */
export function elementsDemoForStructure(
  structure: ExpandedStructure,
): SpaceGroupDemo | undefined {
  const { operators, cell, spaceGroupNumber, operatorSource } = structure
  if (!operators.length) return undefined

  if (operatorSource === 'demo' && spaceGroupNumber != null) {
    return demoWithCifCell(spaceGroupNumber, cell)
  }

  const derived = deriveElements(operators)
  const limited = isGeometryLimited(derived, operators)
  const base =
    spaceGroupNumber != null ? getDemo(spaceGroupNumber) : undefined
  const invOp =
    operators.find((o) => o.classId === 'inversion')?.index ?? 0

  const seed: Vec3 = base?.seed ?? [0.17, 0.23, 0.31]
  return {
    meta: base?.meta ?? {
      number: spaceGroupNumber ?? 0,
      hm: structure.spaceGroupName ?? 'CIF',
      system: 'unknown',
      pointGroup: '?',
      lattice: '?',
      multiplicity: operators.length,
      blurb: 'CIF-listed operators',
    },
    cell,
    seed,
    operators,
    symmetryClasses: base?.symmetryClasses ?? SYMMETRY_CLASSES,
    classLegendOrder: base?.classLegendOrder ?? CLASS_PALETTE_ORDER,
    screwAxes: derived.axes,
    inversionCenters: derived.inversions,
    glidePlanes: derived.glides,
    elementLocusForOp: locusFnFromDerived(
      operators,
      derived.axes,
      derived.glides,
      derived.inversions,
    ),
    defaultProjection: base?.defaultProjection ?? 'c',
    primaryInversionOp: invOp,
    shortName: base?.shortName ?? structure.spaceGroupName ?? 'CIF',
    geometryLimited: limited || undefined,
    geometryNote: limited
      ? 'Some loci could not be derived for this setting — operator list remains complete'
      : undefined,
  }
}
