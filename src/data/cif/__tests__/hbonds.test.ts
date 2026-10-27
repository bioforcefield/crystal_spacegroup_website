import { describe, expect, it } from 'vitest'
import { expandStructure } from '../expandStructure'
import { findHBonds, hbondPartnerMolecules } from '../hbonds'
import { parseCif } from '../parseCif'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const acetic = readFileSync(
  resolve(__dirname, '../../../../public/samples/acetic_p21c.cif'),
  'utf8',
)

describe('findHBonds', () => {
  it('detects cross-operator H-bonds in acetic acid P21/c sample', () => {
    const parsed = parseCif(acetic)
    const expanded = expandStructure(parsed)
    expect(expanded.hbonds.length).toBeGreaterThan(0)
    const cross = expanded.hbonds.filter((h) => h.crossOp)
    expect(cross.length).toBeGreaterThan(0)
    for (const h of expanded.hbonds) {
      expect(h.distHA).toBeLessThanOrEqual(2.5 + 1e-6)
      expect(h.angleDeg).toBeGreaterThanOrEqual(120 - 1e-6)
      expect(h.donorMolecule).not.toBe(h.acceptorMolecule)
    }
  })

  it('partner set includes AU and its mates', () => {
    const expanded = expandStructure(parseCif(acetic))
    const auMol = expanded.atoms.find((a) => a.opIndex === 1)?.moleculeId
    expect(auMol).toBeTypeOf('number')
    const partners = hbondPartnerMolecules(expanded.hbonds, auMol!)
    expect(partners.has(auMol!)).toBe(true)
    expect(partners.size).toBeGreaterThan(1)
  })

  it('returns empty for structures with no hydrogens', () => {
    const cif = `
data_test
_cell_length_a 5
_cell_length_b 5
_cell_length_c 5
_cell_angle_alpha 90
_cell_angle_beta 90
_cell_angle_gamma 90
_space_group_IT_number 1
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
C1 C 0.1 0.2 0.3
O1 O 0.2 0.2 0.3
`
    const expanded = expandStructure(parseCif(cif))
    expect(findHBonds(expanded)).toEqual([])
  })
})
