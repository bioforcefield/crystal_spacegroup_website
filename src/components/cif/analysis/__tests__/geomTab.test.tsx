// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import StructureAnalysisPanel from '../StructureAnalysisPanel'
import { parseMmcif } from '../../../../data/pdb/mmcif'
import { buildMacroModel } from '../../../../data/pdb/macro'
import { analyzeStructure, fullReportCsv, overlaySectionCsv, sectionCsv } from '../../../../data/pdb/analysis'

const fx = (n: string) => buildMacroModel(parseMmcif(readFileSync(resolve(__dirname, `../../../../data/pdb/__tests__/fixtures/${n}`), 'utf8')))
const hsg = fx('1hsg.cif'), crn = fx('1crn.cif'), bna = fx('1bna.cif')
afterEach(cleanup)
const base = { onTab: () => {}, onClose: () => {}, focus: null, pocketKeys: null, pocketLabel: null }

describe('Bonds & angles tab', () => {
  it('default tab is unchanged; geom tab is listed', () => {
    const r = render(<StructureAnalysisPanel model={hsg} tab="rama" onFocus={() => {}} {...base} />)
    expect(r.getByTestId('ana-tab-rama').getAttribute('aria-selected')).toBe('true')
    expect(r.getByTestId('ana-tab-geom')).toBeTruthy()
  })
  it('single: histograms with ideal marker, summary, definitions, outlier click focuses', () => {
    const onFocus = vi.fn()
    const r = render(<StructureAnalysisPanel model={crn} tab="geom" onFocus={onFocus} {...base} />)
    expect(r.getByTestId('geom-summary').textContent).toMatch(/C–N \(peptide\)/)
    expect(r.container.querySelectorAll('[data-testid="ana-ideal"]').length).toBeGreaterThan(2)
    expect(r.getByTestId('geom-defs').textContent).toMatch(/Engh/)
    const row = r.getByTestId('geom-outliers').querySelector('tbody tr')!
    fireEvent.click(row)
    expect(onFocus).toHaveBeenCalled()
    fireEvent.click(r.getByTestId('geom-grp-psc-bond'))
    expect(r.getByTestId('geom-summary').textContent).toMatch(/S–S \(disulfide\)/)
  })
  it('ligand toggle adds the distance-based group', () => {
    const r = render(<StructureAnalysisPanel model={hsg} tab="geom" onFocus={() => {}} {...base} />)
    expect(r.queryByTestId('geom-grp-lig-bond')).toBeNull()
    fireEvent.click(r.getByTestId('geom-lig-toggle'))
    fireEvent.click(r.getByTestId('geom-grp-lig-bond'))
    expect(r.container.textContent).toMatch(/Distance-based/)
  })
  it('overlay: one histogram per type with both structures', () => {
    const r = render(<StructureAnalysisPanel model={hsg} tab="geom" onFocus={() => {}} {...base} compare={[{ key: 'c1', label: '1CRN', model: crn }]} />)
    expect(r.getByTestId('ana-overlay')).toBeTruthy()
    expect(r.getByTestId('geom-summary').querySelectorAll('thead th')[0]!.textContent).toBe('Structure')
  })
  it('CSV: single section and overlay with structure column; nucleic rows present', () => {
    const A = analyzeStructure(bna)
    const a = { protein: A.protein, nucleic: A.nucleic, pairs: A.pairs, steps: A.steps, form: A.form, geom: A.geom }
    const s = sectionCsv('geom', a, { pdbId: '1bna', filter: 'all' })
    expect(s).toMatch(/group,kind,type,chain/)
    expect(s).toMatch(/nbb-bond,bond,O3'–P/)
    expect(fullReportCsv(a, { pdbId: '1bna', filter: 'all' })).toMatch(/Bond lengths and angles/)
    expect(overlaySectionCsv('geom', [{ label: 'X', a }], { pdbId: 'x', filter: 'all' })).toMatch(/structure,group,kind/)
  })
})
