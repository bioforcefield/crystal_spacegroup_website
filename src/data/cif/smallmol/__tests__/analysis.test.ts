import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCif } from '../../parseCif'
import { expandStructure } from '../../expandStructure'
import { analyzeSmallMolecule, analysisCsv } from '../analysis'
import { symText, isBonded } from '../core'
import { BV_PARAMS } from '../../bvParams'
import { ELEMENTS } from '../../elementData'

const load = (id: string) => {
  const t = readFileSync(resolve(__dirname, `../../../../../public/samples/cod/${id}.cif`), 'utf8')
  return analyzeSmallMolecule(expandStructure(parseCif(t)), t)
}
const org = load('2212817') // C13H19NO, Pbca, with _geom_* and _geom_hbond
const calcite = load('1010962')
const k2so4 = load('2101320')
const si = load('9008565')
const graphite = load('9011577')
const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThan(tol)
const norm = (v: number[]) => Math.hypot(...v)

describe('reference data', () => {
  it('Cordero / Bondi / Brown–Altermatt / Brese–O\'Keeffe spot values', () => {
    expect(ELEMENTS.C!.rc).toBe(0.73); expect(ELEMENTS.O!.rv).toBe(1.52); expect(ELEMENTS.H!.rv).toBe(1.2)
    expect(BV_PARAMS['Si:4:O:-2']).toEqual([1.624, 0.37, 'b'])
    expect(BV_PARAMS['Ca:2:O:-2']![0]).toBe(1.967)
    expect(BV_PARAMS['Na:1:O:-2']![0]).toBe(1.803)
  })
  it('symmetry operator text is SHELX style', () => {
    expect(symText({ R: [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], t: [1, 0.5, 0.5] })).toBe('-x+1, y+1/2, -z+1/2')
    expect(symText({ R: [[0, 1, 0], [-1, 1, 0], [0, 0, 1]], t: [0, 0, -1 / 3] })).toBe('y, -x+y, z-1/3')
  })
  it('bond rule: no H–H, no alkali–alkali', () => {
    expect(isBonded('H', 'H', 0.9)).toBe(false)
    expect(isBonded('K', 'K', 3.7)).toBe(false)
    expect(isBonded('C', 'C', 1.54)).toBe(true)
  })
})

describe('organic (COD 2212817)', () => {
  it('CIF _geom_bond rows keep esd text; computed C1–C4 agrees', () => {
    const c = org.bonds.cif.find((b) => b.a.label === 'C1' && b.b.label === 'C4')!
    expect(c.text).toBe('1.523(4)')
    const k = org.bonds.computed.find((b) => [b.a.label, b.b.label].sort().join() === 'C1,C4')!
    near(k.d, 1.523, 0.006)
    expect(org.bonds.computed.length).toBe(org.bonds.cif.length)
  })
  it('computed torsion matches the CIF value with sign', () => {
    const t = org.torsions.computed.find((r) => [r.a, r.b, r.c, r.d].map((x) => x.label.split('^')[0]).join() === 'C2,C4,C5,O6'
      || [r.d, r.c, r.b, r.a].map((x) => x.label.split('^')[0]).join() === 'C2,C4,C5,O6')!
    near(t.v, -2.8, 0.6)
  })
  it('H-bond N7–H7···O6 with a symmetry code, matching the CIF table (7_665)', () => {
    const h = org.hbonds.computed.find((r) => r.d.label === 'N7')!
    expect(h.h!.label).toBe('H7')
    expect(h.a.code).not.toBe('')
    near(h.da, 2.924, 0.01); near(h.dha!, 165, 1.5)
    const c = org.hbonds.cif[0]!
    expect(c.text!.da).toBe('2.924(3)')
    // the CIF symmetry code is mapped to the same acceptor image
    near(norm(c.focus.rel[2]!.map((v, i) => v - c.focus.rel[0]![i]!)), 2.924, 0.01)
    expect(org.symCodes.some((s) => s.code === h.a.code)).toBe(true)
  })
  it('summary: discrete molecule, density, Z′, packing', () => {
    const s = org.summary
    expect(s.components).toHaveLength(1); expect(s.components[0]!.extended).toBe(0)
    expect(s.components[0]!.formula).toBe('C13 H19 N O')
    near(s.densityCalc, 1.059, 0.003)
    expect(s.zPrime).toBe(1)
    expect(s.packing!).toBeGreaterThan(0.6); expect(s.packing!).toBeLessThan(0.8)
    near(s.vPerNonH!, 2575.6 / 120, 0.1)
  })
  it('row focus: anchor + offsets reproduce the bond length', () => {
    const b = org.bonds.computed[0]!
    near(norm(b.focus.rel[1]!.map((v, i) => v - b.focus.rel[0]![i]!)), b.d, 1e-6)
    expect(b.focus.rel[0]).toEqual([0, 0, 0])
  })
  it('CSV has every section and the symmetry footnotes', () => {
    const csv = analysisCsv(org, 'cif')
    for (const h of ['# Summary', '# Bonds (CIF _geom_*)', '# Angles', '# Torsions', '# Hydrogen bonds', '# Short contacts', '# Symmetry codes']) expect(csv).toContain(h)
    expect(csv).toContain('1.523(4)')
  })
})

describe('inorganic', () => {
  it('calcite: Ca octahedral, BVS ≈ +2, Ca–O 3-D network, no fake H-bonds', () => {
    const ca = calcite.coordination.find((c) => c.el === 'Ca')!
    expect(ca.cn).toBe(6); expect(ca.polyhedron).toBe('octahedral')
    expect(ca.ox).toBe(2); expect(ca.oxSource).toBe('cif')
    near(ca.bvs!, 2, 0.15)
    expect(calcite.hbonds.computed).toHaveLength(0)
    expect(calcite.summary.packing).toBeNull()
  })
  it('K2SO4: SO4 tetrahedron (τ4 ≈ 1, BVS ≈ 6), no K–K bonds', () => {
    const s = k2so4.coordination.find((c) => c.el === 'S')!
    expect(s.cn).toBe(4); expect(s.polyhedron).toBe('tetrahedral'); expect(s.tau!.v).toBeGreaterThan(0.85)
    near(s.bvs!, 6, 0.3)
    expect(k2so4.bonds.computed.some((b) => b.type === 'K–K')).toBe(false)
    expect(k2so4.coordination.filter((c) => c.el === 'K').every((c) => c.bvs != null)).toBe(true)
  })
  it('silicon is a 3-D framework (Si–Si 2.352 Å), graphite a 2-D layer', () => {
    near(si.bonds.computed[0]!.d, 2.352, 0.002)
    expect(si.summary.components[0]!.extended).toBe(3)
    expect(graphite.summary.components[0]!.extended).toBe(2)
  })
  it('every COD sample analyses without throwing', () => {
    for (const id of ['1000032', '1010916', '1507756', '1544740', '9000001', '2100301', '1100303']) {
      const r = load(id)
      expect(r.summary.volume).toBeGreaterThan(0)
    }
  })
})
