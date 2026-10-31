import { describe, expect, it } from 'vitest'
import { fracToCart } from '../math'
import { placedPositions } from '../nearestImages'
import { c2Demo as c2 } from '../c2'
import {
  parseCellMultiples,
  replicatePoints,
  supercellEnabled,
  supercellTranslations,
} from '../supercell'

describe('parseCellMultiples', () => {
  it.each(['1,1,3', '1x1x3', '1×1×3', '1 1 3', ' 1 , 1 , 3 ', '1X1X3'])('%s', (s) => {
    expect(parseCellMultiples(s)).toEqual({ ok: true, value: [1, 1, 3], clamped: false })
  })
  it('empty is default', () => {
    expect(parseCellMultiples('')).toMatchObject({ ok: true, value: [1, 1, 1] })
  })
  it('clamps', () => {
    expect(parseCellMultiples('0x9x2')).toEqual({ ok: true, value: [1, 5, 2], clamped: true })
  })
  it.each(['1x1', 'axbxc', '1.5x1x1', '-1,1,1', '1x1x1x1'])('rejects %s', (s) => {
    expect(parseCellMultiples(s).ok).toBe(false)
  })
})

describe('supercell replication', () => {
  it('only C2 enabled', () => {
    expect(supercellEnabled(5)).toBe(true)
    expect(supercellEnabled(4)).toBe(false)
    expect(supercellEnabled(14)).toBe(false)
  })
  it('count = Z×na×nb×nc and default unchanged', () => {
    const { points } = placedPositions(c2, 1, 'wrapped')
    const toCart = (f: [number, number, number]) => fracToCart(f, c2.cell)
    expect(supercellTranslations([1, 1, 1])).toEqual([[0, 0, 0]])
    const one = replicatePoints(points, [1, 1, 1], toCart)
    expect(one.map((r) => r.point)).toEqual(points)
    expect(replicatePoints(points, [1, 1, 3], toCart)).toHaveLength(points.length * 3)
    expect(replicatePoints(points, [2, 3, 4], toCart)).toHaveLength(points.length * 24)
    expect(points.length).toBe(c2.operators.length)
    const r = replicatePoints(points, [1, 1, 2], toCart)[points.length]
    expect(r.point.fractional[2]).toBeCloseTo(points[0].fractional[2] + 1)
  })
})

import { clampMultiple } from '../supercell'
describe('clampMultiple', () => {
  it('clamps to 1..5 integers', () => {
    expect([0, 1, 3, 5, 9, 2.6, NaN].map(clampMultiple)).toEqual([1, 1, 3, 5, 5, 3, 1])
  })
})
