// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import SmallMolAnalysisPanel from '../SmallMolAnalysisPanel'
import { parseCif } from '../../../../data/cif/parseCif'
import { expandStructure } from '../../../../data/cif/expandStructure'

const fx = (id: string) => { const t = readFileSync(resolve(__dirname, `../../../../../public/samples/cod/${id}.cif`), 'utf8'); return { structure: expandStructure(parseCif(t)), cifText: t } }
afterEach(cleanup)

describe('SmallMolAnalysisPanel', () => {
  it('opens on Summary; bonds default to the CIF table with esd and symmetry footnotes; row click focuses', () => {
    const onFocus = vi.fn()
    const r = render(<SmallMolAnalysisPanel {...fx('2212817')} title="2212817" onClose={() => {}} focus={null} onFocus={onFocus} />)
    expect(r.getByTestId('sm-tab-summary').getAttribute('aria-selected')).toBe('true')
    expect(r.getByTestId('sm-summary').textContent).toMatch(/C13 H19 N O/)
    fireEvent.click(r.getByTestId('sm-tab-hbonds'))
    expect(r.getByTestId('sm-table-hbonds').textContent).toMatch(/2\.924\(3\)/)
    expect(r.getByTestId('sm-symcodes').textContent).toMatch(/x/)
    fireEvent.click(r.getByTestId('sm-tab-bonds'))
    expect(r.getByTestId('sm-table-bonds').textContent).toMatch(/1\.523\(4\)/)
    fireEvent.change(r.getByTestId('sm-src'), { target: { value: 'computed' } })
    expect(r.getByTestId('sm-table-bonds').textContent).toMatch(/1\.52\d/)
    fireEvent.click(r.getByTestId('sm-table-bonds').querySelector('tbody tr')!)
    expect(onFocus).toHaveBeenCalledWith(expect.objectContaining({ anchorAu: expect.any(Number) }))
  })
  it('inorganic shows the coordination / BVS tab', () => {
    const r = render(<SmallMolAnalysisPanel {...fx('1010962')} title="1010962" onClose={() => {}} focus={null} onFocus={() => {}} />)
    fireEvent.click(r.getByTestId('sm-tab-coord'))
    expect(r.getByTestId('sm-table-coord').textContent).toMatch(/octahedral/)
    expect(r.getByTestId('sm-caveats').textContent).toMatch(/standard uncertainty/)
  })
})
