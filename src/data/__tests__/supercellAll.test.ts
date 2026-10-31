import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getDemo } from '../registry'
import { fracToCart } from '../math'
import { placedPositions } from '../nearestImages'
import {
  CIF_ATOM_CAP,
  SG_MOTIF_CAP,
  fitsCap,
  replicaOffsets,
  replicatePoints,
  setAxisCapped,
  supercellEnabled,
} from '../supercell'
import { parseCif } from '../cif/parseCif'
import { expandStructure } from '../cif/expandStructure'

const NUMS = Array.from({ length: 230 }, (_, i) => i + 1)

describe('supercell across all 230 space groups', () => {
  it.each(NUMS)('SG %i: enabled, 1×1×1 unchanged, replication = Z×n', (n) => {
    expect(supercellEnabled(n)).toBe(true)
    const demo = getDemo(n)!
    expect(demo).toBeDefined()
    const Z = demo.operators.length
    const toCart = (f: [number, number, number]) => fracToCart(f, demo.cell)
    for (const mode of ['nearest', 'wrapped'] as const) {
      const { points } = placedPositions(demo, 1, mode)
      expect(replicatePoints(points, [1, 1, 1], toCart).map((r) => r.point)).toEqual(points)
    }
    const { points } = placedPositions(demo, 1, 'wrapped')
    const m = setAxisCapped([1, 1, 1], 2, 3, Z, SG_MOTIF_CAP)
    expect(fitsCap(m, Z, SG_MOTIF_CAP)).toBe(true)
    expect(replicatePoints(points, m, toCart)).toHaveLength(Z * m[0] * m[1] * m[2])
  })
})

describe('caps', () => {
  it('Fm-3m (Z=192) is capped, P1 is not', () => {
    const big = setAxisCapped([5, 5, 1], 2, 5, 192, SG_MOTIF_CAP)
    expect(192 * big[0] * big[1] * big[2]).toBeLessThanOrEqual(SG_MOTIF_CAP)
    expect(big[2]).toBe(5)
    expect(setAxisCapped([5, 5, 1], 2, 5, 1, SG_MOTIF_CAP)).toEqual([5, 5, 5])
  })
  it('huge per-cell count cannot grow', () => {
    expect(setAxisCapped([1, 1, 1], 0, 3, CIF_ATOM_CAP, CIF_ATOM_CAP)).toEqual([1, 1, 1])
  })
})

describe('CIF replication', () => {
  it('acetic acid sample: offsets × atoms', () => {
    const s = expandStructure(
      parseCif(readFileSync(resolve(__dirname, '../../../public/samples/acetic_p21c.cif'), 'utf8')),
    )
    const off = replicaOffsets([2, 2, 2], (f) => fracToCart(f, s.cell))
    expect(off).toHaveLength(7)
    expect(s.atoms.length * (off.length + 1)).toBe(s.atoms.length * 8)
    expect(replicaOffsets([1, 1, 1], (f) => f)).toEqual([])
  })
})
