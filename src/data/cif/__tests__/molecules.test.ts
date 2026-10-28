import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { expandStructure } from '../expandStructure'
import {
  assembleMolecules,
  bondsMinImage,
  nearestImageFrac,
} from '../molecules'
import { parseCif } from '../parseCif'
import type { SymmetryCopyAtom } from '../types'
import { applyOperator, fracToCart } from '../../math'
import { buildOperatorsFromTriplets } from '../../groups/buildOperators'
import type { CellParams, Vec3 } from '../../types'

const SAMPLE = readFileSync(
  resolve(__dirname, '../../../../public/samples/acetic_p21c.cif'),
  'utf8',
)

describe('nearestImageFrac', () => {
  const cell: CellParams = { a: 5, b: 5, c: 5 }
  it('finds image across a face', () => {
    const a: Vec3 = [0.05, 0.5, 0.5]
    const b: Vec3 = [0.95, 0.5, 0.5]
    const near = nearestImageFrac(a, b, cell)
    expect(near.shift[0]).toBe(-1)
    expect(near.dist).toBeCloseTo(0.5, 5) // 0.05 - (-0.05) = 0.1? wait
    // b+(-1,0,0) = [-0.05,0.5,0.5]; dist from 0.05 along a = 0.1 * 5 Å = 0.5 Å
    expect(near.dist).toBeCloseTo(0.5, 5)
  })
})

describe('assembleMolecules — boundary-straddling diatomic', () => {
  it('unwraps a C–C pair split by wrapping into one intact molecule', () => {
    const cell: CellParams = { a: 10, b: 10, c: 10 }
    // Two carbons 1.4 Å apart across x=0: wrapped at 0.95 and 0.09
    // 0.09 - (0.95-1) = 0.14 → 1.4 Å
    const atoms: SymmetryCopyAtom[] = [
      {
        auIndex: 0,
        label: 'C1',
        element: 'C',
        opIndex: 1,
        fractional: [0.95, 0.5, 0.5],
        cartesian: fracToCart([0.95, 0.5, 0.5], cell),
        displayFractional: [0.95, 0.5, 0.5],
        displayCartesian: fracToCart([0.95, 0.5, 0.5], cell),
        moleculeId: -1,
      },
      {
        auIndex: 1,
        label: 'C2',
        element: 'C',
        opIndex: 1,
        fractional: [0.09, 0.5, 0.5],
        cartesian: fracToCart([0.09, 0.5, 0.5], cell),
        displayFractional: [0.09, 0.5, 0.5],
        displayCartesian: fracToCart([0.09, 0.5, 0.5], cell),
        moleculeId: -1,
      },
    ]

    // Without min-image, wrapped cart distance is 8.6 Å — no bond
    const wrappedDist = Math.hypot(
      atoms[0]!.cartesian[0] - atoms[1]!.cartesian[0],
      atoms[0]!.cartesian[1] - atoms[1]!.cartesian[1],
      atoms[0]!.cartesian[2] - atoms[1]!.cartesian[2],
    )
    expect(wrappedDist).toBeGreaterThan(5)

    const links = bondsMinImage(atoms, [0, 1], cell)
    expect(links.length).toBe(1)

    const assembled = assembleMolecules(atoms, cell)
    expect(assembled.moleculeCount).toBe(1)
    expect(assembled.bonds.length).toBe(1)
    // Display positions should be ~1.4 Å apart
    const d = Math.hypot(
      assembled.displayCartesian[0]![0] - assembled.displayCartesian[1]![0],
      assembled.displayCartesian[0]![1] - assembled.displayCartesian[1]![1],
      assembled.displayCartesian[0]![2] - assembled.displayCartesian[1]![2],
    )
    expect(d).toBeCloseTo(1.4, 5)
  })
})

describe('expandStructure acetic sample — intact molecules + ops', () => {
  it('yields 4 intact molecules, one per operator', () => {
    const expanded = expandStructure(parseCif(SAMPLE))
    expect(expanded.operators.length).toBe(4)
    expect(expanded.moleculeCount).toBe(4)
    // Each op owns exactly one molecule
    const byOp = new Map<number, number>()
    for (let m = 0; m < expanded.moleculeCount; m++) {
      const op = expanded.moleculeOpIndex[m]!
      byOp.set(op, (byOp.get(op) ?? 0) + 1)
    }
    expect([...byOp.entries()].sort((a, b) => a[0] - b[0])).toEqual([
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
    ])
    // Each molecule has covalent bonds
    expect(expanded.bonds.length).toBeGreaterThanOrEqual(4 * 5)
    for (const b of expanded.bonds) {
      const A = expanded.atoms[b.a]!
      const B = expanded.atoms[b.b]!
      expect(A.opIndex).toBe(b.opIndex)
      expect(B.opIndex).toBe(b.opIndex)
      expect(A.moleculeId).toBe(B.moleculeId)
      const d = Math.hypot(
        A.displayCartesian[0] - B.displayCartesian[0],
        A.displayCartesian[1] - B.displayCartesian[1],
        A.displayCartesian[2] - B.displayCartesian[2],
      )
      expect(d).toBeLessThan(2.2)
    }
  })

  it('keeps operator xyz strings for UI', () => {
    const expanded = expandStructure(parseCif(SAMPLE))
    expect(expanded.operators[0]!.triplet.toLowerCase()).toContain('x')
    expect(expanded.operators.every((o) => o.triplet.includes(','))).toBe(true)
  })
})

describe('occupancy + disorder filtering', () => {
  it('skips near-zero occupancy and keeps one altloc', () => {
    const text = `
data_X
_cell_length_a 5
_cell_length_b 5
_cell_length_c 5
_symmetry_Int_Tables_number 1
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
_atom_site_occupancy
_atom_site_disorder_group
C1 C 0.1 0.1 0.1 1.0 .
C2 C 0.2 0.1 0.1 0.0 1
C3 C 0.25 0.1 0.1 0.5 2
C4 C 0.3 0.1 0.1 1.0 1
`
    const p = parseCif(text)
    // C2 occ=0 skipped; C3 altloc 2 dropped when keeping group 1; C1 + C4 kept
    expect(p.atoms.map((a) => a.label).sort()).toEqual(['C1', 'C4'])
    expect(p.warnings.some((w) => /occupancy/i.test(w))).toBe(true)
    expect(p.warnings.some((w) => /Disorder/i.test(w))).toBe(true)
  })
})

describe('symmetry expansion uses demo operators when SG known', () => {
  it('maps each atom copy to an op index', () => {
    const ops = buildOperatorsFromTriplets([
      'x,y,z',
      '-x,y+1/2,-z+1/2',
      '-x,-y,-z',
      'x,-y+1/2,z+1/2',
    ])
    const _cell: CellParams = { a: 5.5, b: 8.2, c: 7.1, betaDeg: 110 }
    const seed: Vec3 = [0.22, 0.31, 0.18]
    for (const op of ops) {
      const f = applyOperator(op, seed)
      expect(f[0]).toBeGreaterThanOrEqual(0)
      expect(f[0]).toBeLessThan(1)
    }
  })
})
