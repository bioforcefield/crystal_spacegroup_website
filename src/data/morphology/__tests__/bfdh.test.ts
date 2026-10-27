import { describe, expect, it } from 'vitest'
import { rankBfdh, formLabel, canonicalHkl, uniqueFormRates, applyFormRates } from '../bfdh'
import {
  centeringFromHm,
  effectiveCentering,
  isAllowedByCentering,
  isRhombohedralSetting,
  harkerOrder,
} from '../centering'
import { dHkl, planeNormalAb } from '../dHkl'
import { wulffPolygon2D } from '../wulff2d'
import type { CellParams } from '../../types'

const cubic: CellParams = { a: 5, b: 5, c: 5 }
const ortho: CellParams = { a: 8, b: 6, c: 4 }
const mono: CellParams = { a: 10, b: 5, c: 8, betaDeg: 105 }

describe('dHkl', () => {
  it('matches a, b, c for orthogonal {100}/{010}/{001}', () => {
    expect(dHkl(ortho, 1, 0, 0)).toBeCloseTo(8, 6)
    expect(dHkl(ortho, 0, 1, 0)).toBeCloseTo(6, 6)
    expect(dHkl(ortho, 0, 0, 1)).toBeCloseTo(4, 6)
  })

  it('halves for (200)', () => {
    expect(dHkl(cubic, 2, 0, 0)).toBeCloseTo(2.5, 6)
  })

  it('handles monoclinic (100)', () => {
    const d = dHkl(mono, 1, 0, 0)
    expect(d).toBeGreaterThan(0)
    expect(d).toBeLessThan(mono.a)
  })
})

describe('centering / Harker', () => {
  it('parses HM lattice letter', () => {
    expect(centeringFromHm('P 21/c')).toBe('P')
    expect(centeringFromHm('C 2/c')).toBe('C')
    expect(centeringFromHm('F d -3 m')).toBe('F')
    expect(centeringFromHm('I4_1/amd')).toBe('I')
    expect(centeringFromHm('R -3 c :H')).toBe('R')
  })

  it('F-centering allows all-even / all-odd only', () => {
    expect(isAllowedByCentering('F', 1, 1, 1)).toBe(true)
    expect(isAllowedByCentering('F', 2, 0, 0)).toBe(true)
    expect(isAllowedByCentering('F', 1, 0, 0)).toBe(false)
    expect(isAllowedByCentering('F', 1, 1, 0)).toBe(false)
  })

  it('Harker order doubles (100) for F', () => {
    expect(harkerOrder('F', 1, 0, 0)).toBe(2)
    expect(harkerOrder('P', 1, 0, 0)).toBe(1)
    expect(harkerOrder('I', 1, 1, 0)).toBe(1)
    expect(harkerOrder('I', 1, 0, 0)).toBe(2)
  })

  it('treats R … RS as primitive for extinctions', () => {
    expect(isRhombohedralSetting('R -3 c RS')).toBe(true)
    expect(isRhombohedralSetting('R-3c:R')).toBe(true)
    expect(isRhombohedralSetting('R -3 c :H')).toBe(false)
    expect(effectiveCentering('R -3 c RS')).toBe('P')
    expect(effectiveCentering('R -3 c :H')).toBe('R')
    expect(
      effectiveCentering('R -3 c', {
        a: 6.36,
        b: 6.36,
        c: 6.36,
        alphaDeg: 46.1,
        betaDeg: 46.1,
        gammaDeg: 46.1,
      }),
    ).toBe('P')
  })
})

describe('rankBfdh', () => {
  it('ranks {100} first for primitive cubic', () => {
    const r = rankBfdh(cubic, { hm: 'P m -3 m', maxIndex: 2 })
    expect(r.centering).toBe('P')
    expect(r.faces[0]!.form).toBe('{100}')
    expect(r.faces[0]!.harkerN).toBe(1)
    expect(r.faces[0]!.relativeR).toBeCloseTo(1, 6)
  })

  it('applies F Harker so {100} uses n=2 and drops vs {111}', () => {
    const r = rankBfdh(cubic, { hm: 'F m -3 m', maxIndex: 2 })
    expect(r.centering).toBe('F')
    const f100 = r.faces.find((f) => f.form === '{100}')
    const f111 = r.faces.find((f) => f.form === '{111}')
    expect(f100?.harkerN).toBe(2)
    expect(f111?.harkerN).toBe(1)
    // d_DH(111)=a/√3 ≈ 2.887; d_DH(200)=a/2 = 2.5 → {111} ranks above {100}
    expect(f111!.dDh).toBeGreaterThan(f100!.dDh)
    const i111 = r.faces.findIndex((f) => f.form === '{111}')
    const i100 = r.faces.findIndex((f) => f.form === '{100}')
    expect(i111).toBeLessThan(i100)
  })

  it('builds a closed 2D outline from ranked faces', () => {
    const r = rankBfdh(ortho, { hm: 'P b c a', maxIndex: 2 })
    expect(r.faces2d.length).toBeGreaterThanOrEqual(3)
    const poly = wulffPolygon2D(r.faces2d)
    expect(poly.vertices.length).toBeGreaterThanOrEqual(3)
  })

  it('canonical form label', () => {
    expect(formLabel(-1, 0, 0)).toBe('{100}')
    expect(canonicalHkl(2, 4, 0)).toEqual([1, 2, 0])
  })
})

describe('planeNormalAb', () => {
  it('is axis-aligned for orthogonal (100)/(010)', () => {
    const n100 = planeNormalAb(ortho, 1, 0)
    expect(Math.abs(n100.nx)).toBeCloseTo(1, 6)
    expect(Math.abs(n100.ny)).toBeLessThan(1e-9)
    const n010 = planeNormalAb(ortho, 0, 1)
    expect(Math.abs(n010.ny)).toBeCloseTo(1, 6)
    expect(Math.abs(n010.nx)).toBeLessThan(1e-9)
  })
})

describe('uniqueFormRates / applyFormRates', () => {
  const base = [
    { label: '{100}', nx: 1, ny: 0, rate: 1 },
    { label: '{100}', nx: -1, ny: 0, rate: 1 },
    { label: '{010}', nx: 0, ny: 1, rate: 1.5 },
    { label: '{010}', nx: 0, ny: -1, rate: 1.5 },
    { label: '{110}', nx: 0.7, ny: 0.7, rate: 1.2 },
  ]

  it('lists unique forms in first-seen order', () => {
    const u = uniqueFormRates(base)
    expect(u.map((x) => x.form)).toEqual(['{100}', '{010}', '{110}'])
    expect(u[1]!.rate).toBeCloseTo(1.5, 6)
  })

  it('overrides rates and drops disabled forms', () => {
    const out = applyFormRates(
      base,
      { '{100}': 2, '{010}': 3, '{110}': 4 },
      { '{100}': true, '{010}': true, '{110}': false },
    )
    expect(out.every((f) => f.label !== '{110}')).toBe(true)
    expect(out.filter((f) => f.label === '{100}').every((f) => f.rate === 2)).toBe(
      true,
    )
    expect(out.filter((f) => f.label === '{010}').every((f) => f.rate === 3)).toBe(
      true,
    )
  })
})
