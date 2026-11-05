// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OperatorPanel from '../OperatorPanel'
import ItaDiagramGuide from '../ItaDiagramGuide'
import { getDemo } from '../../data/registry'
import { ITA_GUIDE_CITATIONS, P21C_ITA_WALKTHROUGH } from '../../data/itaGuide'

afterEach(() => {
  document.body.style.overflow = ''
  cleanup()
})

describe('ItaDiagramGuide', () => {
  it('opens a full guide dialog with symbols, P21/c example, and citations', async () => {
    render(<ItaDiagramGuide spaceGroupNumber={14} hm="P21/c" />)
    expect(screen.queryByTestId('ita-guide-modal')).toBeNull()
    fireEvent.click(screen.getByTestId('ita-guide-open'))
    const modal = screen.getByTestId('ita-guide-modal')
    expect(modal.getAttribute('role')).toBe('dialog')
    expect(document.body.style.overflow).toBe('hidden')
    expect(screen.getByTestId('ita-guide-symbols').querySelectorAll('svg').length).toBeGreaterThanOrEqual(8)
    expect(screen.getByTestId('ita-guide-p21c').className).toMatch(/is-current/)
    expect(screen.getByTestId('ita-guide-p21c-ops').textContent).toContain(
      P21C_ITA_WALKTHROUGH.operators[1].triplet,
    )
    for (const c of ITA_GUIDE_CITATIONS) {
      expect(screen.getByRole('link', { name: c.label }).getAttribute('href')).toBe(c.url)
    }
    expect(screen.getByRole('heading', { name: /Two diagram types/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Limits of this guide/i })).toBeTruthy()
    fireEvent.click(screen.getByTestId('ita-guide-close'))
    await waitFor(() => expect(screen.queryByTestId('ita-guide-modal')).toBeNull())
  })

  it('is available next to Enlarge without changing the default plate size', () => {
    const demo = getDemo(14)!
    render(
      <MemoryRouter>
        <OperatorPanel
          demo={demo}
          selectedIndex={1}
          onSelect={() => {}}
          placementMode="nearest"
        />
      </MemoryRouter>,
    )
    const img = screen.getByAltText(/International Tables Vol\. A diagram for space group 14/)
    expect(img.getAttribute('width')).toBe('280')
    expect(screen.getByTestId('ita-enlarge')).toBeTruthy()
    expect(screen.getByTestId('ita-guide-open')).toBeTruthy()
  })
})
