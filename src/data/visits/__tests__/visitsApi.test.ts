import { describe, expect, it, vi } from 'vitest'
import {
  fetchVisitCount,
  formatVisitCount,
  resolveVisitsUrl,
  visitCounterLabel,
  type VisitStorage,
} from '../visitsApi'

function memoryStorage(): VisitStorage {
  const map = new Map<string, string>()
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v)
    },
  }
}

describe('resolveVisitsUrl', () => {
  it('prefers VITE_VISITS_URL', () => {
    expect(
      resolveVisitsUrl({
        VITE_VISITS_URL: 'https://example.com/visits/',
        VITE_COD_PROXY: 'https://other.workers.dev/{id}.cif',
      }),
    ).toBe('https://example.com/visits')
  })

  it('derives from VITE_COD_PROXY origin + /visits', () => {
    expect(
      resolveVisitsUrl({
        VITE_COD_PROXY: 'https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif',
      }),
    ).toBe('https://crystal-cod-proxy.crystal-sg.workers.dev/visits')
  })

  it('returns null when neither env is set', () => {
    expect(resolveVisitsUrl({})).toBeNull()
  })
})

describe('formatVisitCount / visitCounterLabel', () => {
  it('formats with grouping and em dash for missing', () => {
    expect(formatVisitCount(12345)).toBe('12,345')
    expect(formatVisitCount(0)).toBe('0')
    expect(formatVisitCount(null)).toBe('—')
    expect(formatVisitCount(undefined)).toBe('—')
    expect(formatVisitCount(Number.NaN)).toBe('—')
    expect(visitCounterLabel(12345)).toBe('12,345')
    expect(visitCounterLabel(null)).toBe('—')
  })
})

describe('fetchVisitCount', () => {
  it('increments once then uses cache in the same session', async () => {
    const storage = memoryStorage()
    const fetchImpl = vi.fn(async (input: string) => {
      const peek = String(input).includes('peek=1')
      const count = peek ? 42 : 43
      return new Response(JSON.stringify({ count }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    const env = {
      VITE_VISITS_URL: 'https://crystal-cod-proxy.crystal-sg.workers.dev/visits',
    }
    const first = await fetchVisitCount({ env, fetchImpl, storage })
    expect(first).toBe(43)
    expect(fetchImpl.mock.calls[0][0]).toBe(
      'https://crystal-cod-proxy.crystal-sg.workers.dev/visits',
    )

    const second = await fetchVisitCount({ env, fetchImpl, storage })
    expect(second).toBe(43)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('returns null and does not throw when the endpoint fails', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down')
    })
    const count = await fetchVisitCount({
      env: { VITE_VISITS_URL: 'https://example.com/visits' },
      fetchImpl,
      storage: memoryStorage(),
    })
    expect(count).toBeNull()
  })

  it('returns null when no visits URL is configured', async () => {
    const fetchImpl = vi.fn()
    const count = await fetchVisitCount({
      env: {},
      fetchImpl,
      storage: memoryStorage(),
    })
    expect(count).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
