import { describe, expect, it, vi } from 'vitest'
import {
  CorsBlockedError,
  CsdManualError,
  fetchCodCif,
  fetchRemoteCif,
  NotFoundError,
} from '../fetchRemoteCif'
import {
  codCifUrl,
  csdAccessStructuresUrl,
  parseStructureCode,
} from '../structureCode'

describe('parseStructureCode', () => {
  it('parses COD numeric ids and prefixes', () => {
    expect(parseStructureCode('1100303')).toEqual({
      ok: true,
      code: { kind: 'cod', id: '1100303', display: 'COD 1100303' },
    })
    expect(parseStructureCode('COD 1100303')).toEqual({
      ok: true,
      code: { kind: 'cod', id: '1100303', display: 'COD 1100303' },
    })
    expect(parseStructureCode('cod_1500000.cif')).toEqual({
      ok: true,
      code: { kind: 'cod', id: '1500000', display: 'COD 1500000' },
    })
  })

  it('parses COD URLs', () => {
    const r = parseStructureCode(
      'https://www.crystallography.net/cod/1100303.cif',
    )
    expect(r.ok && r.code.kind === 'cod' && r.code.id).toBe('1100303')
  })

  it('parses CSD refcodes', () => {
    expect(parseStructureCode('ACETAC01')).toEqual({
      ok: true,
      code: { kind: 'csd', refcode: 'ACETAC01', display: 'CSD ACETAC01' },
    })
    expect(parseStructureCode('csd acetac')).toEqual({
      ok: true,
      code: { kind: 'csd', refcode: 'ACETAC', display: 'CSD ACETAC' },
    })
  })

  it('rejects empty / garbage', () => {
    expect(parseStructureCode('').ok).toBe(false)
    expect(parseStructureCode('??').ok).toBe(false)
  })
})

describe('URL helpers', () => {
  it('builds COD and Access Structures URLs', () => {
    expect(codCifUrl('1100303')).toBe(
      'https://www.crystallography.net/cod/1100303.cif',
    )
    expect(csdAccessStructuresUrl('ACETAC01')).toContain('ACETAC01')
  })
})

describe('fetchRemoteCif', () => {
  it('refuses CSD streaming with Access Structures link', async () => {
    await expect(fetchRemoteCif('ACETAC01')).rejects.toBeInstanceOf(
      CsdManualError,
    )
    try {
      await fetchRemoteCif('ACETAC01')
    } catch (e) {
      expect(e).toBeInstanceOf(CsdManualError)
      expect((e as CsdManualError).accessUrl).toContain('ccdc.cam.ac.uk')
    }
  })

  it('loads COD from first successful fetch candidate', async () => {
    const cif = `data_X\n_cell_length_a 1\n_atom_site_fract_x\n`
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('samples/cod/9999999')) {
        return new Response('missing', { status: 404 })
      }
      if (String(url).includes('/cod-proxy/9999999')) {
        return new Response('missing', { status: 404 })
      }
      if (String(url).includes('crystallography.net/cod/9999999')) {
        return new Response(cif, {
          status: 200,
          headers: { 'content-type': 'chemical/x-cif' },
        })
      }
      return new Response('no', { status: 404 })
    }) as unknown as typeof fetch

    const r = await fetchCodCif('9999999', fetchImpl)
    expect(r.source).toBe('cod')
    expect(r.text).toContain('data_X')
  })

  it('throws NotFoundError on 404 from COD', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof fetch
    await expect(fetchCodCif('0000000', fetchImpl)).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('throws CorsBlockedError when all network paths fail', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    await expect(fetchCodCif('1234567', fetchImpl)).rejects.toBeInstanceOf(
      CorsBlockedError,
    )
  })
})
