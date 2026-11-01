import { describe, expect, it } from 'vitest'
import { CorsBlockedError, CsdManualError, fetchCodCif, fetchRemoteCif, NotFoundError, sourceBadgeLabel } from '../fetchRemoteCif'

const CIF = 'data_x\n_cell_length_a 5\n'
const route = (table: Record<string, () => Response | Promise<Response>>, dflt: () => Response | Promise<Response>) =>
  (async (u: string) => {
    for (const [k, v] of Object.entries(table)) if (String(u).includes(k)) return v()
    return dflt()
  }) as unknown as typeof fetch

describe('COD fetch error paths', () => {
  it('prefers the same-origin cache', async () => {
    const r = await fetchCodCif('1100303', route({ 'samples/cod': () => new Response(CIF) }, () => new Response('', { status: 500 })))
    expect(r.source).toBe('cache')
  })
  it('maps a direct 404 to NotFoundError', async () => {
    await expect(fetchCodCif('9999999', route({}, () => new Response('', { status: 404 })))).rejects.toBeInstanceOf(NotFoundError)
  })
  it('maps a network/CORS failure to CorsBlockedError', async () => {
    const f = route({}, () => { throw new TypeError('Failed to fetch') })
    await expect(fetchCodCif('2212817', f)).rejects.toBeInstanceOf(CorsBlockedError)
  })
  it('rejects HTML (non-CIF) bodies and reports HTTP status', async () => {
    const f = route({ 'crystallography.net': () => new Response('', { status: 503 }) }, () => new Response('<html>nope</html>'))
    await expect(fetchCodCif('2212817', f)).rejects.toThrow(/HTTP 503/)
  })
  it('falls through to the dev proxy', async () => {
    const r = await fetchCodCif('2212817', route({ '/cod-proxy/': () => new Response(CIF) }, () => new Response('', { status: 404 })))
    expect(r.source).toBe('proxy')
  })
  it('routes CSD refcodes to the manual-download error and bad input to a message', async () => {
    await expect(fetchRemoteCif('ABEBUF', route({}, () => new Response('')))).rejects.toBeInstanceOf(CsdManualError)
    await expect(fetchRemoteCif('!!', route({}, () => new Response('')))).rejects.toThrow()
  })
  it('labels every source', () => {
    for (const s of ['cache', 'proxy', 'cod', 'paste', 'upload'] as const) expect(sourceBadgeLabel(s)).toBeTruthy()
  })
})
