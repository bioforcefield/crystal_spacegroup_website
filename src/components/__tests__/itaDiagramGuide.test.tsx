// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OperatorPanel from '../OperatorPanel'
import ItaDiagramGuide from '../ItaDiagramGuide'
import { getDemo } from '../../data/registry'
import {
  ITA_GUIDE_CITATIONS,
  P21C_ITA_WALKTHROUGH,
  P21C_PLATE_VIEWS,
} from '../../data/itaGuide'

afterEach(() => {
  document.body.style.overflow = ''
  cleanup()
})

describe('ItaDiagramGuide', () => {
  it('opens a full guide dialog with corrected plate walk-through and citations', async () => {
    render(<ItaDiagramGuide spaceGroupNumber={14} hm="P21/c" />)
    fireEvent.click(screen.getByTestId('ita-guide-open'))
    expect(screen.getByTestId('ita-guide-modal').getAttribute('role')).toBe('dialog')
    expect(document.body.style.overflow).toBe('hidden')

    const symbols = screen.getByTestId('ita-guide-symbols')
    expect(symbols.querySelectorAll('svg').length).toBeGreaterThanOrEqual(8)
    expect(symbols.querySelector('[data-testid="glyph-twofold-perp"]')).toBeTruthy()
    expect(symbols.querySelectorAll('[data-testid="glyph-twofold-perp"] ~ ellipse, [data-testid="glyph-twofold-perp"] ellipse')).toHaveLength(0)

    expect(screen.getByTestId('ita-guide-p21c').className).toMatch(/is-current/)
    const example = screen.getByTestId('ita-guide-p21c').textContent ?? ''
    expect(example).toContain('Top-left')
    expect(example).toContain('Top-right')
    expect(example).toContain('Bottom-left')
    expect(example).toContain('Bottom-right')
    // Swapped-panel regression: along-a has vertical dashed; along-c has dotted + z=1/4
    expect(example).toMatch(/Vertical dashed lines[\s\S]*c-glide/)
    expect(example).toMatch(/Horizontal dotted lines[\s\S]*z = 1\/4/)
    expect(example).toMatch(/angular corner[\s\S]*y = 1\/4/)
    expect(example).toContain(P21C_ITA_WALKTHROUGH.operators[1].triplet)
    expect(P21C_PLATE_VIEWS[1].id).toBe('along-a')

    expect(screen.getByTestId('ita-guide-parallel-planes')).toBeTruthy()
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
