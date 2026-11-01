import React from 'react'
;(globalThis as { React?: typeof React }).React = React
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MorphologyKnowledge from '../MorphologyKnowledge'
import KineticsKnowledge from '../KineticsKnowledge'
import { KINETICS_REFS, MORPH_REFS } from '../../../data/literature/refs'
import { CNT_AB, PARACETAMOL_FACE_AREAS, cntRate, avrami } from '../../../data/literature/publishedData'
import { KineticsLogo, MorphLogo, PubsLogo } from '../../brand/SectionLogos'

const morph = renderToStaticMarkup(<MorphologyKnowledge />)
const kin = renderToStaticMarkup(<KineticsKnowledge />)

describe('literature refs', () => {
  it.each([['morph', MORPH_REFS], ['kinetics', KINETICS_REFS]] as const)('%s: 30–60 refs, unique ids, DOIs', (_n, refs) => {
    expect(refs.length).toBeGreaterThanOrEqual(30)
    expect(refs.length).toBeLessThanOrEqual(60)
    expect(new Set(refs.map((r) => r.id)).size).toBe(refs.length)
    for (const r of refs) {
      expect(r.doi).toMatch(/^10\.\d{4,9}\/\S+$/)
      expect(r.title.length).toBeGreaterThan(5)
      expect(r.year).toBeGreaterThan(1800)
    }
  })
  it('every ref is listed with a doi.org link', () => {
    for (const r of MORPH_REFS) expect(morph).toContain(`id="ref-${r.id}"`)
    for (const r of KINETICS_REFS) expect(kin).toContain(`id="ref-${r.id}"`)
    expect((morph.match(/https:\/\/doi\.org\//g) ?? []).length).toBe(MORPH_REFS.length)
  })
})

describe('knowledge sections render', () => {
  it('morphology has TOC, sections and plots', () => {
    expect(morph).toContain('know-toc')
    for (const id of ['morph-theory', 'morph-methods', 'morph-additives', 'morph-experiment', 'morph-frontiers', 'morph-results']) expect(morph).toContain(`id="${id}"`)
    expect(morph).toContain('data-plot="plot-paracetamol-areas"')
    expect(morph).toContain('data-plot="plot-paracetamol-rank"')
    expect(morph).toContain('Hartman')
  })
  it('kinetics has sections and three plots with source notes', () => {
    for (const id of ['kin-cnt', 'kin-nonclassical', 'kin-msz', 'kin-growth', 'kin-overall', 'kin-polymorph', 'kin-methods', 'kin-frontiers']) expect(kin).toContain(`id="${id}"`)
    for (const p of ['plot-cnt-rates', 'plot-cnt-linear', 'plot-avrami']) expect(kin).toContain(`data-plot="${p}"`)
    expect(kin).toContain('Computed from published parameters')
    expect((kin.match(/<polyline/g) ?? []).length).toBe(CNT_AB.length * 2 + 4)
  })
})

describe('published data', () => {
  it('paracetamol face areas sum to ~1 per supersaturation', () => {
    for (const g of ['low', 'medium', 'high'] as const) {
      const s = PARACETAMOL_FACE_AREAS.reduce((a, f) => a + f[g], 0)
      expect(Math.abs(s - 1)).toBeLessThan(0.002)
    }
  })
  it('CNT rate matches formula and is monotone in S', () => {
    const p = CNT_AB[2]
    expect(cntRate(p.A, p.B, 2)).toBeCloseTo(870e3 * 2 * Math.exp(-3.6 / Math.log(2) ** 2), 6)
    expect(cntRate(p.A, p.B, 1)).toBe(0)
    expect(cntRate(p.A, p.B, 2.5)).toBeGreaterThan(cntRate(p.A, p.B, 2))
  })
  it('avrami half-time', () => {
    expect(avrami(Math.log(2) ** (1 / 3), 1, 3)).toBeCloseTo(0.5, 10)
  })
})

describe('section logos', () => {
  it.each([['pubs', PubsLogo], ['morph', MorphLogo], ['kinetics', KineticsLogo]] as const)('%s renders at 16 and 30 px', (id, L) => {
    const a = renderToStaticMarkup(<L size={16} />)
    expect(a).toContain(`data-logo="${id}"`)
    expect(a).toContain('width="16"')
    expect(a).toContain('aria-hidden="true"')
    expect(renderToStaticMarkup(<L size={30} />)).toContain('width="30"')
  })
})
