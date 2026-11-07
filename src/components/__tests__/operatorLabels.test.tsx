// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OperatorPanel from '../OperatorPanel'
import { getDemo } from '../../data/registry'
import { selectionLabels } from '../../data/opLabels'

afterEach(cleanup)

function panel(sg: number, idx: number, mode: 'nearest' | 'wrapped') {
  return (
    <MemoryRouter>
      <OperatorPanel demo={getDemo(sg)!} selectedIndex={idx} onSelect={() => {}} placementMode={mode} />
    </MemoryRouter>
  )
}

describe('operator panel shows derived labels', () => {
  it('Cmc2₁ op 7 is a b-glide (not "mirror ⊥ a"), with ITA symbol and accessible name', () => {
    render(panel(36, 7, 'nearest'))
    const row = screen.getByRole('option', { name: /Operator 7: .*b-glide, plane ¼, y, z/ })
    expect(row.textContent).toContain('b ¼, y, z')
    expect(document.body.textContent).not.toMatch(/mirror ⊥ a \(C\)/)
    expect(document.querySelector('.element-locus')!.textContent).toContain('b-glide')
  })

  it('Pnna op 3 is a 2-fold ‖ a; P6₃/mmc op 7 is a plain 2-fold', () => {
    render(panel(52, 3, 'nearest'))
    expect(screen.getByRole('option', { name: /Operator 3: .*2-fold rotation ‖ a/ })).toBeTruthy()
    cleanup()
    render(panel(194, 7, 'nearest'))
    expect(screen.getByRole('option', { name: /Operator 7: .*2-fold rotation ‖ \[11̄0\]/ })).toBeTruthy()
  })

  it('shown-copy note follows the placement mode and the operator', () => {
    for (const mode of ['nearest', 'wrapped'] as const) {
      for (const [sg, idx] of [[99, 8], [166, 16], [14, 2]] as const) {
        const s = selectionLabels(getDemo(sg)!, idx, mode)
        const { unmount } = render(panel(sg, idx, mode))
        const note = document.querySelector('.shown-copy-note')
        if (s.shifted) {
          expect(note).not.toBeNull()
          expect(note!.textContent).toContain(s.kindDiffers ? s.shown.label : s.shown.symbol)
        } else {
          expect(note).toBeNull()
        }
        unmount()
      }
    }
  })

  it('caption describes the drawn path in words', () => {
    const inv = selectionLabels(getDemo(2)!, 2, 'nearest')
    expect(inv.caption).toMatch(/shrinks through the centre/)
    const gl = selectionLabels(getDemo(14)!, 4, 'nearest')
    expect(gl.caption).toMatch(/c-glide/)
    expect(gl.motion.lead).toMatch(/flattens onto the plane .* sliding/)
  })
})
