import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMmcif } from '../../mmcif'
import { buildMacroModel } from '../../macro'
import { analyzeStructure } from '..'
import { ramaClass, ramaGrid } from '../protein'
import { RAMA8000_RLE, type Rama8000Table } from '../rama8000'

const fx = (n: string) => readFileSync(resolve(__dirname, '../../__tests__/fixtures', n), 'utf8')
const stats = (f: string) => {
  const A = analyzeStructure(buildMacroModel(parseMmcif(fx(f))))
  const pp = A.protein.filter((r) => r.rama)
  return { A, n: pp.length, fav: pp.filter((r) => r.rama === 'favored').length / pp.length, out: pp.filter((r) => r.rama === 'outlier').length }
}

describe('MolProbity Top8000 Ramachandran grids', () => {
  it('each RLE table decodes to exactly 180×180 cells', () => {
    for (const t of Object.keys(RAMA8000_RLE) as Rama8000Table[]) {
      const total = RAMA8000_RLE[t].split(',').reduce((s, tok) => s + +tok.slice(1), 0)
      expect(total).toBe(32400)
      expect(ramaGrid(t).length).toBe(32400)
    }
  })
  it('classifies textbook points', () => {
    expect(ramaClass('general', -63, -41)).toBe('favored') // α-helix
    expect(ramaClass('general', -120, 130)).toBe('favored') // β
    expect(ramaClass('general', 100, -90)).toBe('outlier')
    expect(ramaClass('gly', 80, -170)).not.toBe('outlier') // Gly-only region
    expect(ramaClass('transpro', 60, 60)).toBe('outlier')
    expect(ramaClass('ileval', -63, -41)).toBe('favored')
  })
  // MolProbity reference: 1CRN ≈ 97.7% favored / 0 outliers; 1HSG ≈ 97–98% / 0 outliers.
  it('1CRN matches MolProbity (≥ 97% favored, 0 outliers)', () => {
    const s = stats('1crn.cif')
    expect(s.fav).toBeGreaterThanOrEqual(0.97)
    expect(s.out).toBe(0)
    expect(s.A.protein.find((r) => r.res.comp === 'ILE')!.ramaTable).toBe('ileval')
  })
  it('1HSG matches MolProbity (≥ 96.5% favored, 0 outliers; was 86.6% with ellipses)', () => {
    const s = stats('1hsg.cif')
    expect(s.fav).toBeGreaterThanOrEqual(0.965)
    expect(s.out).toBe(0)
    expect(s.A.protein.filter((r) => r.category === 'pro').every((r) => r.ramaTable === 'transpro' || r.ramaTable === 'cispro')).toBe(true)
  })
})
