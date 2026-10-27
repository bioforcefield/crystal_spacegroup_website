import { describe, expect, it, vi } from 'vitest'
import {
  buildCodSearchUrl,
  hasConfiguredCodSearch,
  parseCodSearchResponse,
  resolveCodSearchBase,
  searchCod,
} from '../codSearch'

describe('resolveCodSearchBase', () => {
  it('strips /{id}.cif template from VITE_COD_PROXY', () => {
    expect(
      resolveCodSearchBase({
        VITE_COD_PROXY:
          'https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif',
      }),
    ).toBe('https://crystal-cod-proxy.crystal-sg.workers.dev')
  })

  it('prefers VITE_COD_SEARCH', () => {
    expect(
      resolveCodSearchBase({
        VITE_COD_PROXY: 'https://proxy.example/{id}.cif',
        VITE_COD_SEARCH: 'https://search.example/cod',
      }),
    ).toBe('https://search.example/cod')
  })

  it('returns null when unset', () => {
    expect(resolveCodSearchBase({})).toBeNull()
    expect(hasConfiguredCodSearch({})).toBe(false)
  })
})

describe('buildCodSearchUrl', () => {
  it('builds text search against proxy origin', () => {
    const url = buildCodSearchUrl(
      { text: 'urea' },
      { searchBase: 'https://crystal-cod-proxy.crystal-sg.workers.dev' },
    )
    expect(url).toBe(
      'https://crystal-cod-proxy.crystal-sg.workers.dev/search?text=urea',
    )
  })

  it('builds smile search and encodes characters', () => {
    const url = buildCodSearchUrl(
      { smile: 'c1ccccc1' },
      { searchBase: 'https://w.example' },
    )
    expect(url).toBe('https://w.example/search?smile=c1ccccc1')
  })

  it('prefers text when both provided', () => {
    const url = buildCodSearchUrl(
      { text: 'aspirin', smile: 'CCO' },
      { searchBase: 'https://w.example' },
    )
    expect(url).toContain('text=aspirin')
    expect(url).not.toContain('smile=')
  })

  it('falls back to local /cod-search without base', () => {
    expect(buildCodSearchUrl({ text: 'urea' }, { searchBase: null })).toBe(
      '/cod-search?text=urea',
    )
  })
})

describe('parseCodSearchResponse', () => {
  it('parses worker-shaped payload', () => {
    const r = parseCodSearchResponse({
      query: { kind: 'text', value: 'aspirin' },
      total: 2,
      capped: false,
      limit: 20,
      hits: [
        {
          id: '1515581',
          sg: 'P 1 21/c 1',
          sgNumber: '14',
          formula: 'C9 H8 O4',
          vol: '100',
          name: 'aspirin',
        },
      ],
    })
    expect(r.hits).toHaveLength(1)
    expect(r.hits[0].id).toBe('1515581')
    expect(r.total).toBe(2)
  })

  it('parses raw COD array', () => {
    const r = parseCodSearchResponse([
      { file: '1100303', sg: 'P 21/c', formula: '- C2 H4 O2 -', vol: '200' },
    ])
    expect(r.hits[0]).toMatchObject({
      id: '1100303',
      sg: 'P 21/c',
      formula: 'C2 H4 O2',
    })
  })

  it('surfaces error field', () => {
    expect(() => parseCodSearchResponse({ error: 'boom' })).toThrow(/boom/)
  })
})

describe('searchCod', () => {
  it('fetches and returns hits', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        query: { kind: 'smile', value: 'c1ccccc1' },
        total: 1,
        capped: false,
        limit: 20,
        hits: [{ id: '1001668', sg: 'C m', formula: 'C6 H6', vol: null, name: null }],
      }),
    )
    const r = await searchCod(
      { smile: 'c1ccccc1' },
      fetchImpl as unknown as typeof fetch,
    )
    expect(r.hits[0].id).toBe('1001668')
    expect(String(fetchImpl.mock.calls[0][0])).toContain('smile=c1ccccc1')
  })

  it('rejects empty query', async () => {
    await expect(searchCod({})).rejects.toThrow(/name\/keyword or SMILES/)
  })
})
