/** Lookup interactive demos by ITA number or slug. */

import { pbcaDemo } from './pbca'
import { c2cDemo } from './c2c'
import { p21cDemo } from './p21c'
import { pbar1Demo } from './pbar1'
import { p212121Demo } from './p212121'
import { buildGeneratedDemo } from './generatedDemo'
import { findGroup } from './spaceGroupCatalog'
import type { SpaceGroupDemo } from './types'

/**
 * URL/lookup slug from an HM symbol.
 * Maps crystallographic bar (− / -) to the token `bar` so P-1 → pbar1
 * does not collide with P1 → p1. Other punctuation (e.g. /) is stripped:
 * P21/c → p21c, C2/c → c2c.
 */
export function slugifyHm(hm: string): string {
  return hm
    .toLowerCase()
    .replace(/-/g, 'bar')
    .replace(/[^a-z0-9]/g, '')
}

/** Hand-polished teaching demos — win over generated for these ITA numbers. */
const HAND_DEMOS: SpaceGroupDemo[] = [
  pbar1Demo,
  p21cDemo,
  c2cDemo,
  p212121Demo,
  pbcaDemo,
]

const handByNumber = new Map(HAND_DEMOS.map((d) => [d.meta.number, d]))
const handBySlug = new Map(HAND_DEMOS.map((d) => [slugifyHm(d.meta.hm), d]))

function resolveNumber(id: string | number): number | undefined {
  if (typeof id === 'number') {
    if (id >= 1 && id <= 230) return id
    return undefined
  }
  const q = id.trim().toLowerCase()
  const asNum = Number(q)
  if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= 230) return asNum
  return undefined
}

export function getDemo(id: string | number): SpaceGroupDemo | undefined {
  const n = resolveNumber(id)
  if (n !== undefined) {
    return handByNumber.get(n) ?? buildGeneratedDemo(n)
  }

  const q = String(id).trim().toLowerCase()
  if (!q) return undefined

  const byHandSlug = handBySlug.get(slugifyHm(q))
  if (byHandSlug) return byHandSlug

  const entry = findGroup(q)
  if (!entry) return undefined
  return handByNumber.get(entry.number) ?? buildGeneratedDemo(entry.number)
}

/** Hand-polished demos only (for fast golden-suite tests). */
export function allHandDemos(): SpaceGroupDemo[] {
  return HAND_DEMOS
}

/**
 * Golden demos used by the closure/orbit suite.
 * Full 1–230 coverage is via `getDemo(n)` — see generatedDemo tests.
 */
export function allDemos(): SpaceGroupDemo[] {
  return HAND_DEMOS
}

export { pbar1Demo, p21cDemo, c2cDemo, p212121Demo, pbcaDemo }
