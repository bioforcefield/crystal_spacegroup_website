import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseCif } from '../parseCif'
import { expandStructure } from '../expandStructure'
import { parseDisParam, disParam } from '../cifRoute'

const cod = readFileSync(join(__dirname, 'fixtures/cod1508519.cif'), 'utf8')
const mk = (rows: string) => `data_t
_cell_length_a 10
_cell_length_b 10
_cell_length_c 10
_symmetry_space_group_name_H-M 'P 1'
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
_atom_site_occupancy
_atom_site_disorder_assembly
_atom_site_disorder_group
${rows}
`
const two = mk(`C1 C 0.1 0.1 0.1 1 . .
C2 C 0.25 0.1 0.1 0.62 A 1
C3 C 0.25 0.2 0.1 0.38 A 2
C4 C 0.5 0.5 0.5 0.3 B 1
C5 C 0.5 0.6 0.5 0.7 B 2`)

describe('CIF disorder', () => {
  it('COD 1508519: assembly letters are not altlocs; all atoms kept', () => {
    const p = parseCif(cod)
    expect(p.atoms.length).toBe(112)
    expect(p.warnings.join(' ')).not.toMatch(/keeping highest-occupancy group "E"/)
    expect(p.disorder).toBeUndefined() // every assembly has a single group
  })
  it('per-assembly default = highest occupancy, independent choice', () => {
    const p = parseCif(two)
    expect(p.atoms.map((a) => a.label)).toEqual(['C1', 'C2', 'C5'])
    expect(p.disorder!.assemblies.map((a) => `${a.id}:${a.defaultGroup}`)).toEqual(['A:1', 'B:2'])
    expect(p.disorder!.assemblies[0]!.groups[0]!.occ).toBeCloseTo(0.62)
    const q = parseCif(two, { pick: { A: '2' } })
    expect(q.atoms.map((a) => a.label)).toEqual(['C1', 'C3', 'C5'])
  })
  it('show all: ghosts appended after kept atoms and never bonded to the other state', () => {
    const p = parseCif(two, { showAll: true })
    expect(p.atoms.map((a) => `${a.label}${a.ghost ? '*' : ''}`)).toEqual(['C1', 'C2', 'C5', 'C3*', 'C4*'])
    const s = expandStructure(p)
    const lab = (i: number) => s.atoms[i]!.label
    const pairs = s.bonds.map((b) => [lab(b.a), lab(b.b)].sort().join('-'))
    expect(pairs).toContain('C1-C2')
    expect(pairs).toContain('C1-C3')
    expect(pairs).not.toContain('C2-C3')
  })
  it('negative PART is a selectable group and flagged', () => {
    const p = parseCif(mk(`C1 C 0.1 0.1 0.1 1 . .
C2 C 0.2 0.1 0.1 0.5 . -1`))
    expect(p.atoms).toHaveLength(2)
    expect(p.disorder!.hasNegative).toBe(true)
  })
  it('URL param round trip', () => {
    const p = parseCif(two, parseDisParam('*,A:2'))
    expect(disParam(p.disorder)).toBe('*,A:2')
    expect(disParam(parseCif(two).disorder)).toBeNull()
  })
})
