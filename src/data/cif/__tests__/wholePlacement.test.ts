import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { expandStructure } from '../expandStructure'
import { parseCif } from '../parseCif'
import { placeCifStructure, WHOLE_EPS } from '../placement'
import { elementsDemoForStructure } from '../demoWithCifCell'
import { parseViewQuery, serializeViewQuery, VIEW_DEFAULTS } from '../cifRoute'
import { parseMmcif } from '../../pdb/mmcif'
import { buildMacroModel, expandMacro } from '../../pdb/macro'
import type { ExpandedStructure } from '../types'
import type { Vec3 } from '../../types'

const pub = (p: string) => resolve(__dirname, '../../../../public/samples', p)
const load = (p: string) => expandStructure(parseCif(readFileSync(pub(p), 'utf8')))

function check(s: ExpandedStructure) {
  const r = placeCifStructure(s, 'whole', 1, null)
  expect(r.mode).toBe('whole')
  const byMol = new Map<number, number[]>()
  s.atoms.forEach((a, i) => {
    if (r.hidden!.has(i)) return
    const l = byMol.get(a.moleculeId) ?? []
    l.push(i)
    byMol.set(a.moleculeId, l)
  })
  for (const idx of byMol.values()) {
    const c: Vec3 = [0, 0, 0]
    for (const i of idx) for (let k = 0; k < 3; k++) c[k] += r.fractionals[i]![k]! / idx.length
    for (let k = 0; k < 3; k++) {
      expect(c[k]).toBeGreaterThanOrEqual(-WHOLE_EPS - 1e-9)
      expect(c[k]).toBeLessThan(1 - WHOLE_EPS + 1e-9)
    }
  }
  // no broken bonds: every bond keeps its unwrapped (display) length
  for (const b of s.bonds) {
    const p = r.positions
    const d = Math.hypot(...([0, 1, 2].map((k) => p[b.a]![k]! - p[b.b]![k]!) as [number, number, number]))
    const da = s.atoms[b.a]!.displayCartesian
    const db = s.atoms[b.b]!.displayCartesian
    const d0 = Math.hypot(da[0] - db[0], da[1] - db[1], da[2] - db[2])
    expect(Math.abs(d - d0)).toBeLessThan(1e-6)
  }
  return byMol.size
}

const zOf = (p: string) => Number(/_cell_formula_units_Z\s+(\d+)/.exec(readFileSync(pub(p), 'utf8'))?.[1])
const auFrags = (s: ExpandedStructure) => new Set(s.atoms.filter((a) => a.opIndex === 1).map((a) => a.moleculeId)).size

describe('Cell (whole molecules) placement', () => {
  it('acetic acid P2₁/c sample: Z = 4 whole molecules, centroids in cell', () => {
    const s = load('acetic_p21c.cif')
    expect(check(s)).toBe(4)
  })
  for (const f of ['2212817', '1100303']) {
    it(`COD ${f}: molecule count = Z × fragments per ASU`, () => {
      const s = load(`cod/${f}.cif`)
      expect(check(s)).toBe(zOf(`cod/${f}.cif`) * auFrags(s))
    })
  }
  it('does not change Nearest or atom In-cell placement', () => {
    const s = load('acetic_p21c.cif')
    const demo = elementsDemoForStructure(s)
    const w = placeCifStructure(s, 'wrapped', 2, demo)
    s.atoms.forEach((a, i) => expect(w.fractionals[i]).toEqual(a.fractional))
    expect(placeCifStructure(s, 'nearest', 2, demo).hidden).toBeUndefined()
  })
  it('PDB crambin: chains intact (every copy whole, centroid in cell)', () => {
    const m = buildMacroModel(parseMmcif(readFileSync(resolve(__dirname, '../../pdb/__tests__/fixtures/1crn.cif'), 'utf8')))
    const s = expandMacro(m, 'full') as unknown as ExpandedStructure
    const n = check(s)
    expect(n).toBeGreaterThanOrEqual(2)
  })
  it('URL round-trips view=whole', () => {
    expect(parseViewQuery('?view=whole').view).toBe('whole')
    expect(serializeViewQuery({ ...VIEW_DEFAULTS, view: 'whole' })).toBe('?view=whole')
  })
})
