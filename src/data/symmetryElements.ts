/**
 * Symmetry-element specs live on each SpaceGroupDemo.
 * This module re-exports Pbca specs for any legacy imports.
 */

import { pbcaDemo } from './pbca'
import type {
  GlidePlaneSpec,
  InversionCenterSpec,
  ScrewAxisSpec,
  SymmetryClassId,
} from './types'

export type {
  ElementKind,
  ScrewAxisSpec,
  InversionCenterSpec,
  GlidePlaneSpec,
} from './types'

export const SCREW_AXES: ScrewAxisSpec[] = pbcaDemo.screwAxes
export const INVERSION_CENTERS: InversionCenterSpec[] =
  pbcaDemo.inversionCenters
export const GLIDE_PLANES: GlidePlaneSpec[] = pbcaDemo.glidePlanes

export function elementLocusForOp(opIndex: number): string | null {
  return pbcaDemo.elementLocusForOp(opIndex)
}

export function classColorId(id: SymmetryClassId): string {
  return pbcaDemo.symmetryClasses[id].color
}

export { CELL } from './pbca'
