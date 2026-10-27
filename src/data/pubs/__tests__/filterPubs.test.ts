import { describe, expect, it } from 'vitest'
import { COD_PUBS } from '../codPubs'
import {
  cifMapPath,
  collectYears,
  countByTag,
  doiUrl,
  filterPubs,
  groupPubsByYear,
  matchesPubFilters,
} from '../filterPubs'
import { suggestTags } from '../tagHeuristics'
import type { CodPubEntry } from '../types'

const sample: CodPubEntry = {
  id: '1515581',
  name: 'Aspirin',
  title: 'Aspirin crystal structure',
  year: 2004,
  journal: 'Acta Cryst.',
  doi: '10.1234/example',
  formula: 'C9 H8 O4',
  sg: 'P 1 21/c 1',
  sgNumber: 14,
  tags: ['organic', 'drug'],
}

describe('matchesPubFilters', () => {
  it('matches year', () => {
    expect(matchesPubFilters(sample, { tags: [], year: 2004, query: '' })).toBe(true)
    expect(matchesPubFilters(sample, { tags: [], year: 1999, query: '' })).toBe(false)
  })

  it('requires all selected tags (AND)', () => {
    expect(
      matchesPubFilters(sample, { tags: ['organic', 'drug'], year: null, query: '' }),
    ).toBe(true)
    expect(
      matchesPubFilters(sample, { tags: ['organic', 'salt'], year: null, query: '' }),
    ).toBe(false)
  })

  it('searches name / id / journal', () => {
    expect(
      matchesPubFilters(sample, { tags: [], year: null, query: 'aspirin' }),
    ).toBe(true)
    expect(
      matchesPubFilters(sample, { tags: [], year: null, query: '1515581' }),
    ).toBe(true)
    expect(
      matchesPubFilters(sample, { tags: [], year: null, query: 'nope' }),
    ).toBe(false)
  })
})

describe('groupPubsByYear', () => {
  it('groups newest first with null last', () => {
    const groups = groupPubsByYear([
      { ...sample, id: '1', year: 2010 },
      { ...sample, id: '2', year: null },
      { ...sample, id: '3', year: 2015 },
    ])
    expect(groups.map((g) => g.year)).toEqual([2015, 2010, null])
    expect(groups[0]!.entries[0]!.id).toBe('3')
  })
})

describe('collectYears / filterPubs on curated set', () => {
  it('has a multi-decade span and tag diversity', () => {
    const years = collectYears(COD_PUBS)
    expect(years.length).toBeGreaterThan(10)
    expect(years[0]!).toBeGreaterThanOrEqual(years[years.length - 1]!)
    const tags = countByTag(COD_PUBS, [
      'organic',
      'inorganic',
      'drug',
      'hydrate',
      'salt',
      'mineral',
      'mof',
    ])
    expect(tags.organic).toBeGreaterThan(0)
    expect(tags.inorganic).toBeGreaterThan(0)
    expect(tags.drug).toBeGreaterThan(0)
    expect(COD_PUBS.length).toBeGreaterThanOrEqual(40)
  })

  it('filters drug + organic', () => {
    const hits = filterPubs(COD_PUBS, {
      tags: ['drug', 'organic'],
      year: null,
      query: '',
    })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((h) => h.tags.includes('drug') && h.tags.includes('organic'))).toBe(
      true,
    )
  })
})

describe('doiUrl / cifMapPath', () => {
  it('builds doi.org links', () => {
    expect(doiUrl('10.1107/S0108768107031758')).toBe(
      'https://doi.org/10.1107/S0108768107031758',
    )
    expect(doiUrl(null)).toBeNull()
  })

  it('builds CIF map deep link', () => {
    expect(cifMapPath('1100303')).toBe('/cif?cod=1100303')
    expect(cifMapPath('1100303', '/crystal_spacegroup_website')).toBe(
      '/crystal_spacegroup_website/cif?cod=1100303',
    )
  })
})

describe('suggestTags heuristics', () => {
  it('tags aspirin-like organics as organic+drug', () => {
    const t = suggestTags({
      formula: 'C9 H8 O4',
      name: 'Aspirin',
      title: 'Crystal structure of aspirin',
    })
    expect(t).toContain('organic')
    expect(t).toContain('drug')
  })

  it('tags NaCl as inorganic mineral salt', () => {
    const t = suggestTags({
      formula: 'Cl Na',
      mineral: 'Halite',
      name: 'NaCl',
    })
    expect(t).toContain('inorganic')
    expect(t).toContain('mineral')
    expect(t).toContain('salt')
  })
})
