// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import StructureAnalysisPanel from '../StructureAnalysisPanel'
import { buildOverlay, parseOvId, ovId, REF_COLOR } from '../OverlayAnalysis'
import { OVERLAY_COLORS } from '../../SequenceStrip'
import { parseMmcif } from '../../../../data/pdb/mmcif'
import { buildMacroModel } from '../../../../data/pdb/macro'
import { analyzeStructure, overlaySectionCsv, overlayFullReportCsv } from '../../../../data/pdb/analysis'

const fx = (n: string) => buildMacroModel(parseMmcif(readFileSync(resolve(__dirname, `../../../../data/pdb/__tests__/fixtures/${n}`), 'utf8')))
const hsg = fx('1hsg.cif'), crn = fx('1crn.cif')
const hsg2 = { ...fx('1hsg.cif'), pdbId: 'copy' }
afterEach(cleanup)

const base = { tab: 'rama' as const, onTab: () => {}, onClose: () => {}, focus: null, pocketKeys: null, pocketLabel: null }

describe('Structure analysis overlay (compare mode)', () => {
  it('single structure: no toggle, no overlay, original plots', () => {
    const r = render(<StructureAnalysisPanel model={hsg} onFocus={() => {}} {...base} />)
    expect(r.queryByTestId('ana-overlay-toggle')).toBeNull()
    expect(r.queryByTestId('ana-overlay')).toBeNull()
    expect(r.getByTestId('ana-plot-rama-general')).toBeTruthy()
    expect(r.getByTestId('ana-plot-omega-hist')).toBeTruthy()
  })

  it('≥2 structures: overlay on by default with legend, summary columns and per-structure colours', () => {
    const r = render(<StructureAnalysisPanel model={hsg} onFocus={() => {}} {...base} compare={[{ key: 'c1', label: '1CRN', model: crn }]} />)
    const t = r.getByTestId('ana-overlay-toggle') as HTMLInputElement
    expect(t.checked).toBe(true)
    expect(r.getByTestId('ana-overlay')).toBeTruthy()
    const legend = r.getByTestId('ana-legend').querySelectorAll('li')
    expect(legend).toHaveLength(2)
    expect(legend[0]!.textContent).toMatch(/^1HSG · A/)
    expect(legend[1]!.textContent).toMatch(/^1CRN · A/)
    const sum = r.getByTestId('ana-overlay-summary')
    expect(sum.querySelectorAll('thead th')).toHaveLength(3)
    const scatter = r.getByTestId('ana-plot-rama-general-overlay')
    const fills = new Set([...scatter.querySelectorAll('circle')].map((c) => c.getAttribute('fill')))
    expect(fills.has(REF_COLOR)).toBe(true)
    expect(fills.has(OVERLAY_COLORS[0]!)).toBe(true)
    expect(scatter.querySelector('[data-testid="rama-contours"]')).toBeTruthy()
    // turning it off restores the single-structure view
    fireEvent.click(t)
    expect(r.queryByTestId('ana-overlay')).toBeNull()
    expect(r.getByTestId('ana-plot-rama-general')).toBeTruthy()
  })

  it('histograms switch between fraction and count', () => {
    const r = render(<StructureAnalysisPanel model={hsg} onFocus={() => {}} {...base} compare={[{ key: 'c1', label: '1CRN', model: crn }]} />)
    const h = () => r.getByTestId('ana-plot-omega-hist-overlay').textContent
    expect(h()).toMatch(/fraction/)
    fireEvent.click(r.getByTestId('ana-normalize'))
    expect(h()).toMatch(/count/)
    expect(r.getByTestId('ana-plot-omega-hist-overlay').querySelectorAll('path')).toHaveLength(2)
  })

  it('click-to-pick focuses the residue in the right structure (superposed frame)', () => {
    const onFocus = vi.fn()
    const r = render(<StructureAnalysisPanel model={hsg} onFocus={onFocus} {...base} compare={[{ key: 'c1', label: 'COPY', model: hsg2 }]} />)
    const pts = [...r.getByTestId('ana-plot-rama-general-overlay').querySelectorAll<SVGCircleElement>('circle[data-s="c1"]')]
    fireEvent.click(pts[0]!)
    const f = onFocus.mock.calls[0]![0]
    expect(f.key.startsWith('c1::')).toBe(true)
    expect(f.label).toMatch(/^COPY /)
    // identical copy superposes onto itself → same centre as the reference residue
    const refPt = r.getByTestId('ana-plot-rama-general-overlay').querySelector<SVGCircleElement>(`circle[data-id="${parseOvId(f.key).resKey}"]`)!
    fireEvent.click(refPt)
    const g = onFocus.mock.calls[1]![0]
    expect(g.key).toBe(parseOvId(f.key).resKey)
    for (let i = 0; i < 3; i++) expect(f.center[i]).toBeCloseTo(g.center[i], 2)
  })

  it('aligns by sequence; ids round-trip', () => {
    const o = buildOverlay([{ key: 'active', label: '1HSG', model: hsg, color: REF_COLOR }, { key: 'c1', label: 'X', model: hsg2, color: '#f00' }])
    expect(o.aligned).toBe(true)
    expect(o.structs[1]!.fit!.rmsd).toBeLessThan(1e-3)
    const k = o.structs[0]!.full.residues[0]!.key
    expect(o.structs[0]!.col!.get(k)).toBe(o.structs[1]!.col!.get(k))
    expect(ovId({ idx: 0, key: 'active' }, k)).toBe(k)
    expect(parseOvId(ovId({ idx: 1, key: 'c1' }, k))).toEqual({ entry: 'c1', resKey: k })
  })

  it('overlay CSV carries a structure column', () => {
    const a = (m: typeof hsg) => { const f = analyzeStructure(m); return { protein: f.protein, nucleic: f.nucleic, pairs: f.pairs, steps: f.steps, form: f.form } }
    const list = [{ label: '1HSG · A', a: a(hsg) }, { label: '1CRN · A', a: a(crn) }]
    const csv = overlaySectionCsv('backbone', list, { pdbId: '1HSG vs 1CRN', filter: 'all chains' })
    const lines = csv.split('\n').filter((l) => l && !l.startsWith('#'))
    expect(lines[0]).toBe('structure,chain,resnum,resname,phi,psi,omega,cis,rama_category,rama_class')
    expect(lines.some((l) => l.startsWith('1HSG · A,'))).toBe(true)
    expect(lines.some((l) => l.startsWith('1CRN · A,'))).toBe(true)
    expect(overlayFullReportCsv(list, { pdbId: 'x', filter: 'all' })).toMatch(/Side-chain chi — overlay of 2 structures/)
  })
})
