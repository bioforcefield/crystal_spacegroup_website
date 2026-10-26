/** Lookup interactive demos by ITA number or slug. */

import { pbcaDemo } from './pbca'
import { c2cDemo } from './c2c'
import { p21cDemo } from './p21c'
import { pbar1Demo } from './pbar1'
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

const DEMOS: SpaceGroupDemo[] = [pbar1Demo, p21cDemo, c2cDemo, pbcaDemo]

const byNumber = new Map(DEMOS.map((d) => [d.meta.number, d]))
const bySlug = new Map(DEMOS.map((d) => [slugifyHm(d.meta.hm), d]))

export function getDemo(id: string | number): SpaceGroupDemo | undefined {
  if (typeof id === 'number') return byNumber.get(id)
  const q = id.trim().toLowerCase()
  const asNum = Number(q)
  if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= 230) {
    return byNumber.get(asNum)
  }
  return bySlug.get(slugifyHm(q))
}

export function allDemos(): SpaceGroupDemo[] {
  return DEMOS
}

export { pbar1Demo, p21cDemo, c2cDemo, pbcaDemo }
