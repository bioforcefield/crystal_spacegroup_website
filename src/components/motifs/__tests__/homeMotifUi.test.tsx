// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import SymmetryPrimer from '../../SymmetryPrimer'
import HeroCellMotif from '../../hero/HeroCellMotif'
import { MOTIF_STYLE_STORAGE_KEY } from '../motifStyles'

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

describe('home primer motif styles', () => {
  it('defaults to Tetra 3D canvases, labelled selector with four options', () => {
    const { container } = render(<SymmetryPrimer />)
    const sel = screen.getByLabelText(/motif/i) as HTMLSelectElement
    expect(sel.value).toBe('tetra')
    expect(Array.from(sel.options).map((o) => o.value)).toEqual(['tetra', 'tribo', 'lopsy', 'classic'])
    const canvases = container.querySelectorAll('canvas.primer-canvas')
    expect(canvases.length).toBe(6)
    canvases.forEach((c) => {
      expect(c.getAttribute('data-motif-style')).toBe('tetra')
      expect(c.getAttribute('aria-hidden')).toBe('true')
    })
    expect(container.querySelectorAll('svg.primer-svg').length).toBe(0)
    // Learning copy stays; styled text avoids the classic-L wording.
    expect(container.textContent).toMatch(/Improper — enantiomorph/)
    expect(container.textContent).not.toMatch(/isometric L/)
  })

  it('Classic L restores the original SVG cards; the choice is shared and remembered', () => {
    const { container, unmount } = render(<SymmetryPrimer />)
    fireEvent.change(screen.getByLabelText(/motif/i), { target: { value: 'classic' } })
    expect(container.querySelectorAll('svg.primer-svg').length).toBe(6)
    expect(container.querySelectorAll('canvas.primer-canvas').length).toBe(0)
    expect(window.localStorage.getItem(MOTIF_STYLE_STORAGE_KEY)).toBe('classic')
    unmount()
    const again = render(<SymmetryPrimer />)
    expect(again.container.querySelectorAll('svg.primer-svg').length).toBe(6)
  })

  it('primer SVG labels and captions are at least 9 units (legibility)', () => {
    window.localStorage.setItem(MOTIF_STYLE_STORAGE_KEY, 'classic')
    const { container } = render(<SymmetryPrimer />)
    const sizes = Array.from(container.querySelectorAll('svg.primer-svg text')).map((t) => Number(t.getAttribute('font-size')))
    expect(sizes.length).toBeGreaterThan(0)
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(9)
    window.localStorage.clear()
  })

  it('kind of each card is the real operation', () => {
    const { container } = render(<SymmetryPrimer />)
    const kinds = Array.from(container.querySelectorAll('canvas.primer-canvas')).map((c) => c.getAttribute('data-op-kind'))
    expect(kinds).toEqual(['identity', 'inversion', 'rotation', 'screw', 'mirror', 'glide'])
  })
})

describe('hero logo', () => {
  it('is always Lopsy, independent of the stored style', () => {
    window.localStorage.setItem(MOTIF_STYLE_STORAGE_KEY, 'tribo')
    const { container } = render(<HeroCellMotif />)
    expect(container.querySelector('canvas.hero-lopsy')!.getAttribute('data-hero-motif')).toBe('lopsy')
  })
})
