import { describe, expect, it } from 'vitest'
import { countDemoElements, demoWithCifCell, elementsDemoForStructure } from '../demoWithCifCell'
import { expandStructure } from '../expandStructure'
import { parseCif } from '../parseCif'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getDemo } from '../../registry'
import type { CellParams } from '../../types'

const aceticCell: CellParams = {
  a: 13.31,
  b: 4.09,
  c: 5.76,
  alphaDeg: 90,
  betaDeg: 110.4,
  gammaDeg: 90,
}

describe('demoWithCifCell', () => {
  it('returns undefined for missing / out-of-range SG', () => {
    expect(demoWithCifCell(null, aceticCell)).toBeUndefined()
    expect(demoWithCifCell(undefined, aceticCell)).toBeUndefined()
    expect(demoWithCifCell(0, aceticCell)).toBeUndefined()
    expect(demoWithCifCell(231, aceticCell)).toBeUndefined()
  })

  it('keeps P21/c element loci and swaps in the CIF cell metric', () => {
    const teaching = getDemo(14)!
    const scaled = demoWithCifCell(14, aceticCell)!
    expect(scaled.meta.number).toBe(14)
    expect(scaled.cell).toEqual(aceticCell)
    expect(scaled.cell).not.toEqual(teaching.cell)
    expect(scaled.screwAxes.length).toBe(teaching.screwAxes.length)
    expect(scaled.glidePlanes.length).toBe(teaching.glidePlanes.length)
    expect(scaled.inversionCenters.length).toBe(teaching.inversionCenters.length)
    expect(countDemoElements(scaled)).toBeGreaterThan(0)
    // Fractional loci unchanged
    expect(scaled.screwAxes[0]?.origin).toEqual(teaching.screwAxes[0]?.origin)
  })

  it('COD-style cubic Fm-3m (225) still exposes drawable axis-aligned elements', () => {
    const cell: CellParams = {
      a: 5.46,
      b: 5.46,
      c: 5.46,
      alphaDeg: 90,
      betaDeg: 90,
      gammaDeg: 90,
    }
    const scaled = demoWithCifCell(225, cell)
    expect(scaled).toBeDefined()
    expect(scaled!.cell.a).toBe(5.46)
    // May be geometryLimited (body diagonals) but still has some loci
    expect(countDemoElements(scaled!)).toBeGreaterThan(0)
  })
})

describe('elementsDemoForStructure', () => {
  it('uses CIF-derived loci when operatorSource is cif', () => {
    const sample = readFileSync(
      resolve(__dirname, '../../../../public/samples/acetic_p21c.cif'),
      'utf8',
    )
    const structure = expandStructure(parseCif(sample))
    expect(structure.operatorSource).toBe('cif')
    const demo = elementsDemoForStructure(structure)!
    expect(demo.operators).toBe(structure.operators)
    expect(demo.cell).toEqual(structure.cell)
    expect(countDemoElements(demo)).toBeGreaterThan(0)
  })

  it('uses teaching demo loci when operatorSource is demo', () => {
    const text = `
data_X
_cell_length_a 5.5
_cell_length_b 8.2
_cell_length_c 7.1
_cell_angle_beta 110
_symmetry_Int_Tables_number 14
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
C1 C 0.22 0.31 0.18
`
    const structure = expandStructure(parseCif(text))
    expect(structure.operatorSource).toBe('demo')
    const demo = elementsDemoForStructure(structure)!
    const teaching = getDemo(14)!
    expect(demo.screwAxes.length).toBe(teaching.screwAxes.length)
    expect(demo.cell.a).toBeCloseTo(5.5, 5)
  })
})
