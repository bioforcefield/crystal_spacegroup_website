// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import MotifStylePicker, { useMotifStyle } from '../MotifStylePicker'
import {
  DEFAULT_MOTIF_STYLE,
  MOTIF_STYLE_STORAGE_KEY,
  readMotifStyle,
  writeMotifStyle,
} from '../motifStyles'
import { placedPositions } from '../../../data/nearestImages'
import { getDemo } from '../../../data/registry'

function mem() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

describe('motif style preference', () => {
  it('defaults to Tetra pebble and validates stored values', () => {
    expect(DEFAULT_MOTIF_STYLE).toBe('tetra')
    const s = mem()
    expect(readMotifStyle(s)).toBe('tetra')
    s.setItem(MOTIF_STYLE_STORAGE_KEY, 'bogus')
    expect(readMotifStyle(s)).toBe('tetra')
    writeMotifStyle('classic', s)
    expect(readMotifStyle(s)).toBe('classic')
    writeMotifStyle('nope' as never, s)
    expect(readMotifStyle(s)).toBe('classic')
    const throwing = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    }
    expect(readMotifStyle(throwing)).toBe('tetra')
    expect(() => writeMotifStyle('lopsy', throwing)).not.toThrow()
    expect(readMotifStyle(undefined)).toBe('tetra')
  })
})

function Harness() {
  const [style, setStyle] = useMotifStyle()
  const [, force] = useState(0)
  return (
    <div>
      <MotifStylePicker value={style} onChange={setStyle} />
      <output data-testid="style">{style}</output>
      <button onClick={() => force((n) => n + 1)}>rerender</button>
    </div>
  )
}

describe('MotifStylePicker', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('labelled select, first visit shows Tetra pebble with all four options', () => {
    render(<Harness />)
    const sel = screen.getByLabelText(/motif/i) as HTMLSelectElement
    expect(sel.tagName).toBe('SELECT')
    expect(sel.value).toBe('tetra')
    expect([...sel.options].map((o) => o.value)).toEqual(['tetra', 'tribo', 'lopsy', 'classic'])
    expect([...sel.options].map((o) => o.textContent)).toContain('Classic L')
    expect(sel.getAttribute('aria-describedby')).toBeTruthy()
  })

  it('persists a choice and restores it on remount (reload / navigation)', () => {
    const { unmount } = render(<Harness />)
    fireEvent.change(screen.getByLabelText(/motif/i), { target: { value: 'classic' } })
    expect(screen.getByTestId('style').textContent).toBe('classic')
    expect(window.localStorage.getItem(MOTIF_STYLE_STORAGE_KEY)).toBe('classic')
    fireEvent.click(screen.getByText('rerender'))
    expect(screen.getByTestId('style').textContent).toBe('classic')
    unmount()
    render(<Harness />)
    expect((screen.getByLabelText(/motif/i) as HTMLSelectElement).value).toBe('classic')
  })

  it('ignores a corrupted stored value', () => {
    window.localStorage.setItem(MOTIF_STYLE_STORAGE_KEY, '{"x":1}')
    render(<Harness />)
    expect((screen.getByLabelText(/motif/i) as HTMLSelectElement).value).toBe('tetra')
  })
})

describe('style is visual only', () => {
  it('placement does not depend on the motif style (no style input)', () => {
    const d = getDemo(14)!
    const a = placedPositions(d, 2, 'nearest')
    window.localStorage.setItem(MOTIF_STYLE_STORAGE_KEY, 'lopsy')
    const b = placedPositions(d, 2, 'nearest')
    expect(b).toEqual(a)
  })
})
