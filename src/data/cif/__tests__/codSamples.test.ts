import { describe, expect, it } from 'vitest'
import {
  COD_TEACHING_CHIPS,
  codSampleUrl,
  isCachedCodId,
  loadCodSamplesManifest,
  resetCodSamplesCache,
} from '../codSamples'
import { fetchCodCif } from '../fetchRemoteCif'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('COD same-origin samples', () => {
  it('ships a teaching chip set beyond 1100303', () => {
    expect(COD_TEACHING_CHIPS.length).toBeGreaterThanOrEqual(6)
    expect(COD_TEACHING_CHIPS.some((c) => c.id === '1100303')).toBe(true)
    expect(COD_TEACHING_CHIPS.some((c) => c.id !== '1100303')).toBe(true)
  })

  it('builds cache URLs under samples/cod', () => {
    expect(codSampleUrl('9008565', '/crystal_spacegroup_website/')).toBe(
      '/crystal_spacegroup_website/samples/cod/9008565.cif',
    )
  })

  it('loads manifest and marks cached ids', async () => {
    resetCodSamplesCache()
    const manifestText = readFileSync(
      resolve(__dirname, '../../../../public/samples/cod/manifest.json'),
      'utf8',
    )
    const fetchImpl = async (url: string) => {
      if (String(url).includes('manifest.json')) {
        return new Response(manifestText, { status: 200 })
      }
      return new Response('no', { status: 404 })
    }
    const m = await loadCodSamplesManifest(fetchImpl as unknown as typeof fetch)
    expect(m.samples.length).toBeGreaterThanOrEqual(8)
    expect(isCachedCodId('9008565', m)).toBe(true)
    expect(isCachedCodId('9999999', m)).toBe(false)
  })

  it('fetchCodCif prefers same-origin cache when present', async () => {
    const cif = readFileSync(
      resolve(__dirname, '../../../../public/samples/cod/9008565.cif'),
      'utf8',
    )
    const fetchImpl = viFetch(async (url) => {
      if (String(url).includes('samples/cod/9008565.cif')) {
        return new Response(cif, { status: 200 })
      }
      throw new TypeError('network')
    })
    const r = await fetchCodCif('9008565', fetchImpl)
    expect(r.source).toBe('cache')
    expect(r.text).toContain('data_')
  })
})

function viFetch(fn: (url: string) => Promise<Response>): typeof fetch {
  return fn as unknown as typeof fetch
}
