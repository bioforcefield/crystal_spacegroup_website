// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import SequenceStrip from '../SequenceStrip'
import { parseMmcif } from '../../../data/pdb/mmcif'
import { buildMacroModel } from '../../../data/pdb/macro'

const model = buildMacroModel(parseMmcif(readFileSync(resolve(__dirname, '../../../data/pdb/__tests__/fixtures/1crn.cif'), 'utf8')))
const noop = () => {}

afterEach(cleanup)

describe('SequenceStrip keyboard access', () => {
  const setup = () => {
    const onFocus = vi.fn()
    const r = render(<SequenceStrip entries={[{ key: '1CRN', label: '1CRN', model }]} focusKey={null} onFocus={onFocus}
      onAddPdb={noop} onAddFile={noop} onRemove={noop} onOverlay={noop} />)
    const cells = [...r.container.querySelectorAll<HTMLElement>('[data-seqk]')]
    return { onFocus, cells }
  }

  it('puts exactly one residue in the tab order, with an accessible label', () => {
    const { cells } = setup()
    expect(cells.length).toBeGreaterThan(40)
    expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1)
    expect(cells[0]!.tabIndex).toBe(0)
    expect(cells[0]!.getAttribute('aria-label')).toMatch(/^THR 1 · chain A/)
  })

  it('arrow keys / Home / End move focus; Enter and Space centre the residue', () => {
    const { cells, onFocus } = setup()
    cells[0]!.focus()
    fireEvent.keyDown(cells[0]!, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(cells[1])
    expect(cells[1]!.tabIndex).toBe(0)
    expect(cells[0]!.tabIndex).toBe(-1)
    fireEvent.keyDown(cells[1]!, { key: 'End' })
    expect(document.activeElement).toBe(cells[cells.length - 1])
    fireEvent.keyDown(document.activeElement!, { key: 'Home' })
    expect(document.activeElement).toBe(cells[0])
    fireEvent.keyDown(cells[0]!, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(cells[0])
    fireEvent.keyDown(cells[0]!, { key: 'Enter' })
    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(onFocus.mock.calls[0]![0]).toMatchObject({ label: 'THR 1 A' })
    fireEvent.keyDown(cells[0]!, { key: ' ' })
    expect(onFocus).toHaveBeenCalledTimes(2)
  })

  it('shows the alignment scoring scheme as a tooltip when comparing', () => {
    const r = render(<SequenceStrip entries={[{ key: 'a', label: 'A', model }, { key: 'b', label: 'B', model }]} focusKey={null}
      onFocus={noop} onAddPdb={noop} onAddFile={noop} onRemove={noop} onOverlay={noop} />)
    const aln = r.container.querySelector('[data-testid="seq-alignment"]')
    expect(aln?.getAttribute('title')).toMatch(/BLOSUM62/)
  })
})
