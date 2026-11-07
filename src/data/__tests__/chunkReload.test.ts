// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHUNK_RELOAD_KEY, CHUNK_RELOAD_WINDOW_MS, installChunkReload, shouldReloadForChunkError } from '../../lib/chunkReload'

function memStore() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

const fire = () => {
  const e = new Event('vite:preloadError', { cancelable: true })
  window.dispatchEvent(e)
  return e
}

afterEach(() => sessionStorage.clear())

describe('shouldReloadForChunkError (one-shot guard)', () => {
  it('allows one reload, then refuses within the window, then allows again after it', () => {
    const s = memStore()
    expect(shouldReloadForChunkError(s, 1_000_000)).toBe(true)
    expect(shouldReloadForChunkError(s, 1_000_000 + 5_000)).toBe(false)
    expect(shouldReloadForChunkError(s, 1_000_000 + CHUNK_RELOAD_WINDOW_MS - 1)).toBe(false)
    expect(shouldReloadForChunkError(s, 1_000_000 + CHUNK_RELOAD_WINDOW_MS + 1)).toBe(true)
  })
  it('never reloads without working storage (no loop risk)', () => {
    expect(shouldReloadForChunkError(null)).toBe(false)
    const throwing = { getItem: () => { throw new Error('denied') }, setItem: () => {} }
    expect(shouldReloadForChunkError(throwing)).toBe(false)
    const forgetful = { getItem: () => null, setItem: () => {} }
    expect(shouldReloadForChunkError(forgetful)).toBe(false)
  })
})

describe('installChunkReload', () => {
  it('reloads once on the first chunk error and lets later ones reach the error boundary', () => {
    const reload = vi.fn()
    const off = installChunkReload(window, reload)
    const first = fire()
    expect(first.defaultPrevented).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).not.toBeNull()
    const second = fire()
    expect(second.defaultPrevented).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
    off()
    sessionStorage.clear()
    fire()
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
