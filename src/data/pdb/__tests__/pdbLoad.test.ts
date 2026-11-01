import { describe, expect, it } from 'vitest'
import { buildSearchQuery, entryWarnings, guessSearchKind, hitFromGql, loadPdbMmcif, mapPdbError, mmcifUrl, parsePdbInput, pushRecent, readRecent, PdbLoadError } from '../pdbLoad'
import { parseViewQuery, serializeViewQuery, VIEW_DEFAULTS } from '../../cif/cifRoute'

describe('parsePdbInput', () => {
  it.each([
    ['1crn', '1crn', undefined], [' 4HHB ', '4hhb', undefined], ['pdb_00001abc', '1abc', undefined],
    ['https://www.rcsb.org/structure/4HHB', '4hhb', undefined], ['rcsb.org/structure/1CRN', '1crn', undefined],
    ['https://files.rcsb.org/download/1CRN.cif', '1crn', undefined], ['https://files.rcsb.org/download/2DHB-assembly2.cif', '2dhb', 2],
    ['https://www.ebi.ac.uk/pdbe/entry/pdb/1cbs', '1cbs', undefined], ['https://pdb-redo.eu/db/1cbs', '1cbs', undefined],
    ['https://www.rcsb.org/3d-view/7BV2', '7bv2', undefined],
  ])('%s → %s', (raw, id, asm) => {
    const r = parsePdbInput(raw)
    expect(r.ok && r.id).toBe(id)
    expect(r.ok && r.assembly).toBe(asm)
  })
  it('rejects bad input', () => {
    for (const s of ['', 'abcd', '12345', 'lysozyme', 'https://example.com/foo']) expect(parsePdbInput(s).ok).toBe(false)
  })
})

describe('search query building', () => {
  it('guesses kinds', () => {
    expect(guessSearchKind('P69905')).toBe('uniprot')
    expect(guessSearchKind('HEM')).toBe('ligand')
    expect(guessSearchKind('lysozyme')).toBe('text')
  })
  it('builds RCSB JSON', () => {
    expect(buildSearchQuery('hemoglobin', 'text', 5).query).toEqual({ type: 'terminal', service: 'full_text', parameters: { value: 'hemoglobin' } })
    const u = buildSearchQuery('p69905', 'uniprot') as { query: { parameters: { value: string; attribute: string } }; request_options: { paginate: { rows: number } } }
    expect(u.query.parameters.value).toBe('P69905')
    expect(u.query.parameters.attribute).toMatch(/database_accession/)
    expect(u.request_options.paginate.rows).toBe(12)
    const l = buildSearchQuery('hem', 'ligand') as { query: { parameters: { attribute: string } } }
    expect(l.query.parameters.attribute).toMatch(/nonpolymer_comp_id/)
  })
  it('maps GraphQL rows', () => {
    const h = hitFromGql({ rcsb_id: '4HHB', struct: { title: 'X' }, exptl: [{ method: 'X-RAY DIFFRACTION' }], rcsb_entry_info: { resolution_combined: [1.74], deposited_atom_count: 4779, assembly_count: 1 }, polymer_entities: [{ rcsb_entity_source_organism: [{ scientific_name: 'Homo sapiens' }] }] })
    expect(h).toMatchObject({ id: '4hhb', resolution: 1.74, organism: 'Homo sapiens', method: 'X-RAY DIFFRACTION' })
    expect(h.thumb).toBe('https://cdn.rcsb.org/images/structures/hh/4hhb/4hhb_assembly-1.jpeg')
  })
})

describe('URLs and errors', () => {
  it('builds mmCIF URLs', () => {
    expect(mmcifUrl('1crn')).toBe('https://files.rcsb.org/download/1CRN.cif')
    expect(mmcifUrl('1crn', { assembly: 2 })).toBe('https://files.rcsb.org/download/1CRN-assembly2.cif')
    expect(mmcifUrl('1cbs', { source: 'redo' })).toBe('https://pdb-redo.eu/db/1cbs/1cbs_final.cif')
  })
  it('maps obsolete / not found / http', () => {
    const o = mapPdbError('1hhb', 404, { id_codes_replaced_by: ['2HHB', '4HHB'], remove_date: '1984-07-18T00:00' })
    expect(o.kind).toBe('obsolete')
    expect(o.replacedBy).toEqual(['2hhb', '4hhb'])
    expect(o.message).toMatch(/superseded by 2HHB, 4HHB/)
    expect(mapPdbError('9zzz', 404).kind).toBe('notfound')
    expect(mapPdbError('1crn', 404, null, 3).message).toMatch(/no biological assembly 3/)
    expect(mapPdbError('1crn', 500).kind).toBe('http')
  })
  it('fetch: network, obsolete lookup, PDB-REDO fallback', async () => {
    const net = (() => Promise.reject(new TypeError('fail'))) as unknown as typeof fetch
    await expect(loadPdbMmcif('1crn', { fetchImpl: net })).rejects.toMatchObject({ kind: 'network' })
    const obs = (async (u: string) => u.includes('holdings') ? new Response(JSON.stringify({ rcsb_repository_holdings_removed: { id_codes_replaced_by: ['4HHB'] } })) : new Response('', { status: 404 })) as unknown as typeof fetch
    const e = await loadPdbMmcif('1hhb', { fetchImpl: obs }).catch((x) => x)
    expect(e).toBeInstanceOf(PdbLoadError)
    expect(e.replacedBy).toEqual(['4hhb'])
    const redo = (async (u: string) => u.includes('pdb-redo') ? new Response('', { status: 404 }) : new Response('data_1CRN')) as unknown as typeof fetch
    const r = await loadPdbMmcif('1crn', { source: 'redo', fetchImpl: redo })
    expect(r.text).toBe('data_1CRN')
    expect(r.note).toMatch(/instead/)
    await expect(loadPdbMmcif('xx', { fetchImpl: redo })).rejects.toMatchObject({ kind: 'invalid' })
  })
  it('warnings', () => {
    expect(entryWarnings({ method: 'ELECTRON MICROSCOPY', atoms: 500_000 })).toHaveLength(2)
    expect(entryWarnings({ method: 'X-RAY DIFFRACTION', atoms: 1000 })).toHaveLength(0)
  })
  it('recents', () => {
    const m = new Map<string, string>()
    const st = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as unknown as Storage
    pushRecent(st, '1CRN'); pushRecent(st, '4hhb'); pushRecent(st, '1crn')
    expect(readRecent(st)).toEqual(['1crn', '4hhb'])
  })
  it('asm / src URL params; defaults unchanged', () => {
    expect(serializeViewQuery(VIEW_DEFAULTS)).toBe('')
    expect(parseViewQuery('')).toEqual(VIEW_DEFAULTS)
    const v = parseViewQuery('?asm=2&src=redo')
    expect(v.asm).toBe(2); expect(v.src).toBe('redo')
    expect(serializeViewQuery(v)).toBe('?asm=2&src=redo')
    expect(parseViewQuery('?asm=0').asm).toBeUndefined()
  })
})
