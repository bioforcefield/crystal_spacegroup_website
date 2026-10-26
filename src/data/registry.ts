/** Lookup interactive demos by ITA number or slug. */

import { pbcaDemo } from './pbca'
import { c2cDemo } from './c2c'
import { p21cDemo } from './p21c'
import type { SpaceGroupDemo } from './types'

const DEMOS: SpaceGroupDemo[] = [p21cDemo, c2cDemo, pbcaDemo]

const byNumber = new Map(DEMOS.map((d) => [d.meta.number, d]))
const bySlug = new Map(
  DEMOS.map((d) => [
    d.meta.hm.toLowerCase().replace(/[^a-z0-9]/g, ''),
    d,
  ]),
)

export function getDemo(id: string | number): SpaceGroupDemo | undefined {
  if (typeof id === 'number') return byNumber.get(id)
  const q = id.trim().toLowerCase()
  const asNum = Number(q)
  if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= 230) {
    return byNumber.get(asNum)
  }
  return bySlug.get(q.replace(/[^a-z0-9]/g, ''))
}

export function allDemos(): SpaceGroupDemo[] {
  return DEMOS
}

export { p21cDemo, c2cDemo, pbcaDemo }
