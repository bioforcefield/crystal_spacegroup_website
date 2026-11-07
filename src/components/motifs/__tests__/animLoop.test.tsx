// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startLoop } from '../animLoop'
import AnimationPauseToggle from '../../AnimationPauseToggle'
import { ANIM_PAUSED_STORAGE_KEY, getAnimationsPaused, initMotionPrefs, setAnimationsPaused } from '../../../hooks/motionPrefs'
import { MOTIF_STYLE_STORAGE_KEY } from '../motifStyles'
import { useMotifStyle } from '../MotifStylePicker'

// Controllable browser APIs
let rafQ: Map<number, FrameRequestCallback>
let rafId: number
let ioCb: ((es: { isIntersecting: boolean }[]) => void) | null
let mqMatches: boolean
let mqListeners: Set<() => void>
const flush = (now = 16) => {
  const q = [...rafQ.values()]
  rafQ.clear()
  q.forEach((f) => f(now))
}

beforeEach(() => {
  rafQ = new Map()
  rafId = 0
  ioCb = null
  mqMatches = false
  mqListeners = new Set()
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => (rafQ.set(++rafId, f), rafId))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => rafQ.delete(id))
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: (es: { isIntersecting: boolean }[]) => void) {
        ioCb = cb
      }
      observe() {}
      disconnect() {}
    },
  )
  window.matchMedia = ((q: string) => ({
    get matches() {
      return mqMatches
    },
    media: q,
    addEventListener: (_: string, l: () => void) => mqListeners.add(l),
    removeEventListener: (_: string, l: () => void) => mqListeners.delete(l),
  })) as never
  localStorage.clear()
  setAnimationsPaused(false)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('animation loop scheduling', () => {
  it('runs on-screen, stops off-screen, restarts when visible again', () => {
    const el = document.createElement('div')
    const draw = vi.fn()
    const stop = startLoop({ el, draw })
    expect(rafQ.size).toBe(1)
    flush()
    expect(draw).toHaveBeenLastCalledWith(16, false, expect.anything())
    ioCb!([{ isIntersecting: false }])
    expect(rafQ.size).toBe(0)
    const n = draw.mock.calls.length
    flush()
    expect(draw.mock.calls.length).toBe(n) // no frames while hidden
    ioCb!([{ isIntersecting: true }])
    expect(rafQ.size).toBe(1)
    stop()
    expect(rafQ.size).toBe(0)
  })

  it('pause shows a static endpoint and resume restarts (both directions)', () => {
    const el = document.createElement('div')
    const draw = vi.fn()
    startLoop({ el, draw })
    flush()
    act(() => setAnimationsPaused(true))
    expect(rafQ.size).toBe(0)
    expect(draw.mock.calls.at(-1)![1]).toBe(true)
    act(() => setAnimationsPaused(false))
    expect(rafQ.size).toBe(1)
    flush(32)
    expect(draw).toHaveBeenLastCalledWith(32, false, expect.anything())
  })

  it('follows a live reduced-motion change in both directions', () => {
    const el = document.createElement('div')
    const draw = vi.fn()
    startLoop({ el, draw })
    mqMatches = true
    mqListeners.forEach((l) => l())
    expect(rafQ.size).toBe(0)
    expect(draw.mock.calls.at(-1)![1]).toBe(true)
    mqMatches = false
    mqListeners.forEach((l) => l())
    expect(rafQ.size).toBe(1)
  })

  it('static pieces draw once and never schedule frames', () => {
    const el = document.createElement('div')
    const draw = vi.fn()
    startLoop({ el, draw, animated: false })
    expect(rafQ.size).toBe(0)
    expect(draw).toHaveBeenCalledTimes(1)
    expect(draw.mock.calls[0][1]).toBe(true)
  })

  it('does not read layout every frame', () => {
    const el = document.createElement('div')
    const spy = vi.spyOn(el, 'getBoundingClientRect')
    startLoop({ el, draw: () => {} })
    for (let i = 0; i < 5; i++) flush(16 * i)
    expect(spy.mock.calls.length).toBeLessThanOrEqual(1)
  })
})

describe('Pause animations control', () => {
  it('is a visible toggle shared by every instance and remembered', () => {
    render(
      <>
        <AnimationPauseToggle />
        <AnimationPauseToggle />
      </>,
    )
    const [a, b] = screen.getAllByRole('button', { name: /Pause animations/ })
    // one ARIA pattern: the name says the action; no aria-pressed on top
    expect(a.hasAttribute('aria-pressed')).toBe(false)
    fireEvent.click(a)
    expect(screen.getAllByRole('button', { name: /Resume animations/ })).toHaveLength(2)
    expect(b.hasAttribute('aria-pressed')).toBe(false)
    expect(localStorage.getItem(ANIM_PAUSED_STORAGE_KEY)).toBe('1')
    expect(document.documentElement.classList.contains('anim-paused')).toBe(true)
    fireEvent.click(b)
    expect(screen.getAllByRole('button', { name: /Pause animations/ })).toHaveLength(2)
    expect(document.documentElement.classList.contains('anim-paused')).toBe(false)
  })
})

describe('motif style is shared live between instances on one page', () => {
  function Probe({ id }: { id: string }) {
    const [s, set] = useMotifStyle()
    return (
      <button type="button" data-testid={id} onClick={() => set(s === 'tetra' ? 'classic' : 'tetra')}>
        {s}
      </button>
    )
  }
  it('changing one picker updates the other without a storage event', () => {
    render(
      <>
        <Probe id="a" />
        <Probe id="b" />
      </>,
    )
    expect(screen.getByTestId('b').textContent).toBe('tetra')
    fireEvent.click(screen.getByTestId('a'))
    expect(screen.getByTestId('b').textContent).toBe('classic')
  })
})

describe('storage failures keep the in-memory choice', () => {
  it('pause works when storage throws, and the snapshot read has no DOM side effect', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    act(() => setAnimationsPaused(true))
    expect(getAnimationsPaused()).toBe(true)
    document.documentElement.classList.remove('anim-paused')
    getAnimationsPaused()
    expect(document.documentElement.classList.contains('anim-paused')).toBe(false)
    initMotionPrefs()
    expect(document.documentElement.classList.contains('anim-paused')).toBe(true)
    set.mockRestore()
  })

  it('motif style does not snap back when storage rejects the write', () => {
    function Probe({ id }: { id: string }) {
      const [s, setS] = useMotifStyle()
      return (
        <button type="button" data-testid={id} onClick={() => setS('classic')}>
          {s}
        </button>
      )
    }
    localStorage.setItem(MOTIF_STYLE_STORAGE_KEY, 'tetra')
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    render(
      <>
        <Probe id="a" />
        <Probe id="b" />
      </>,
    )
    fireEvent.click(screen.getByTestId('a'))
    expect(screen.getByTestId('a').textContent).toBe('classic')
    expect(screen.getByTestId('b').textContent).toBe('classic')
    set.mockRestore()
    // storage works again: the next choice persists and memory yields to storage
    fireEvent.click(screen.getByTestId('a'))
    expect(localStorage.getItem(MOTIF_STYLE_STORAGE_KEY)).toBe('classic')
  })
})
