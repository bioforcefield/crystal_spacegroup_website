import { describe, expect, it } from 'vitest'
import {
  breadcrumbLabel, cifPath, FILE_STORE_MAX, loadStoredFile, parseCifPath,
  parseViewQuery, serializeViewQuery, storeFile, targetKey, VIEW_DEFAULTS,
} from '../cifRoute'

class MemStore {
  m = new Map<string, string>()
  get length() { return this.m.size }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
}

describe('cif route paths', () => {
  it('parses start page', () => {
    expect(parseCifPath('/cif')).toEqual({ kind: 'none' })
    expect(parseCifPath('/cif/')).toEqual({ kind: 'none' })
  })
  it('parses cod / sample / file', () => {
    expect(parseCifPath('/cif/cod/2212817')).toEqual({ kind: 'cod', id: '2212817' })
    expect(parseCifPath('/cif/sample/acetic_p21c')).toEqual({ kind: 'sample', name: 'acetic_p21c' })
    expect(parseCifPath('/cif/file/my%20x.cif')).toEqual({ kind: 'file', name: 'my x.cif' })
  })
  it('flags bad addresses', () => {
    expect(parseCifPath('/cif/cod/abc').kind).toBe('invalid')
    expect(parseCifPath('/cif/foo/1').kind).toBe('invalid')
    expect(parseCifPath('/cif/file/%E0%A4%A').kind).toBe('invalid')
  })
  it('round-trips', () => {
    for (const p of ['/cif', '/cif/cod/1100303', '/cif/sample/acetic_p21c', '/cif/file/a%20b.cif'])
      expect(cifPath(parseCifPath(p))).toBe(p)
  })
  it('keys and labels', () => {
    expect(targetKey({ kind: 'none' })).toBe('none')
    expect(breadcrumbLabel({ kind: 'cod', id: '2212817' })).toBe('COD 2212817')
    expect(breadcrumbLabel({ kind: 'none' })).toBeNull()
  })
})

describe('view query', () => {
  it('defaults serialize to empty', () => {
    expect(serializeViewQuery(VIEW_DEFAULTS)).toBe('')
    expect(parseViewQuery('')).toEqual(VIEW_DEFAULTS)
  })
  it('round-trips non-defaults', () => {
    const v = { op: 4, view: 'wrapped', show: 'selected', color: 'element' } as const
    const s = serializeViewQuery(v)
    expect(s).toBe('?op=4&view=cell&show=pair&color=element')
    expect(parseViewQuery(s)).toEqual(v)
  })
  it('ignores junk', () => {
    expect(parseViewQuery('?op=-2&view=x&show=zz&color=red')).toEqual(VIEW_DEFAULTS)
  })
})

describe('uploaded file store', () => {
  it('stores latest file only, respects size limit', () => {
    const s = new MemStore() as unknown as Storage
    expect(storeFile(s, 'a.cif', 'A')).toBe(true)
    expect(storeFile(s, 'b.cif', 'B')).toBe(true)
    expect(loadStoredFile(s, 'a.cif')).toBeNull()
    expect(loadStoredFile(s, 'b.cif')).toBe('B')
    expect(storeFile(s, 'big.cif', 'x'.repeat(FILE_STORE_MAX + 1))).toBe(false)
    expect(storeFile(undefined, 'a', 'b')).toBe(false)
  })
})
