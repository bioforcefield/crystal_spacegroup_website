/**
 * Selectable chiral-motif representations for the space-group 3D cell viewer.
 * Pure data + validated localStorage persistence (no React / three here).
 */

export const MOTIF_STYLE_IDS = ['tetra', 'tribo', 'lopsy', 'classic'] as const
export type MotifStyleId = (typeof MOTIF_STYLE_IDS)[number]

/** First-visit default: C · Tetra Pebble. */
export const DEFAULT_MOTIF_STYLE: MotifStyleId = 'tetra'

/** Versioned key so a future schema change cannot misread old values. */
export const MOTIF_STYLE_STORAGE_KEY = 'csg.motifStyle.v1'

export const MOTIF_STYLE_OPTIONS: readonly {
  id: MotifStyleId
  label: string
  description: string
}[] = [
  {
    id: 'tetra',
    label: 'Tetra pebble',
    description: 'Rounded pebble with four distinct buds (ball, cube, cone, ring)',
  },
  {
    id: 'tribo',
    label: 'Tribo',
    description: 'Round buddy with three unequal, non-coplanar arms',
  },
  {
    id: 'lopsy',
    label: 'Lopsy',
    description: 'Lopsided critter with distinct ear, bud, tail and foot',
  },
  {
    id: 'classic',
    label: 'Classic L',
    description: 'Original L-shaped triad (ball, triangle, square, flag)',
  },
] as const

export function isMotifStyleId(v: unknown): v is MotifStyleId {
  return typeof v === 'string' && (MOTIF_STYLE_IDS as readonly string[]).includes(v)
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): StorageLike | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined
  } catch {
    return undefined
  }
}

/** Stored choice if valid, else the default. Never throws. */
export function readMotifStyle(storage: StorageLike | undefined = defaultStorage()): MotifStyleId {
  try {
    const raw = storage?.getItem(MOTIF_STYLE_STORAGE_KEY)
    return isMotifStyleId(raw) ? raw : DEFAULT_MOTIF_STYLE
  } catch {
    return DEFAULT_MOTIF_STYLE
  }
}

/** Persist a validated choice; ignores invalid ids and storage errors. */
export function writeMotifStyle(
  style: MotifStyleId,
  storage: StorageLike | undefined = defaultStorage(),
): void {
  if (!isMotifStyleId(style)) return
  try {
    storage?.setItem(MOTIF_STYLE_STORAGE_KEY, style)
  } catch {
    /* private mode / quota — keep in-memory choice */
  }
}
