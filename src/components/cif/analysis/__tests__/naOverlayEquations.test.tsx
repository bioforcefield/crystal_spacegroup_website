// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import StructureAnalysisPanel from '../StructureAnalysisPanel'
import { REF_COLOR } from '../OverlayAnalysis'
import { OVERLAY_COLORS } from '../../SequenceStrip'
import { NA_EQ_REFS } from '../NaEquations'
import { parseMmcif } from '../../../../data/pdb/mmcif'
import { buildMacroModel } from '../../../../data/pdb/macro'
import { pseudorotation } from '../../../../data/pdb/analysis'

const bna = () => buildMacroModel(parseMmcif(readFileSync(resolve(__dirname, '../../../../data/pdb/__tests__/fixtures/1bna.cif'), 'utf8')))
const a = bna(), b = { ...bna(), pdbId: 'twin' }
afterEach(cleanup)
const base = { onTab: () => {}, onClose: () => {}, onFocus: () => {}, focus: null, pocketKeys: null, pocketLabel: null }

describe('NA overlay: pucker wheel', () => {
  it('single structure: wheel unchanged (pucker-family colours, original name)', () => {
    const r = render(<StructureAnalysisPanel model={a} tab="pucker" {...base} />)
    const w = r.getByTestId('ana-plot-pucker-wheel')
    const fills = new Set([...w.querySelectorAll('circle[fill]')].map((c) => c.getAttribute('fill')))
    expect([...fills].every((f) => ['none', '#2563eb', '#dc2626', '#d97706'].includes(f!))).toBe(true)
    expect(w.querySelector('circle[data-s]')).toBeNull()
  })
  it('compare mode: every structure on the wheel in its overlay colour', () => {
    const r = render(<StructureAnalysisPanel model={a} tab="pucker" {...base} compare={[{ key: 'c1', label: 'TWIN', model: b }]} />)
    const w = r.getByTestId('ana-plot-pucker-wheel-overlay')
    const ref = w.querySelectorAll('circle[data-s="active"]'), cmp = w.querySelectorAll('circle[data-s="c1"]')
    expect(ref.length).toBeGreaterThan(15)
    expect(cmp.length).toBe(ref.length)
    expect(ref[0]!.getAttribute('fill')).toBe(REF_COLOR)
    expect(cmp[0]!.getAttribute('fill')).toBe(OVERLAY_COLORS[0])
  })
})

describe('Definitions & equations', () => {
  it('collapsed by default; KaTeX loads on open; cites verified DOIs', async () => {
    const r = render(<StructureAnalysisPanel model={a} tab="pucker" {...base} />)
    const d = r.getByTestId('ana-eq-pucker') as HTMLDetailsElement
    expect(d.open).toBe(false)
    expect(r.queryByTestId('ana-eq-body-pucker')).toBeNull()
    d.open = true
    fireEvent(d, new Event('toggle'))
    await waitFor(() => expect(r.getByTestId('ana-eq-body-pucker').querySelector('.katex')).toBeTruthy())
    expect(r.getByTestId('ana-eq-body-pucker').textContent).toMatch(/doi:10\.1021\/ja00778a043/)
  })
  it('bp and step blocks present for a duplex', () => {
    for (const t of ['bp', 'step'] as const) {
      const r = render(<StructureAnalysisPanel model={a} tab={t} {...base} />)
      expect(r.getByTestId(`ana-eq-${t}`)).toBeTruthy()
      cleanup()
    }
    expect(NA_EQ_REFS.olson.doi).toBe('10.1006/jmbi.2001.4987')
    expect(NA_EQ_REFS.lu.doi).toBe('10.1093/nar/gkg680')
  })
  it('the displayed pseudorotation formula matches the code', () => {
    const s = Math.sin(Math.PI / 5) + Math.sin((2 * Math.PI) / 5)
    for (const nu of [[-30, 38, -32, 15, 9], [2, -25, 37, -37, 22], [-10, 33, -40, 34, -15]]) {
      const [v0, v1, v2, v3, v4] = nu as [number, number, number, number, number]
      let P = (Math.atan2((v4 + v1) - (v3 + v0), 2 * v2 * s) * 180) / Math.PI
      if (P < 0) P += 360
      const r = pseudorotation(nu)
      expect(r.P).toBeCloseTo(P, 9)
      expect(r.tm).toBeCloseTo(v2 / Math.cos((P * Math.PI) / 180), 9)
    }
    expect(pseudorotation([-30, 38, -32, 15, 9]).name).toBe("C2'-endo")
    expect(pseudorotation([2, -25, 37, -37, 22]).name).toBe("C3'-endo")
  })
})
