/** Lookup interactive demos by ITA number or slug. */

import { pbcaDemo } from './pbca'
import { c2cDemo } from './c2c'
import { p21cDemo } from './p21c'
import { pbar1Demo } from './pbar1'
import { p212121Demo } from './p212121'
import { pna21Demo } from './pna21'
import { p21Demo } from './p21'
import { ccDemo } from './cc'
import { p1Demo } from './p1'
import { pnmaDemo } from './pnma'
import { c2Demo } from './c2'
import { pbcnDemo } from './pbcn'
import { pca21Demo } from './pca21'
import { rbar3Demo } from './rbar3'
import { rbar3cDemo } from './rbar3c'
import { p41Demo } from './p41'
import { i41Demo } from './i41'
import { fd3mDemo } from './fd3m'
import { fm3mDemo } from './fm3m'
import { ia3dDemo } from './ia3d'
import { p2mDemo } from './p2m'
import { p4mmmDemo } from './p4mmm'
import { p63mmcDemo } from './p63mmc'
import { pm3mDemo } from './pm3m'
import { im3mDemo } from './im3m'
import { pmmmDemo } from './pmmm'
import { cmmmDemo } from './cmmm'
import { fmmmDemo } from './fmmm'
import { p6mmmDemo } from './p6mmm'
import { p42ncmDemo } from './p42ncm'
import { fm3Demo } from './fm3'
import { pbar3Demo } from './pbar3'
import { pcDemo } from './pc'
import { p21mDemo } from './p21m'
import { c2mDemo } from './c2m'
import { p2cDemo } from './p2c'
import { p21212Demo } from './p21212'
import { i41aDemo } from './i41a'
import { pccnDemo } from './pccn'
import { fdd2Demo } from './fdd2'
import { c2221Demo } from './c2221'
import { cmc21Demo } from './cmc21'
import { r3Demo } from './r3'
import { ibar4Demo } from './ibar4'
import { cmcaDemo } from './cmca'
import { p41212Demo } from './p41212'
import { p43212Demo } from './p43212'
import { p42nDemo } from './p42n'
import { fdddDemo } from './fddd'
import { p63mDemo } from './p63m'
import { p421cDemo } from './p421c'
import { pnnaDemo } from './pnna'
import { aba2Demo } from './aba2'
import { r3cDemo } from './r3c'
import { cmcmDemo } from './cmcm'
import { pbcmDemo } from './pbcm'
import { pa3Demo } from './pa3'
import { HAND_EXTRA_DEMOS } from './handExtra'
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
  p1Demo,
  pbar1Demo,
  p21Demo,
  c2Demo,
  pcDemo,
  ccDemo,
  p21mDemo,
  c2mDemo,
  p2cDemo,
  p21cDemo,
  c2cDemo,
  p21212Demo,
  p212121Demo,
  c2221Demo,
  pca21Demo,
  pna21Demo,
  cmc21Demo,
  fdd2Demo,
  pccnDemo,
  pbcnDemo,
  pbcaDemo,
  pnmaDemo,
  cmcaDemo,
  ibar4Demo,
  i41aDemo,
  p41212Demo,
  p43212Demo,
  r3Demo,
  rbar3Demo,
  rbar3cDemo,
  p41Demo,
  i41Demo,
  pbar3Demo,
  fd3mDemo,
  fm3mDemo,
  ia3dDemo,
  p2mDemo,
  p4mmmDemo,
  p63mmcDemo,
  pm3mDemo,
  im3mDemo,
  pmmmDemo,
  cmmmDemo,
  fmmmDemo,
  p6mmmDemo,
  p42ncmDemo,
  fm3Demo,
  p42nDemo,
  fdddDemo,
  p63mDemo,
  p421cDemo,
  pnnaDemo,
  aba2Demo,
  r3cDemo,
  cmcmDemo,
  pbcmDemo,
  pa3Demo,
  ...HAND_EXTRA_DEMOS,
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

function withHandSource(demo: SpaceGroupDemo): SpaceGroupDemo {
  if (!demo.demoSource) demo.demoSource = 'hand'
  return demo
}

export function getDemo(id: string | number): SpaceGroupDemo | undefined {
  return getDemoRaw(id)
}

function getDemoRaw(id: string | number): SpaceGroupDemo | undefined {
  const n = resolveNumber(id)
  if (n !== undefined) {
    const hand = handByNumber.get(n)
    return hand ? withHandSource(hand) : buildGeneratedDemo(n)
  }

  const q = String(id).trim().toLowerCase()
  if (!q) return undefined

  const byHandSlug = handBySlug.get(slugifyHm(q))
  if (byHandSlug) return withHandSource(byHandSlug)

  const entry = findGroup(q)
  if (!entry) return undefined
  const hand = handByNumber.get(entry.number)
  return hand ? withHandSource(hand) : buildGeneratedDemo(entry.number)
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

export {
  p1Demo,
  pbar1Demo,
  p21Demo,
  c2Demo,
  pcDemo,
  ccDemo,
  p21mDemo,
  c2mDemo,
  p2cDemo,
  p21cDemo,
  c2cDemo,
  p21212Demo,
  p212121Demo,
  c2221Demo,
  pca21Demo,
  pna21Demo,
  cmc21Demo,
  fdd2Demo,
  pccnDemo,
  pbcnDemo,
  pbcaDemo,
  pnmaDemo,
  cmcaDemo,
  ibar4Demo,
  i41aDemo,
  p41212Demo,
  p43212Demo,
  r3Demo,
  rbar3Demo,
  rbar3cDemo,
  p41Demo,
  i41Demo,
  pbar3Demo,
  fd3mDemo,
  fm3mDemo,
  ia3dDemo,
  p2mDemo,
  p4mmmDemo,
  p63mmcDemo,
  pm3mDemo,
  im3mDemo,
  pmmmDemo,
  cmmmDemo,
  fmmmDemo,
  p6mmmDemo,
  p42ncmDemo,
  fm3Demo,
  p42nDemo,
  fdddDemo,
  p63mDemo,
  p421cDemo,
  pnnaDemo,
  aba2Demo,
  r3cDemo,
  cmcmDemo,
  pbcmDemo,
  pa3Demo,
}
