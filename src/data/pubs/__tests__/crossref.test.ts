import { describe, expect, it, vi } from 'vitest'
import {
  CROSSREF_ISSNS,
  CROSSREF_PRESETS,
  buildCrossrefFilter,
  buildCrossrefUrl,
  formatAuthorsShort,
  hintTagsFromTitle,
  crossrefQueryForHintTags,
  parseCrossrefResponse,
  parseCrossrefWork,
  pickPublishedYear,
  presetById,
  recentYearOptions,
  yearFromDateParts,
} from '../crossref'

describe('ISSN registry / presets', () => {
  it('includes Crystal Growth & Design print ISSN', () => {
    expect(CROSSREF_ISSNS.crystalGrowthDesign).toContain('1528-7483')
  })

  it('ACS preset covers CG&D and Inorganic Chemistry', () => {
    const acs = presetById('acs')
    expect(acs.issns).toEqual(
      expect.arrayContaining(['1528-7483', '1528-7505', '0020-1669']),
    )
  })

  it('all presets have unique ids and non-empty ISSNs', () => {
    const ids = CROSSREF_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of CROSSREF_PRESETS) {
      expect(p.issns.length).toBeGreaterThan(0)
    }
  })
})

describe('buildCrossrefFilter', () => {
  it('builds issn + from-pub-date for recent window', () => {
    const f = buildCrossrefFilter({
      issns: ['1528-7483'],
      year: null,
      recentYears: 3,
      now: new Date('2026-10-27T12:00:00Z'),
    })
    expect(f).toContain('issn:1528-7483')
    expect(f).toContain('from-pub-date:2024-01-01')
    expect(f).toContain('type:journal-article')
    expect(f).not.toContain('until-pub-date')
  })

  it('clamps a specific year with until-pub-date', () => {
    const f = buildCrossrefFilter({
      issns: ['2052-2525', '2053-2296'],
      year: 2025,
      now: new Date('2026-10-27T12:00:00Z'),
    })
    expect(f).toBe(
      'issn:2052-2525,issn:2053-2296,from-pub-date:2025-01-01,until-pub-date:2025-12-31,type:journal-article',
    )
  })

  it('skips malformed ISSNs', () => {
    const f = buildCrossrefFilter({
      issns: ['nope', '1528-7483'],
      year: 2024,
      now: new Date('2026-01-01'),
    })
    expect(f.startsWith('issn:1528-7483')).toBe(true)
    expect(f).not.toContain('nope')
  })
})

describe('buildCrossrefUrl', () => {
  it('targets worker /crossref when searchBase set', () => {
    const url = buildCrossrefUrl(
      {
        preset: 'acs',
        year: 2025,
        offset: 0,
        now: new Date('2026-10-27'),
      },
      { searchBase: 'https://crystal-cod-proxy.example.workers.dev' },
    )
    expect(url.startsWith('https://crystal-cod-proxy.example.workers.dev/crossref?')).toBe(
      true,
    )
    const u = new URL(url)
    expect(u.searchParams.get('rows')).toBe('20')
    expect(u.searchParams.get('sort')).toBe('published')
    expect(u.searchParams.get('order')).toBe('desc')
    expect(u.searchParams.get('offset')).toBe('0')
    expect(u.searchParams.get('cursor')).toBeNull()
    expect(u.searchParams.get('filter')).toContain('issn:1528-7483')
    expect(u.searchParams.get('filter')).toContain('from-pub-date:2025-01-01')
  })

  it('uses localPath when no searchBase', () => {
    const url = buildCrossrefUrl(
      { preset: 'rsc', year: null, now: new Date('2026-10-27') },
      { searchBase: null, localPath: '/crossref' },
    )
    expect(url.startsWith('/crossref?')).toBe(true)
    expect(decodeURIComponent(url)).toContain('issn:1466-8033')
  })
})

describe('date / author / hint parsers', () => {
  it('yearFromDateParts', () => {
    expect(yearFromDateParts([[2024, 5, 1]])).toBe(2024)
    expect(yearFromDateParts([])).toBeNull()
    expect(yearFromDateParts(null)).toBeNull()
  })

  it('pickPublishedYear prefers print then online', () => {
    expect(
      pickPublishedYear({
        'published-print': { 'date-parts': [[2023]] },
        'published-online': { 'date-parts': [[2022]] },
      }),
    ).toBe(2023)
    expect(
      pickPublishedYear({
        published: { 'date-parts': [[2021, 1]] },
      }),
    ).toBe(2021)
  })

  it('formatAuthorsShort truncates with et al.', () => {
    const authors = [
      { family: 'Smith', given: 'Alice' },
      { family: 'Jones', given: 'Bob' },
      { family: 'Lee', given: 'Cara' },
      { family: 'Ng', given: 'Dan' },
    ]
    expect(formatAuthorsShort(authors, 3)).toBe(
      'Smith, A.; Jones, B.; Lee, C.; et al.',
    )
    expect(formatAuthorsShort([], 3)).toBe('')
  })

  it('hintTagsFromTitle detects MOF / hydrate / drug / ml / csp', () => {
    expect(hintTagsFromTitle('A new MOF for gas storage')).toContain('mof')
    expect(hintTagsFromTitle('Crystal structure of a hydrate salt')).toEqual(
      expect.arrayContaining(['hydrate', 'salt']),
    )
    expect(hintTagsFromTitle('Sodium chloride dihydrate')).toContain('hydrate')
    expect(hintTagsFromTitle('Ibuprofen cocrystal study')).toEqual(
      expect.arrayContaining(['drug', 'organic', 'salt']),
    )
    expect(
      hintTagsFromTitle('Machine learning for crystal property prediction'),
    ).toContain('ml')
    expect(
      hintTagsFromTitle('Advances in crystal structure prediction (CSP)'),
    ).toEqual(expect.arrayContaining(['csp']))
  })

  it('crossrefQueryForHintTags adds topic queries for sparse chips', () => {
    expect(crossrefQueryForHintTags(['hydrate'])).toBe('hydrate')
    expect(crossrefQueryForHintTags(['ml', 'csp'])).toContain('machine learning')
    expect(crossrefQueryForHintTags(['ml', 'csp'])).toContain(
      'crystal structure prediction',
    )
    expect(crossrefQueryForHintTags(['organic'])).toBeUndefined()
  })
})

describe('parseCrossrefWork / response', () => {
  const sampleItem = {
    DOI: '10.1021/acs.cgd.4c00904',
    title: ['High-Pressure Structural Study on Bi compounds'],
    author: [{ family: 'Botella', given: 'Pablo' }],
    'container-title': ['Crystal Growth & Design'],
    publisher: 'American Chemical Society (ACS)',
    published: { 'date-parts': [[2024, 8, 12]] },
    type: 'journal-article',
  }

  it('drops issue masthead titles', () => {
    expect(
      parseCrossrefWork({
        DOI: '10.1021/cgv025i001_1883486',
        title: ['Issue Publication Information'],
        published: { 'date-parts': [[2025]] },
      }),
    ).toBeNull()
  })

    it('parses a work', () => {
    const w = parseCrossrefWork(sampleItem)
    expect(w).toMatchObject({
      doi: '10.1021/acs.cgd.4c00904',
      title: 'High-Pressure Structural Study on Bi compounds',
      journal: 'Crystal Growth & Design',
      publisher: 'American Chemical Society (ACS)',
      year: 2024,
      authorsShort: 'Botella, P.',
    })
  })

  it('parses a list response (nextOffset filled by fetch)', () => {
    const page = parseCrossrefResponse({
      status: 'ok',
      message: {
        'total-results': 40,
        items: [sampleItem, { DOI: '', title: ['x'] }],
      },
    })
    expect(page.total).toBe(40)
    expect(page.nextOffset).toBeNull()
    expect(page.works).toHaveLength(1)
  })

  it('throws on bad shape', () => {
    expect(() => parseCrossrefResponse({ message: {} })).toThrow(/items/)
  })
})

describe('recentYearOptions', () => {
  it('lists window then descending years', () => {
    const opts = recentYearOptions(new Date('2026-10-27'), 3)
    expect(opts[0]).toEqual({ label: 'Last 3 years', year: null })
    expect(opts.slice(1).map((o) => o.year)).toEqual([2026, 2025, 2024])
  })
})

describe('fetch wiring (mocked)', () => {
  it('fetchCrossrefPage uses build URL and parses JSON', async () => {
    const { fetchCrossrefPage } = await import('../crossref')
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        message: {
          'total-results': 1,
          'next-cursor': null,
          items: [
            {
              DOI: '10.1107/S2052252523009582',
              title: ['Paliperidone aliphatic prodrugs'],
              'container-title': ['IUCrJ'],
              publisher: 'IUCr',
              published: { 'date-parts': [[2024]] },
              author: [{ family: 'Anon', given: 'A' }],
            },
          ],
        },
      }),
    })) as unknown as typeof fetch

    const page = await fetchCrossrefPage(
      {
        preset: 'iucr',
        year: 2024,
        now: new Date('2026-10-27'),
      },
      {
        searchBase: 'https://proxy.test',
        fetchImpl,
      },
    )
    expect(fetchImpl).toHaveBeenCalledOnce()
    const calledUrl = String(fetchImpl.mock.calls[0][0])
    expect(calledUrl).toContain('https://proxy.test/crossref?')
    expect(decodeURIComponent(calledUrl)).toContain('issn:2052-2525')
    expect(page.works[0].doi).toBe('10.1107/S2052252523009582')
    expect(page.works[0].hintTags).toContain('drug')
    expect(page.nextOffset).toBeNull()
    expect(calledUrl).toContain('offset=0')
    expect(calledUrl).not.toContain('cursor=')
  })

  it('fetchCrossrefPage sets nextOffset when more results remain', async () => {
    const { fetchCrossrefPage } = await import('../crossref')
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        message: {
          'total-results': 50,
          items: [
            {
              DOI: '10.1021/acs.cgd.demo',
              title: ['Demo crystal hydrate'],
              'container-title': ['Crystal Growth & Design'],
              publisher: 'ACS',
              published: { 'date-parts': [[2025]] },
              author: [{ family: 'Demo', given: 'D' }],
            },
          ],
        },
      }),
    })) as unknown as typeof fetch

    const page = await fetchCrossrefPage(
      {
        preset: 'acs',
        year: 2025,
        offset: 0,
        rows: 20,
        now: new Date('2026-10-27'),
      },
      { searchBase: 'https://proxy.test', fetchImpl },
    )
    expect(page.nextOffset).toBe(20)
  })
})
