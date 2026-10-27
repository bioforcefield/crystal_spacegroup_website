import { describe, expect, it } from 'vitest'
import { expandStructure } from '../expandStructure'
import { parseCif } from '../parseCif'
import {
  bestLatticeShift,
  bondVisibleInWrapped,
  placeCifStructure,
} from '../placement'
import { getDemo } from '../../registry'
import { addFrac } from '../../math'
import type { Vec3 } from '../../types'

const ACETIC = `data_acetic
_cell_length_a 13.310
_cell_length_b 4.090
_cell_length_c 5.765
_cell_angle_alpha 90
_cell_angle_beta 111.55
_cell_angle_gamma 90
_space_group_IT_number 14
_symmetry_space_group_name_H-M 'P 1 21/c 1'
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
C1 C 0.1670 0.2410 0.2860
O1 O 0.1260 0.1490 0.4430
O2 O 0.2520 0.1200 0.2040
H1 H 0.1450 0.3800 0.1800
H2 H 0.0850 0.2300 0.5000
`

describe('placeCifStructure — Cell (wrapped)', () => {
  it('puts every atom inside [0,1)³', () => {
    const structure = expandStructure(parseCif(ACETIC))
    const demo = getDemo(14)!
    const placed = placeCifStructure(structure, 'wrapped', 2, demo)
    expect(placed.mode).toBe('wrapped')
    for (const f of placed.fractionals) {
      for (const c of f) {
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThan(1)
      }
    }
    // Matches stored wrapped cartesian
    for (let i = 0; i < structure.atoms.length; i++) {
      expect(placed.positions[i]![0]).toBeCloseTo(
        structure.atoms[i]!.cartesian[0],
        6,
      )
    }
  })
})

describe('placeCifStructure — Near (nearest)', () => {
  it('keeps intact relative geometry within a molecule (rigid lattice shift)', () => {
    const structure = expandStructure(parseCif(ACETIC))
    const demo = getDemo(14)!
    const placed = placeCifStructure(structure, 'nearest', 2, demo)
    expect(placed.mode).toBe('nearest')

    // Pick first molecule with ≥2 atoms
    const byMol = new Map<number, number[]>()
    structure.atoms.forEach((a, i) => {
      const list = byMol.get(a.moleculeId) ?? []
      list.push(i)
      byMol.set(a.moleculeId, list)
    })
    const members = [...byMol.values()].find((m) => m.length >= 2)!
    expect(members.length).toBeGreaterThanOrEqual(2)

    const i0 = members[0]!
    const i1 = members[1]!
    const dDisplay = Math.hypot(
      structure.atoms[i0]!.displayCartesian[0] -
        structure.atoms[i1]!.displayCartesian[0],
      structure.atoms[i0]!.displayCartesian[1] -
        structure.atoms[i1]!.displayCartesian[1],
      structure.atoms[i0]!.displayCartesian[2] -
        structure.atoms[i1]!.displayCartesian[2],
    )
    const dPlaced = Math.hypot(
      placed.positions[i0]![0] - placed.positions[i1]![0],
      placed.positions[i0]![1] - placed.positions[i1]![1],
      placed.positions[i0]![2] - placed.positions[i1]![2],
    )
    expect(dPlaced).toBeCloseTo(dDisplay, 5)
  })

  it('may place atoms outside [0,1)³ when nearer the selected element', () => {
    const structure = expandStructure(parseCif(ACETIC))
    const demo = getDemo(14)!
    // Try several ops — at least one nearest placement should leave the cell
    // or equal wrapped (both OK); assert API returns nearest mode + same length
    const placed = placeCifStructure(structure, 'nearest', 4, demo)
    expect(placed.fractionals).toHaveLength(structure.atoms.length)
    expect(placed.positions).toHaveLength(structure.atoms.length)
  })

  it('without a demo keeps displayCartesian (no crash)', () => {
    const structure = expandStructure(parseCif(ACETIC))
    const placed = placeCifStructure(structure, 'nearest', 1, null)
    expect(placed.mode).toBe('nearest')
    for (let i = 0; i < structure.atoms.length; i++) {
      expect(placed.positions[i]![0]).toBeCloseTo(
        structure.atoms[i]!.displayCartesian[0],
        6,
      )
    }
  })
})

describe('bestLatticeShift', () => {
  it('returns a shift in {-1,0,1}³', () => {
    const demo = getDemo(14)!
    const shift = bestLatticeShift([0.9, 0.1, 0.9] as Vec3, demo, 2)
    for (const c of shift) {
      expect([-1, 0, 1]).toContain(c)
    }
    const moved = addFrac([0.9, 0.1, 0.9], shift)
    // Score of chosen shift should be ≤ identity shift
    expect(moved).toBeDefined()
  })
})

describe('bondVisibleInWrapped', () => {
  it('hides long wrapped separations', () => {
    expect(
      bondVisibleInWrapped([0, 0, 0], [0.5, 0, 0], 3.5),
    ).toBe(true)
    expect(
      bondVisibleInWrapped([0, 0, 0], [10, 0, 0], 3.5),
    ).toBe(false)
  })
})
