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
  /**
   * Set when the drawn IMAGE is not W·BASE + w + (integer lattice vector)
   * (should never happen): the residual off the lattice, and the labels fall
   * back to the listed operation with no copy claimed.
   */
  copyResidual?: Vec3
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
  let copyResidual: Vec3 | undefined
  if (op.index !== 1) {
    const pl = placedPositions(demo, op.index, mode)
    const base = pl.points.find((p) => p.index === 1) ?? pl.points[0]
    const img = pl.points.find((p) => p.index === op.index) ?? base
    const L = shownLatticeShift(op.R, op.t, base.fractional, img.fractional)
    if (L) shift = L
    else {
      const raw = op.R.map((r, i) => r[0] * base.fractional[0] + r[1] * base.fractional[1] + r[2] * base.fractional[2] + op.t[i])
      const d = img.fractional.map((x, i) => x - raw[i])
      copyResidual = d.map((x) => Math.round((x - Math.round(x)) * 1e6) / 1e6) as Vec3
      if (import.meta.env?.DEV) {
        console.error(
          `[opLabels] SG ${demo.meta?.number ?? '?'} op ${op.index} (${mode}): drawn IMAGE is off the lattice copy of the operation by ${copyResidual.join(', ')} (base ${base.fractional.join(', ')}, image ${img.fractional.join(', ')})`,
        )
      }
    }
  }
  const shifted = shift.some((x) => x !== 0)
  const shown = shifted
    ? classifySeitz(op.R, [op.t[0] + shift[0], op.t[1] + shift[1], op.t[2] + shift[2]], groupCentring(demo))
    : canonical
  const kindDiffers = shown.kind !== canonical.kind || shown.short !== canonical.short
  let motion: MotionText = op.index === 1 ? { plain: '', lead: '', notes: [] } : describeMotion(shown)
  if (copyResidual) {
    const msg = `The drawn IMAGE is not an exact copy under this operation (off by ${fmtVec(copyResidual)}); the labels describe the listed operation and no element is highlighted.`
    motion = { plain: msg, lead: msg, notes: [] }
  }
  const opSentence = `Op ${op.index} (${op.triplet}): ${canonical.label}.`
  let copySentence = ''
  if (shifted) {
    copySentence = `Shown copy adds lattice ${fmtVec(shift)}`
    copySentence += kindDiffers ? `, which is a ${shown.label}.` : ` (${shown.symbol}).`
  }
  const caption = [opSentence, copySentence, motion.plain].filter(Boolean).join(' ')
  return { op, canonical, shift, shifted, copyResidual, shown, shownClass: displayClassOf(shown), kindDiffers, motion, opSentence, copySentence, caption }
}
