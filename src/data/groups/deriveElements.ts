/**
 * Basic symmetry-element loci from Seitz operators.
 *
 * Heuristics are tuned for unique-axis-b monoclinic (2 / 2₁ ‖ b and
 * mirrors/glides ⊥ b) plus generic inversions. Orthorhombic axes need
 * hand loci or a future generalisation — see CONTRACT.md.
 *
 * Tolerances: fractional ~1e-3 for classifying R; locus smoke tests ~0.02.
 */

import type {
  GlidePlaneSpec,
  InversionCenterSpec,
  Mat3,
  Operator,
  ScrewAxisSpec,
  SymmetryClassId,
  Vec3,
} from '../types'
import { wrap01 } from '../math'
import { matClose } from './composeOps'

const EPS = 1e-3

const NEG_I: Mat3 = [
  [-1, 0, 0],
  [0, -1, 0],
  [0, 0, -1],
]

/** 2-fold / screw about b: diag(−1, 1, −1). */
const TWO_B: Mat3 = [
  [-1, 0, 0],
  [0, 1, 0],
  [0, 0, -1],
]

/** Mirror / glide ⊥ b: diag(1, −1, 1). */
const MIRROR_B: Mat3 = [
  [1, 0, 0],
  [0, -1, 0],
  [0, 0, 1],
]


function fmtFrac(v: number): string {
  const w = wrap01(v)
  if (Math.abs(w) < 1e-6 || Math.abs(w - 1) < 1e-6) return '0'
  if (Math.abs(w - 0.25) < 1e-6) return '¼'
  if (Math.abs(w - 0.5) < 1e-6) return '½'
  if (Math.abs(w - 0.75) < 1e-6) return '¾'
  return w.toFixed(3)
}

/** Inversion centers for ops with R = −I: center at t/2 (mod 1). */
export function deriveInversions(ops: Operator[]): InversionCenterSpec[] {
  const out: InversionCenterSpec[] = []
  let sawPrimary = false
  for (const op of ops) {
    if (!matClose(op.R, NEG_I, EPS)) continue
    const position: Vec3 = [
      wrap01(op.t[0] / 2),
      wrap01(op.t[1] / 2),
      wrap01(op.t[2] / 2),
    ]
    const atOrigin =
      Math.abs(position[0]) < EPS &&
      Math.abs(position[1]) < EPS &&
      Math.abs(position[2]) < EPS
    const primary = atOrigin && !sawPrimary
    if (primary) sawPrimary = true
    out.push({
      position,
      primary,
      locus: `(${fmtFrac(position[0])}, ${fmtFrac(position[1])}, ${fmtFrac(position[2])})`,
    })
  }
  if (!sawPrimary && out.length > 0) out[0]!.primary = true
  return out
}

/**
 * For R ≈ diag(−1,1,−1): fixed point in xz from
 *   x' = −x + tx  ⇒  x0 = tx/2
 *   z' = −z + tz  ⇒  z0 = tz/2
 * Screw if |ty| ≈ ½ (mod 1); pure 2-fold if ty ≈ 0.
 */
export function deriveTwofoldOrScrewB(ops: Operator[]): ScrewAxisSpec[] {
  const out: ScrewAxisSpec[] = []
  for (const op of ops) {
    if (!matClose(op.R, TWO_B, EPS)) continue
    const x0 = wrap01(op.t[0] / 2)
    const z0 = wrap01(op.t[2] / 2)
    const ty = wrap01(op.t[1])
    const isScrew = Math.abs(ty - 0.5) < 0.08
    const kind: '2' | '21' = isScrew ? '21' : '2'
    out.push({
      origin: [x0, 0, z0],
      direction: [0, 1, 0],
      locus: `(${fmtFrac(x0)}, y, ${fmtFrac(z0)})`,
      opIndex: op.index,
      primary: out.filter((a) => a.opIndex === op.index).length === 0,
      kind,
    })
  }
  return out
}

/**
 * For R ≈ diag(1,−1,1): plane y = ty/2; glide = (tx, 0, tz)
 * (ty absorbed into plane location).
 */
export function deriveGlidesPerpB(ops: Operator[]): GlidePlaneSpec[] {
  const out: GlidePlaneSpec[] = []
  for (const op of ops) {
    if (!matClose(op.R, MIRROR_B, EPS)) continue
    const planeValue = wrap01(op.t[1] / 2)
    const glide: Vec3 = [wrap01(op.t[0]), 0, wrap01(op.t[2])]
    // Drop pure lattice translation in glide for classification
    const gx = Math.abs(glide[0]) > EPS && Math.abs(glide[0] - 1) > EPS
    const gz = Math.abs(glide[2]) > EPS && Math.abs(glide[2] - 1) > EPS
    let classId: Extract<
      SymmetryClassId,
      'a-glide' | 'b-glide' | 'c-glide' | 'n-glide'
    > = 'c-glide'
    let label = 'mirror ⊥ b'
    if (gx && gz) {
      classId = 'n-glide'
      label = 'n-glide'
    } else if (gx && !gz) {
      classId = 'a-glide'
      label = 'a-glide'
    } else if (!gx && gz) {
      classId = 'c-glide'
      label = 'c-glide'
    } else if (!gx && !gz) {
      // pure mirror — still report as c-glide class slot unused; use c-glide id
      // only if there is glide; for pure mirror keep c-glide label as 'mirror'
      classId = 'c-glide'
      label = 'mirror ⊥ b'
    }

    out.push({
      planeValue,
      normalAxis: 1,
      glide,
      label,
      classId,
      opIndex: op.index,
      primary: out.filter((g) => g.opIndex === op.index).length === 0,
      locus: `y = ${fmtFrac(planeValue)}, glide (${fmtFrac(glide[0])}, 0, ${fmtFrac(glide[2])})`,
    })
  }
  return out
}

export interface DerivedElements {
  inversions: InversionCenterSpec[]
  axesB: ScrewAxisSpec[]
  glidesPerpB: GlidePlaneSpec[]
}

export function deriveElements(ops: Operator[]): DerivedElements {
  return {
    inversions: deriveInversions(ops),
    axesB: deriveTwofoldOrScrewB(ops),
    glidesPerpB: deriveGlidesPerpB(ops),
  }
}

/** Near-equality for smoke tests (fractional). */
export function fracNear(a: number, b: number, tol = 0.02): boolean {
  const d = Math.abs(wrap01(a - b))
  return d <= tol || d >= 1 - tol
}

