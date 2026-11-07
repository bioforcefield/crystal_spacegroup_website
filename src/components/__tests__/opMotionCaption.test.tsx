// @vitest-environment jsdom
/**
 * Selected-operation caption on /sg pages: plain lead, details disclosure,
 * visible Replay text, polite replay status, Near / Wrap and operator changes,
 * and the paused / reduced-motion state (Replay disabled with a note).
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../UnitCellScene', () => ({ default: () => null }))
vi.mock('../VisitCounter', () => ({ default: () => null }))

import SpaceGroupPage from '../../pages/SpaceGroupPage'
import { getDemo } from '../../data/registry'
import { selectionLabels } from '../../data/opLabels'
import { setAnimationsPaused } from '../../hooks/motionPrefs'

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as never

let reduced = false
const mq = new Set<() => void>()
beforeEach(() => {
  reduced = false
  window.matchMedia = ((q: string) => ({
    get matches() {
      return q.includes('reduced-motion') ? reduced : false
    },
    media: q,
    addEventListener: (_: string, l: () => void) => mq.add(l),
    removeEventListener: (_: string, l: () => void) => mq.delete(l),
    addListener: () => {},
    removeListener: () => {},
  })) as never
  localStorage.clear()
  setAnimationsPaused(false)
})
afterEach(cleanup)

const page = (sg: number) =>
  render(
    <MemoryRouter>
      <SpaceGroupPage demo={getDemo(sg)!} />
    </MemoryRouter>,
  )
const pick = (idx: number) =>
  fireEvent.click(screen.getAllByRole('option').find((o) => o.getAttribute('aria-label')?.startsWith(`Operator ${idx}:`))!)
const caption = () => document.querySelector('.op-motion') as HTMLElement

describe('selected-operation caption', () => {
  it('plain lead, details disclosure, visible Replay text (P4₁ op 4)', () => {
    page(76)
    pick(4)
    const s = selectionLabels(getDemo(76)!, 4, 'nearest')
    const lead = caption().querySelector('.op-motion-lead')!.textContent!
    expect(lead).toContain(s.motion.plain)
    expect(lead).toMatch(/4⁻/)
    expect(lead).not.toContain(s.shown.locus) // coordinates live in the disclosure
    const replay = within(caption()).getByRole('button', { name: /Replay/ })
    expect(replay.textContent).toMatch(/Replay/)
    expect(replay.hasAttribute('disabled')).toBe(false)
    const details = caption().querySelector('details')!
    expect(details.querySelector('summary')!.textContent).toBe('Operation details')
    expect(details.textContent).toContain(s.canonical.symbol)
    expect(details.textContent).toContain(s.motion.lead)
    for (const n of s.motion.notes) expect(details.textContent).toContain(n)
  })

  it('Replay announces a concise polite status', () => {
    page(76)
    pick(4)
    fireEvent.click(within(caption()).getByRole('button', { name: /Replay/ }))
    expect(screen.getByRole('status').textContent).toBe('Replaying op 4.')
    pick(2)
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('follows Near / Wrap and the operator (P4mm op 8)', () => {
    page(99)
    fireEvent.click(screen.getByRole('button', { name: /Show all 8 operators/ }))
    pick(8)
    const near = selectionLabels(getDemo(99)!, 8, 'nearest')
    const wrap = selectionLabels(getDemo(99)!, 8, 'wrapped')
    expect(near.shown.kind).not.toBe(wrap.shown.kind) // the review's example: copies differ in kind
    expect(caption().getAttribute('data-shown-kind')).toBe(near.shown.kind)
    fireEvent.click(screen.getByRole('button', { name: /Wrap/ }))
    expect(caption().getAttribute('data-shown-kind')).toBe(wrap.shown.kind)
    expect(caption().querySelector('.op-motion-lead')!.textContent).toContain(wrap.motion.plain)
    pick(3)
    expect(caption().getAttribute('data-op-kind')).toBe(selectionLabels(getDemo(99)!, 3, 'wrapped').canonical.kind)
  })

  it('paused animations and reduced motion disable Replay with a note, both directions', () => {
    page(76)
    pick(4)
    const replay = () => within(caption()).getByRole('button', { name: /Replay/ })
    act(() => setAnimationsPaused(true))
    expect(replay().hasAttribute('disabled')).toBe(true)
    expect(caption().textContent).toMatch(/Animations are paused: showing the end position/)
    act(() => setAnimationsPaused(false))
    expect(replay().hasAttribute('disabled')).toBe(false)
    reduced = true
    act(() => mq.forEach((l) => l()))
    expect(replay().hasAttribute('disabled')).toBe(true)
    expect(caption().textContent).toMatch(/Reduced motion is on/)
    reduced = false
    act(() => mq.forEach((l) => l()))
    expect(replay().hasAttribute('disabled')).toBe(false)
  })
})
