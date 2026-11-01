import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import FormsKnowledge from '../FormsKnowledge'
import FormsPage from '../../../pages/FormsPage'
import { FORMS_REFS } from '../../../data/literature/refs'
import { FormsLogo } from '../../brand/SectionLogos'
import {
  classify, cocrystalEutectics, criticalAw, gRel, heatOfFusionRule, hydrationDG, phSolubilityBase, pHmax,
  saltProbability, transitionT,
} from '../../../data/forms/models'

const know = renderToStaticMarkup(<MemoryRouter><FormsKnowledge /></MemoryRouter>)
const page = renderToStaticMarkup(<MemoryRouter><FormsPage /></MemoryRouter>)

describe('forms refs + render', () => {
  it('40–60 unique refs, all listed and cited', () => {
    expect(FORMS_REFS.length).toBeGreaterThanOrEqual(40)
    expect(FORMS_REFS.length).toBeLessThanOrEqual(60)
    expect(new Set(FORMS_REFS.map((r) => r.id)).size).toBe(FORMS_REFS.length)
    for (const r of FORMS_REFS) {
      expect(r.doi).toMatch(/^10\.\d{4,9}\/\S+$/)
      expect(know).toContain(`id="ref-${r.id}"`)
      expect(know).toContain(`href="#ref-${r.id}"`)
      expect(r.authors).not.toContain('\uFFFD')
    }
  })
  it('sections, figures, Lattice Lab links', () => {
    for (const id of ['forms-poly', 'forms-conf', 'forms-hydrates', 'forms-salts', 'forms-cocrystals', 'forms-amorphous', 'forms-eutectics', 'forms-screening', 'forms-refs']) expect(know).toContain(`id="${id}"`)
    for (const p of ['plot-dpka', 'plot-ph']) expect(know).toContain(`data-plot="${p}"`)
    expect(know).toContain('href="/cif/cod/2100187"')
  })
  it('page widgets + logo', () => {
    for (const w of ['dpka', 'ph-solubility', 'hydrate', 'burger', 'cocrystal']) expect(page).toContain(`data-widget="${w}"`)
    expect(renderToStaticMarkup(<FormsLogo />)).toContain('data-logo="forms"')
  })
})

describe('forms models', () => {
  it('ΔpKa rule (Cruz-Cabeza 2012)', () => {
    expect(classify(-2)).toBe('cocrystal')
    expect(classify(2)).toBe('continuum')
    expect(classify(5)).toBe('salt')
    expect(saltProbability(2)).toBeCloseTo(0.62, 9)
    expect(saltProbability(-1)).toBeCloseTo(0.11, 9)
    expect(saltProbability(4.5)).toBe(1)
    expect(saltProbability(4)).toBeCloseTo(0.96, 9)
  })
  it('pH-solubility envelope meets at pHmax', () => {
    const pm = pHmax(7, 0.01, 1)
    expect(pm).toBeCloseTo(5, 9)
    const r = phSolubilityBase(pm, 7, 0.01, 1)
    expect(r.base).toBeCloseTo(r.salt, 9)
    expect(phSolubilityBase(8, 7, 0.01, 1).S).toBeCloseTo(0.011, 9)
  })
  it('hydrate: a_w,c rises with T for endothermic dehydration; sign of ΔG', () => {
    expect(criticalAw(25, 0.3, 50)).toBeCloseTo(0.3, 9)
    expect(criticalAw(50, 0.3, 50)).toBeGreaterThan(0.3)
    expect(hydrationDG(0.6, 0.3, 25)).toBeLessThan(0)
    expect(hydrationDG(0.1, 0.3, 25)).toBeGreaterThan(0)
  })
  it('Burger–Ramberger heat-of-fusion rule and crossing', () => {
    const A = { Tm: 450, dHf: 28 }, B = { Tm: 440, dHf: 32 }
    expect(heatOfFusionRule(A, B)).toBe('enantiotropic')
    const Tt = transitionT(A, B)
    expect(gRel(A, Tt)).toBeCloseTo(gRel(B, Tt), 9)
    expect(Tt).toBeLessThan(440)
    expect(heatOfFusionRule({ Tm: 450, dHf: 35 }, B)).toBe('monotropic')
  })
  it('cocrystal eutectics and Keu', () => {
    const r = cocrystalEutectics(10, 200, 100)
    expect(r.E1).toEqual({ A: 10, B: 10 })
    expect(r.Keu).toBe(1)
    expect(r.exists).toBe(true)
    expect(cocrystalEutectics(10, 200, 1e4).exists).toBe(false)
    expect(cocrystalEutectics(10, 200, 400).Keu).toBe(4)
  })
})
