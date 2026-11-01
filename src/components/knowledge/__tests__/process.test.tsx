import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import ProcessKnowledge from '../ProcessKnowledge'
import ProcessPage from '../../../pages/ProcessPage'
import { PROCESS_REFS } from '../../../data/literature/refs'
import { ProcessLogo } from '../../brand/SectionLogos'
import {
  SOLUBILITY, coolingT, coolingYield, msmprDominant, msmprMass, msmprMassMean, msmprN, mszw,
  productSize, saturationT, seedMass, solubility,
} from '../../../data/process/models'

const know = renderToStaticMarkup(<ProcessKnowledge />)
const page = renderToStaticMarkup(<MemoryRouter><ProcessPage /></MemoryRouter>)

describe('process refs', () => {
  it('40–60 unique refs with DOIs, all listed and cited', () => {
    expect(PROCESS_REFS.length).toBeGreaterThanOrEqual(40)
    expect(PROCESS_REFS.length).toBeLessThanOrEqual(60)
    expect(new Set(PROCESS_REFS.map((r) => r.id)).size).toBe(PROCESS_REFS.length)
    for (const r of PROCESS_REFS) {
      expect(r.doi).toMatch(/^10\.\d{4,9}\/\S+$/)
      expect(know).toContain(`id="ref-${r.id}"`)
      expect(know).toContain(`href="#ref-${r.id}"`)
    }
    expect(PROCESS_REFS.some((r) => /&amp;/.test(r.journal + r.title))).toBe(false)
  })
})

describe('process knowledge + page', () => {
  it('has 8 sections + refs and three figures with source notes', () => {
    for (const id of ['proc-modes', 'proc-msz', 'proc-pbm', 'proc-pat', 'proc-continuous', 'proc-forms', 'proc-downstream', 'proc-frontiers', 'proc-refs']) expect(know).toContain(`id="${id}"`)
    for (const p of ['plot-solubility', 'plot-msmpr', 'plot-profiles']) expect(know).toContain(`data-plot="${p}"`)
    expect((know.match(/Model curves, not data/g) ?? []).length).toBe(2)
  })
  it('page renders all widgets and logo', () => {
    for (const w of ['phase-diagram', 'cooling-profiles', 'msmpr', 'yield', 'seeding']) expect(page).toContain(`data-widget="${w}"`)
    expect(page).toContain('Industrial crystallization')
    expect(renderToStaticMarkup(<ProcessLogo />)).toContain('data-logo="process"')
  })
})

describe('process models', () => {
  it('solubility interpolates handbook table and inverts', () => {
    expect(solubility('KNO3', 20)).toBe(31.6)
    expect(solubility('KNO3', 25)).toBeCloseTo(38.7, 5)
    expect(saturationT('KNO3', 63.9)).toBeCloseTo(40, 6)
    for (const k of Object.keys(SOLUBILITY) as (keyof typeof SOLUBILITY)[]) {
      const d = SOLUBILITY[k]
      for (let i = 1; i < d.length; i++) expect(d[i][1]).toBeGreaterThan(d[i - 1][1])
    }
  })
  it('MSZW widens with cooling rate', () => {
    expect(mszw(0.5, 3)).toBeCloseTo(8, 9)
    expect(mszw(4, 3)).toBeCloseTo(16, 9)
    expect(mszw(0, 3)).toBe(0)
  })
  it('cooling profiles hit endpoints; cubic starts slowest', () => {
    for (const k of ['linear', 'natural', 'cubic'] as const) {
      expect(coolingT(k, 0, 60, 20)).toBeCloseTo(60, 9)
      expect(coolingT(k, 1, 60, 20)).toBeCloseTo(20, 9)
    }
    expect(coolingT('cubic', 0.2, 60, 20)).toBeGreaterThan(coolingT('linear', 0.2, 60, 20))
    expect(coolingT('natural', 0.2, 60, 20)).toBeLessThan(coolingT('linear', 0.2, 60, 20))
  })
  it('MSMPR: exponential decay, mass mode at 3Gτ', () => {
    expect(msmprN(100, 1, 1, 100)).toBeCloseTo(Math.exp(-1), 12)
    const Gt = 120
    const grid = Array.from({ length: 2001 }, (_, i) => i)
    const mode = grid.reduce((b, L) => (msmprMass(L, 1, Gt) > msmprMass(b, 1, Gt) ? L : b), 0)
    expect(mode).toBe(msmprDominant(1, Gt))
    expect(msmprMassMean(2, 10)).toBe(80)
  })
  it('yield and seed balance', () => {
    expect(coolingYield('KNO3', 60, 20).mass).toBeCloseTo(110 - 31.6, 9)
    expect(coolingYield('NaCl', 80, 20).frac).toBeLessThan(0.06)
    expect(coolingYield('NaCl', 80, 80, 0.5).mass).toBeCloseTo(19, 9)
    const Ws = seedMass(100, 50, 100)
    expect(Ws).toBeCloseTo(100 / 7, 9)
    expect(productSize(50, Ws / 100)).toBeCloseTo(100, 9)
    expect(seedMass(100, 100, 100)).toBe(Infinity)
  })
})
