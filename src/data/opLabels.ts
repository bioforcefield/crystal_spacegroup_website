/**
 * UI labels for operators, derived from the exact Seitz pair (opClassify),
 * plus the shown lattice copy and the drawn motion for the current
 * placement (Near / Wrap). Placement itself is untouched.
 */
import { classifySeitz, describeMotion, fmtVec, shownLatticeShift, type OpClassification } from './opClassify'
import { placedPositions, type PlacementMode } from './nearestImages'
import type { Operator, SpaceGroupDemo, Vec3 } from './types'

const cache = new WeakMap<Operator, OpClassification>()

/** Canonical classification of the listed operator (its own triplet). */
export function opClass(op: Operator): OpClassification {
  let c = cache.get(op)
  if (!c) {
    c = classifySeitz(op.R, op.t)
    cache.set(op, c)
  }
  return c
}

export interface SelectionLabels {
  op: Operator
  canonical: OpClassification
  /** Lattice translation added by the shown BASE→IMAGE copy. */
  shift: Vec3
  shifted: boolean
  /** Classification of the shown copy (W, w + L). */
  shown: OpClassification
  /** True when the shown copy is a different kind / element type. */
  kindDiffers: boolean
  motion: string
  /** One-line caption: operation, shown copy (if different), motion. */
  caption: string
}

export function selectionLabels(
  demo: SpaceGroupDemo,
  selectedIndex: number,
  mode: PlacementMode,
): SelectionLabels {
  const op = demo.operators.find((o) => o.index === selectedIndex) ?? demo.operators[0]
  const canonical = opClass(op)
  const pl = placedPositions(demo, op.index, mode)
  const base = pl.points.find((p) => p.index === 1) ?? pl.points[0]
  const img = pl.points.find((p) => p.index === op.index) ?? base
  const shift = op.index === 1 ? ([0, 0, 0] as Vec3) : shownLatticeShift(op.R, op.t, base.fractional, img.fractional)
  const shifted = shift.some((x) => x !== 0)
  const shown = shifted
    ? classifySeitz(op.R, [op.t[0] + shift[0], op.t[1] + shift[1], op.t[2] + shift[2]])
    : canonical
  const kindDiffers =
    shown.kind !== canonical.kind || shown.short !== canonical.short
  const motion = op.index === 1 ? '' : describeMotion(shown)
  let caption = `Op ${op.index} (${op.triplet}): ${canonical.label}.`
  if (shifted) {
    caption += ` Shown copy adds lattice ${fmtVec(shift)}`
    caption += kindDiffers ? `, which is a ${shown.label}.` : ` (${shown.symbol}).`
  }
  if (motion) caption += ` ${motion}`
  return { op, canonical, shift, shifted, shown, kindDiffers, motion, caption }
}
