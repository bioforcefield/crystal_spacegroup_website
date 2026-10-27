import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { expandStructure } from '../expandStructure'
import { parseCif, tokenizeCif } from '../parseCif'

const SAMPLE = readFileSync(
  resolve(__dirname, '../../../../public/samples/acetic_p21c.cif'),
  'utf8',
)

describe('tokenizeCif', () => {
  it('strips # comments and keeps quoted strings', () => {
    const tokens = tokenizeCif(`data_X\n_foo 'a b' # comment\n_bar 1.2(3)\n`)
    expect(tokens[0]).toBe('data_X')
    expect(tokens).toContain('_foo')
    expect(tokens).toContain('a b')
    expect(tokens).toContain('1.2(3)')
    expect(tokens.join(' ')).not.toContain('comment')
  })
})

describe('parseCif sample acetic_p21c', () => {
  it('reads cell, SG 14, 4 operators, 8 atoms', () => {
    const p = parseCif(SAMPLE)
    expect(p.spaceGroupNumber).toBe(14)
    expect(p.cell.a).toBeCloseTo(5.5, 5)
    expect(p.cell.betaDeg).toBeCloseTo(110, 5)
    expect(p.cifOperators.length).toBe(4)
    expect(p.atoms.length).toBe(8)
    expect(p.atoms[0]!.element).toBe('C')
  })

  it('resolves HM without number', () => {
    const text = SAMPLE.replace(/_symmetry_Int_Tables_number\s+14\n/, '')
    const p = parseCif(text)
    expect(p.spaceGroupNumber).toBe(14)
  })
})

describe('expandStructure', () => {
  it('expands AU × multiplicity and colors by op', () => {
    const expanded = expandStructure(parseCif(SAMPLE))
    expect(expanded.operators.length).toBe(4)
    expect(expanded.atoms.length).toBe(8 * 4)
    const ops = new Set(expanded.atoms.map((a) => a.opIndex))
    expect([...ops].sort()).toEqual([1, 2, 3, 4])
    expect(expanded.bonds.length).toBeGreaterThan(0)
    expect(expanded.moleculeCount).toBe(4)
    // Bonds only within a copy / molecule
    for (const b of expanded.bonds) {
      expect(expanded.atoms[b.a]!.opIndex).toBe(b.opIndex)
      expect(expanded.atoms[b.b]!.opIndex).toBe(b.opIndex)
      expect(expanded.atoms[b.a]!.moleculeId).toBe(
        expanded.atoms[b.b]!.moleculeId,
      )
    }
  })

  it('falls back to identity when no SG info', () => {
    const tiny = `
data_X
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
`
    const expanded = expandStructure(parseCif(tiny))
    expect(expanded.operators.length).toBe(1)
    expect(expanded.atoms.length).toBe(1)
    expect(expanded.warnings.some((w) => /asymmetric unit only/i.test(w))).toBe(
      true,
    )
  })
})

describe('CIF metadata', () => {
  const fs = require('node:fs') as typeof import('node:fs')
  const path = require('node:path') as typeof import('node:path')
  const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '../../../../public/samples', p), 'utf8')
  it('acetic sample: name + computed Z′', () => {
    const e = expandStructure(parseCif(read('acetic_p21c.cif')))
    expect(e.metadata.name).toBe('Teaching acetic-like')
    expect(e.metadata.z).toBe(4)
    expect(e.metadata.zPrime).toBe(1)
    expect(e.metadata.zPrimeSource).toBe('computed')
    expect(e.metadata.literature).toBeUndefined()
  })
  it('COD 1100303: literature + DOI', () => {
    const e = expandStructure(parseCif(read('cod/1100303.cif')))
    const lit = e.metadata.literature!
    expect(lit.authors.length).toBe(4)
    expect(lit.doi).toBe('10.1002/anie.198913921')
    expect(lit.title).toMatch(/Lithiophenylacetonitrile/)
    expect(lit.title).toMatch(/α-Lithio/)
    expect(lit.citation).toMatch(/Zarges et al\., Angewandte.*28 \(1989\) 1392–1394/)
    expect(e.metadata.formula).toBe('C26 H52 Li2 N6')
    expect(e.metadata.zPrime).toBe(1)
  })
  it('explicit Z′ and refine resolution tags', () => {
    const m = parseCif(`data_X\n_cell_length_a 5\n_cell_length_b 5\n_cell_length_c 5\n_space_group_z_prime 2\n_refine_ls_d_res_high 0.78\n_struct.title 'Foo'\nloop_\n_atom_site_label\n_atom_site_type_symbol\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\nC1 C 0.1 0.2 0.3\n`).metadata
    expect(m.zPrime).toBe(2)
    expect(m.resolutionA).toBeCloseTo(0.78)
    expect(m.name).toBe('Foo')
  })
})
