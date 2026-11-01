import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMmcif } from '../mmcif'
import { buildMacroModel } from '../macro'
import { analyzeLigand, type InteractionType } from '../interactions'
import { diagramToSvg, layoutDiagram, parseCcdBonds, type RNode } from '../ligand2d'
import { parseViewQuery, serializeViewQuery, VIEW_DEFAULTS } from '../../cif/cifRoute'

const fx = (n: string) => readFileSync(resolve(__dirname, 'fixtures', n), 'utf8')
const m = buildMacroModel(parseMmcif(fx('1hsg.cif')))
const site = analyzeLigand(m, m.ligands.find((l) => l.id === 'MK1_B_902')!)
const ccd = parseCcdBonds(fx('MK1_ccd.cif'))
const overlaps = (a: RNode, b: RNode) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2

describe('2D ligand diagram (1HSG MK1)', () => {
  it('parses CCD bond orders incl. aromatic', () => {
    expect(ccd.size).toBeGreaterThan(40)
    expect([...ccd.values()].some((b) => b.aromatic)).toBe(true)
    expect([...ccd.values()].some((b) => b.order === 2)).toBe(true)
  })
  const d = layoutDiagram(site, ccd)
  it('places residue nodes without overlap', () => {
    expect(d.residues.length).toBeGreaterThan(5)
    for (let i = 0; i < d.residues.length; i++)
      for (let j = i + 1; j < d.residues.length; j++) expect(overlaps(d.residues[i]!, d.residues[j]!)).toBe(false)
  })
  it('keeps residue boxes off ligand atoms', () => {
    for (const r of d.residues) for (const a of d.atoms) expect(Math.abs(r.x - a.x) < r.w / 2 && Math.abs(r.y - a.y) < r.h / 2).toBe(false)
  })
  it('represents every interaction with an edge to its residue', () => {
    expect(d.edges.length).toBe(site.interactions.length)
    const keys = new Set(d.residues.map((r) => r.key))
    for (const e of d.edges) expect(keys.has(e.resKey)).toBe(true)
    expect(d.edges.some((e) => e.type === 'hbond' && e.label.includes('ASP 25'))).toBe(true)
  })
  it('uses CCD bond orders (aromatic rings drawn)', () => {
    expect(d.bonds.some((b) => b.aromatic)).toBe(true)
    expect(d.rings.length).toBeGreaterThanOrEqual(1)
  })
  it('ligand bonds are near uniform length after relaxation', () => {
    const L = d.bonds.map((b) => Math.hypot(d.atoms[b.i]!.x - d.atoms[b.j]!.x, d.atoms[b.i]!.y - d.atoms[b.j]!.y))
    const mean = L.reduce((s, x) => s + x, 0) / L.length
    for (const l of L) expect(Math.abs(l - mean) / mean).toBeLessThan(0.35)
  })
  it('respects type toggles', () => {
    const only = new Set<InteractionType>(['hbond'])
    const h = layoutDiagram(site, ccd, only)
    expect(h.edges.every((e) => e.type === 'hbond')).toBe(true)
    expect(h.edges.length).toBe(site.interactions.filter((i) => i.type === 'hbond').length)
  })
  it('exports a standalone SVG string', () => {
    const svg = diagramToSvg(d)
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
    expect(svg).toContain('MK1 902 B')
    expect(svg).toContain('ASP 25')
    expect((svg.match(/class="lig2d-res"/g) ?? []).length).toBe(d.residues.length)
    expect((svg.match(/class="lig2d-int"/g) ?? []).length).toBe(d.edges.length)
    expect(svg).not.toMatch(/NaN/)
  })
  it('works without CCD (single bonds) and for a single-atom ligand', () => {
    expect(layoutDiagram(site, null).bonds.every((b) => b.order === 1)).toBe(true)
    const one = { ...site, atoms: site.atoms.slice(0, 1), bonds: [], interactions: site.interactions.filter((i) => i.ligIdx?.[0] === 0).map((i) => ({ ...i, ligIdx: [0] })) }
    const s = diagramToSvg(layoutDiagram(one, null))
    expect(s).not.toMatch(/NaN/)
  })
  it('diagram=1 round-trips in the URL only with a ligand', () => {
    const q = serializeViewQuery({ ...VIEW_DEFAULTS, lig: 'MK1_B_902', diagram: true })
    expect(q).toContain('diagram=1')
    expect(parseViewQuery(q).diagram).toBe(true)
    expect(parseViewQuery('?diagram=1').diagram).toBeUndefined()
  })
})

describe('2D diagram: residues stacked over a planar ligand face', () => {
  it('pushes face-on residues off the ligand footprint', () => {
    // fake every contact as perpendicular to the PCA plane by collapsing directions
    const s2 = { ...site, interactions: site.interactions.map((i) => ({ ...i, b: i.a })) }
    const d = layoutDiagram(s2, null)
    for (const r of d.residues) for (const a of d.atoms) expect(Math.abs(r.x - a.x) < r.w / 2 && Math.abs(r.y - a.y) < r.h / 2).toBe(false)
    for (let i = 0; i < d.residues.length; i++)
      for (let j = i + 1; j < d.residues.length; j++) expect(overlaps(d.residues[i]!, d.residues[j]!)).toBe(false)
  })
})

describe('SVG injection safety', () => {
  it('escapes hostile atom / residue names', () => {
    const evil = '<img src=x onerror=alert(1)>'
    const hostile = { ...site, ligand: { ...site.ligand, label: evil, comp: evil }, atoms: site.atoms.map((a, i) => (i === 0 ? { ...a, name: evil } : a)),
      pocket: site.pocket.map((p) => ({ ...p, label: evil, comp: evil })), interactions: site.interactions.map((x) => ({ ...x, resLabel: evil, ligAtom: evil })) }
    const svg = diagramToSvg(layoutDiagram(hostile, null))
    expect(svg).not.toMatch(/<img/)
    expect(svg).toMatch(/&lt;img/)
    expect(/<[^>]*onerror/i.test(svg)).toBe(false)
  })
})
