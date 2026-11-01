import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCif } from '../cif/parseCif'
import { expandStructure } from '../cif/expandStructure'
import { fracToCart } from '../math'
import { toMmcifIfNeeded } from '../pdb/formats'
import { parseMmcif } from '../pdb/mmcif'
import { buildMacroModel, expandMacro } from '../pdb/macro'
import {
  EXPORT_FORMATS, EXPORT_VIEWS, exportFileName, macroAsuSet, smallAsuSet, viewSet, writeExport,
  type ExportFormat, type ExportSet, type ExportView,
} from './structureExport'

const root = resolve(__dirname, '../../..')
const COD = readFileSync(resolve(root, 'public/samples/acetic_p21c.cif'), 'utf8')
const CRN = readFileSync(resolve(root, 'src/data/pdb/__tests__/fixtures/1crn.cif'), 'utf8')

type Back = { n: number; xyz: number[][]; chains: Set<string>; residues: Set<string> }
function reparse(text: string, fmt: ExportFormat): Back {
  if (fmt === 'xyz') {
    const ls = text.trim().split('\n')
    return { n: +ls[0]!, xyz: ls.slice(2).map((l) => l.trim().split(/\s+/).slice(1).map(Number)), chains: new Set(), residues: new Set() }
  }
  if (fmt === 'cif') {
    const p = parseCif(text)
    return { n: p.atoms.length, xyz: p.atoms.map((a) => fracToCart(a.fractional, p.cell)), chains: new Set(), residues: new Set() }
  }
  const pm = parseMmcif(toMmcifIfNeeded(text, `x.${fmt === 'mmcif' ? 'cif' : fmt}`).text)
  return {
    n: pm.extras.length,
    xyz: pm.parsed.atoms.map((a) => fracToCart(a.fractional, pm.parsed.cell)),
    chains: new Set(pm.extras.map((e) => e.chain)),
    residues: new Set(pm.extras.map((e) => `${e.chain}|${e.seq}`)),
  }
}
function check(set: ExportSet, fmt: ExportFormat, macro: boolean) {
  const back = reparse(writeExport(set, fmt), fmt)
  expect(back.n).toBe(set.atoms.length)
  let worst = 0
  set.atoms.forEach((a, i) => {
    const p = back.xyz[i]!
    worst = Math.max(worst, Math.abs(p[0]! - a.x), Math.abs(p[1]! - a.y), Math.abs(p[2]! - a.z))
  })
  expect(worst).toBeLessThan(1.01e-3)
  if (macro && fmt !== 'xyz' && fmt !== 'cif') {
    expect(back.chains).toEqual(new Set(set.atoms.map((a) => a.chain)))
    expect(back.residues.size).toBe(new Set(set.atoms.map((a) => `${a.chain}|${a.seq}${a.ins}`)).size)
  }
}

const small = expandStructure(parseCif(COD))
const model = buildMacroModel(parseMmcif(CRN))
const macroFull = expandMacro(model, 'full', false)

describe('structure export round trips (every view × format)', () => {
  for (const { v: view } of EXPORT_VIEWS) for (const { v: fmt } of EXPORT_FORMATS) {
    it(`small molecule ${view} → ${fmt}`, () => {
      const set = view === 'asu' ? smallAsuSet(small, 'acetic') : viewSet(small, view as Exclude<ExportView, 'asu'>, { title: 'acetic', multiples: [2, 1, 1] })
      check(set, fmt, false)
    })
    it(`PDB 1CRN ${view} → ${fmt}`, () => {
      const set = view === 'asu' ? macroAsuSet(model) : viewSet(macroFull, view as Exclude<ExportView, 'asu'>, { title: '1crn', multiples: view === 'wrapped' ? [1, 1, 2] : [1, 1, 1] })
      check(set, fmt, true)
    })
  }
  it('ASU keeps space group + ops; views are P 1 supercell', () => {
    const asu = writeExport(smallAsuSet(small, 'acetic'), 'cif')
    expect(parseCif(asu).cifOperators.length).toBe(small.operators.length)
    const v = viewSet(small, 'whole', { title: 'acetic', multiples: [2, 2, 1] })
    expect(v.sg).toBe('P 1')
    expect(v.cell!.a).toBeCloseTo(small.cell.a * 2)
    expect(v.atoms.length).toBe(small.atoms.length * 4)
    const pdb = writeExport(v, 'pdb')
    expect(pdb).toMatch(/^CRYST1.{48} P 1 /m)
    expect(pdb).toMatch(/REMARK 250 Lattice Lab export: Cell \(whole\)/)
    const asuPdb = writeExport(macroAsuSet(model), 'pdb')
    expect(asuPdb).toMatch(/^CRYST1   40\.960   18\.650   22\.520  90\.00  90\.77  90\.00 P 1 21 1/m)
    expect(asuPdb.split('\n').filter((l) => l.startsWith('ATOM')).length).toBe(model.extras.filter((e) => !e.hetero).length)
  })
  it('names files', () => {
    expect(exportFileName('4hhb', 'asu', 'pdb')).toBe('4hhb_asu.pdb')
    expect(exportFileName('4hhb', 'wrapped', 'cif', [2, 2, 1])).toBe('4hhb_cell_2x2x1.cif')
  })
})
