import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ASU_DIAGRAM_MAX_ATOMS,
  buildAsuDiagram,
  classifyAsuForDiagram,
  pcaAxes2,
  projectPoints2D,
} from '../asuDiagram'
import { expandStructure } from '../expandStructure'
import { extractMetadata } from '../metadata'
import { parseCif } from '../parseCif'

const acetic = readFileSync(
  resolve(__dirname, '../../../../public/samples/acetic_p21c.cif'),
  'utf8',
)
const galena = readFileSync(
  resolve(__dirname, '../../../../public/samples/cod/9000001.cif'),
  'utf8',
)

describe('pcaAxes2 / projectPoints2D', () => {
  it('projects a planar triangle into 2D with spread on both axes', () => {
    const pts: [number, number, number][] = [
      [0, 0, 0],
      [2, 0, 0],
      [1, 1.5, 0],
    ]
    const proj = projectPoints2D(pts)
    expect(proj).toHaveLength(3)
    const xs = proj.map((p) => p.x)
    const ys = proj.map((p) => p.y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(1)
  })

  it('returns orthonormal-ish axes for elongated cloud', () => {
    const pts: [number, number, number][] = Array.from({ length: 20 }, (_, i) => [
      i * 0.5,
      i * 0.01,
      Math.sin(i) * 0.02,
    ])
    const [e1, e2] = pcaAxes2(pts)
    const dot = e1[0] * e2[0] + e1[1] * e2[1] + e1[2] * e2[2]
    expect(Math.abs(dot)).toBeLessThan(0.15)
    expect(Math.hypot(...e1)).toBeCloseTo(1, 5)
    expect(Math.hypot(...e2)).toBeCloseTo(1, 5)
  })
})

describe('classifyAsuForDiagram', () => {
  it('flags empty and too-large', () => {
    expect(classifyAsuForDiagram([], []).kind).toBe('empty')
    const many = Array.from({ length: ASU_DIAGRAM_MAX_ATOMS + 1 }, () => ({
      element: 'C',
    }))
    expect(classifyAsuForDiagram(many, []).kind).toBe('too-large')
  })

  it('flags inorganic with no bonds as extended', () => {
    const atoms = [{ element: 'Pb' }, { element: 'S' }]
    expect(classifyAsuForDiagram(atoms, []).kind).toBe('extended')
  })

  it('accepts a small organic bonded fragment', () => {
    const atoms = [
      { element: 'C' },
      { element: 'C' },
      { element: 'O' },
      { element: 'O' },
      { element: 'H' },
    ]
    const bonds = [
      { a: 0, b: 1 },
      { a: 1, b: 2 },
      { a: 1, b: 3 },
      { a: 3, b: 4 },
    ]
    expect(classifyAsuForDiagram(atoms, bonds).kind).toBe('molecule')
  })
})

describe('buildAsuDiagram', () => {
  it('sketches the teaching acetic ASU as a molecule with bonds', () => {
    const expanded = expandStructure(parseCif(acetic))
    const model = buildAsuDiagram(expanded)
    expect(model.kind).toBe('molecule')
    expect(model.atomCount).toBe(8)
    expect(model.bonds.length).toBeGreaterThan(0)
    expect(model.viewBox.width).toBeGreaterThan(0.5)
    expect(model.viewBox.height).toBeGreaterThan(0.5)
    expect(model.altText.toLowerCase()).toContain('asymmetric-unit')
    // All projected points finite
    for (const a of model.atoms) {
      expect(Number.isFinite(a.x)).toBe(true)
      expect(Number.isFinite(a.y)).toBe(true)
      expect(a.color).toMatch(/^#/)
    }
  })

  it('does not invent a molecule diagram for galena (PbS)', () => {
    const expanded = expandStructure(parseCif(galena))
    const model = buildAsuDiagram(expanded)
    expect(model.kind).not.toBe('molecule')
    expect(model.atoms).toHaveLength(0)
    expect(model.reason || model.altText).toMatch(/formula|lattice|discrete|ionic|metallic/i)
  })
})

describe('extractMetadata smiles', () => {
  it('reads _chemical_formula_smiles', () => {
    const pairs = new Map<string, string>([
      ['_chemical_formula_sum', 'C2 H4 O2'],
      ['_chemical_formula_smiles', 'CC(=O)O'],
    ])
    const meta = extractMetadata(pairs, [])
    expect(meta.smiles).toBe('CC(=O)O')
    expect(meta.formula).toBe('C2 H4 O2')
  })

  it('reads SMILES-typed descriptor loop', () => {
    const pairs = new Map<string, string>()
    const loops = [
      {
        headers: [
          '_pdbx_chem_comp_descriptor.type',
          '_pdbx_chem_comp_descriptor.descriptor',
        ],
        rows: [
          ['InChI', 'InChI=1S/C2H4O2/c1-2(3)4/h1H3,(H,3,4)'],
          ['SMILES', 'CC(=O)O'],
        ],
      },
    ]
    const meta = extractMetadata(pairs, loops)
    expect(meta.smiles).toBe('CC(=O)O')
  })
})
