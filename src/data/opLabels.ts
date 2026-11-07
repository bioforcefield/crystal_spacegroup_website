/**
 * UI labels for operators, derived from the exact Seitz pair (opClassify)
 * with the group's centring, plus the shown lattice copy and the drawn motion
 * for the current placement (Near / Wrap). Placement itself is untouched.
 */
import { classifySeitz, describeMotion, fmtVec, shownLatticeShift, type MotionText, type OpClassification } from './opClassify'
import { displayClassOf, groupCentring, opClass, type DisplayClass } from './elementClasses'
import { placedPositions, type PlacementMode } from './nearestImages'
import type { Operator, SpaceGroupDemo, Vec3 } from './types'

export { opClass }

export interface SelectionLabels {
  op: Operator
  canonical: OpClassification
  /** Lattice translation added by the shown BASE→IMAGE copy. */
  shift: Vec3
  shifted: boolean
  /** Classification of the shown copy (W, w + L). */
  shown: OpClassification
  /** Class (colour) of the shown copy — what the ghost and the highlighted element use. */
  shownClass: DisplayClass
  /** True when the shown copy is a different kind / element type. */
  kindDiffers: boolean
  motion: MotionText
  /** Short sentence for the canonical operation, e.g. "Op 4 (y,−x,z+¾): 4₁ screw ‖ c." */
  opSentence: string
  /** Shown-copy sentence ('' when the copy is the listed operation itself). */
  copySentence: string
  /** Concise screen-reader caption: operation, shown copy (if different), plain motion. */
  caption: string
}

export function selectionLabels(
  demo: SpaceGroupDemo,
  selectedIndex: number,
  mode: PlacementMode,
): SelectionLabels {
  const op = demo.operators.find((o) => o.index === selectedIndex) ?? demo.operators[0]
  const canonical = opClass(demo, op)
  let shift: Vec3 = [0, 0, 0]
  if (op.index !== 1) {
    const pl = placedPositions(demo, op.index, mode)
    const base = pl.points.find((p) => p.index === 1) ?? pl.points[0]
    const img = pl.points.find((p) => p.index === op.index) ?? base
    const L = shownLatticeShift(op.R, op.t, base.fractional, img.fractional)
    if (!L) throw new Error(`placement for op ${op.index} is not a lattice copy of the operation`)
    shift = L
  }
  const shifted = shift.some((x) => x !== 0)
  const shown = shifted
    ? classifySeitz(op.R, [op.t[0] + shift[0], op.t[1] + shift[1], op.t[2] + shift[2]], groupCentring(demo))
    : canonical
  const kindDiffers = shown.kind !== canonical.kind || shown.short !== canonical.short
  const motion: MotionText = op.index === 1 ? { plain: '', lead: '', notes: [] } : describeMotion(shown)
  const opSentence = `Op ${op.index} (${op.triplet}): ${canonical.label}.`
  let copySentence = ''
  if (shifted) {
    copySentence = `Shown copy adds lattice ${fmtVec(shift)}`
    copySentence += kindDiffers ? `, which is a ${shown.label}.` : ` (${shown.symbol}).`
  }
  const caption = [opSentence, copySentence, motion.plain].filter(Boolean).join(' ')
  return { op, canonical, shift, shifted, shown, shownClass: displayClassOf(shown), kindDiffers, motion, opSentence, copySentence, caption }
}
