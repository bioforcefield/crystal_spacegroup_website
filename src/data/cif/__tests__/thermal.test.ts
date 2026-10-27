import { describe, expect, it } from 'vitest'
import { ellipsoidAxes, meanUiso, uIsoRadiusScale } from '../thermal'
import { parseCif } from '../parseCif'

describe('thermal helpers', () => {
  it('scales radius with Uiso', () => {
    const base = 0.4
    expect(uIsoRadiusScale(undefined, base)).toBe(base)
    expect(uIsoRadiusScale(0.05, base)).toBeGreaterThan(base)
  })

  it('eigen-decomposes anisotropic U', () => {
    const { radii, uIsoEquiv } = ellipsoidAxes({
      u11: 0.04,
      u22: 0.01,
      u33: 0.01,
      u12: 0,
      u13: 0,
      u23: 0,
    })
    expect(radii[0]).toBeGreaterThan(radii[1]!)
    expect(meanUiso({ u11: 0.04, u22: 0.01, u33: 0.01, u12: 0, u13: 0, u23: 0 })).toBeCloseTo(uIsoEquiv)
  })
})

describe('parseCif thermal + disorder', () => {
  it('prefers higher-occupancy altloc and reads Uiso', () => {
    const cif = `data_t
_cell_length_a 5
_cell_length_b 5
_cell_length_c 5
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
_atom_site_occupancy
_atom_site_disorder_group
_atom_site_U_iso_or_equiv
C1 C 0.1 0.2 0.3 0.4 1 0.03
C1B C 0.12 0.22 0.32 0.6 2 0.05
O1 O 0.4 0.4 0.4 1.0 . 0.02
`
    const p = parseCif(cif)
    expect(p.atoms).toHaveLength(2) // group 2 + unmarked O
    expect(p.atoms.some((a) => a.label === 'C1B')).toBe(true)
    expect(p.atoms.find((a) => a.label === 'C1B')?.uIso).toBeCloseTo(0.05)
    expect(p.warnings.some((w) => /highest-occupancy group "2"/.test(w))).toBe(true)
  })

  it('attaches anisotropic Uij by label', () => {
    const cif = `data_t
_cell_length_a 5
_cell_length_b 5
_cell_length_c 5
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
C1 C 0.1 0.2 0.3
loop_
_atom_site_aniso_label
_atom_site_aniso_U_11
_atom_site_aniso_U_22
_atom_site_aniso_U_33
_atom_site_aniso_U_12
_atom_site_aniso_U_13
_atom_site_aniso_U_23
C1 0.05 0.02 0.02 0 0 0
`
    const p = parseCif(cif)
    expect(p.atoms[0]?.aniso?.u11).toBeCloseTo(0.05)
    expect(p.atoms[0]?.uIso).toBeCloseTo((0.05 + 0.02 + 0.02) / 3)
  })
})
