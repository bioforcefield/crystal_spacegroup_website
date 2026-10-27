/**
 * Habit labels from a 2D Wulff outline / growth-rate ratios.
 * Thresholds are teaching conventions, not industrial specs.
 */

export type HabitKind =
  | 'cube'
  | 'octagon'
  | 'prism'
  | 'plate'
  | 'needle'
  | 'unknown'

export type HabitInfo = {
  kind: HabitKind
  label: string
  blurb: string
}

/**
 * Classify from outline aspect and whether diagonal faces are expressed.
 */
export function classifyHabit(opts: {
  aspect: number
  /** True if {110} (or other cut) faces appear on the outline */
  hasDiagonalFaces: boolean
  /** Ra/Rb ratio of orthogonal face rates (≈1 = isotropic in plane) */
  orthoRatio: number
}): HabitInfo {
  const { aspect, hasDiagonalFaces, orthoRatio } = opts
  const aniso = Math.max(orthoRatio, 1 / Math.max(orthoRatio, 1e-9))

  if (aspect >= 4.5 || aniso >= 4.5) {
    return {
      kind: 'needle',
      label: 'Needle',
      blurb:
        'One direction grows much faster — the outline is highly elongated.',
    }
  }
  if (aspect >= 2.2 || aniso >= 2.2) {
    return {
      kind: 'plate',
      label: aspect >= 2.2 && aniso < 2.2 ? 'Plate / lath' : 'Plate',
      blurb:
        'Moderate anisotropy: slower faces dominate the wide sides; habit flattens or elongates.',
    }
  }
  if (aniso >= 1.35 || aspect >= 1.35) {
    return {
      kind: 'prism',
      label: 'Prism',
      blurb:
        'Slightly anisotropic rates stretch a square into a rectangular prism habit (2D).',
    }
  }
  if (hasDiagonalFaces) {
    return {
      kind: 'octagon',
      label: 'Truncated / octagon',
      blurb:
        'Diagonal {110} faces cut the corners — classic cube→octagon transition when R{110} is low enough.',
    }
  }
  return {
    kind: 'cube',
    label: 'Cube / square',
    blurb:
      'Nearly equal orthogonal rates and distant diagonals → square outline (2D stand-in for cubic habit).',
  }
}

/** Preset slider bundles for demos. */
export const HABIT_PRESETS: {
  id: string
  label: string
  Ra: number
  Rb: number
  Rc: number
}[] = [
  { id: 'cube', label: 'Cube', Ra: 1, Rb: 1, Rc: 1.6 },
  { id: 'octagon', label: 'Octagon', Ra: 1, Rb: 1, Rc: 0.95 },
  { id: 'prism', label: 'Prism', Ra: 1, Rb: 1.45, Rc: 1.7 },
  { id: 'plate', label: 'Plate', Ra: 1, Rb: 2.6, Rc: 2.2 },
  { id: 'needle', label: 'Needle', Ra: 1, Rb: 5, Rc: 4 },
]
