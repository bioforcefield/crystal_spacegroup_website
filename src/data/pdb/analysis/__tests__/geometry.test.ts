import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseMmcif } from '../../mmcif'
import { buildMacroModel } from '../../macro'
import { analyzeStructure, summarizeGeom, angle, dist, EH2001_BONDS_COUNT } from '..'

const fx = (n: string) => readFileSync(resolve(__dirname, '../../__tests__/fixtures', n), 'utf8')
const load = (n: string) => analyzeStructure(buildMacroModel(parseMmcif(fx(n))))

describe('bond/angle geometry', () => {
  it('basic vector helpers', () => {
    expect(dist([0, 0, 0], [3, 4, 0])).toBeCloseTo(5)
    expect(angle([1, 0, 0], [0, 0, 0], [0, 1, 0])).toBeCloseTo(90)
    expect(EH2001_BONDS_COUNT).toBe(153)
  })
  it('crambin: backbone bonds near EH2001 targets, peptide links, disulfides', () => {
    const a = load('1crn.cif')
    const s = summarizeGeom(a.geom)
    const get = (t: string) => s.find((x) => x.type === t)!
    expect(get('N–CA').n).toBe(46)
    expect(get('C–N (peptide)').n + (s.find((x) => x.type === 'C–N (peptide, →Pro)')?.n ?? 0)).toBe(45)
    expect(Math.abs(get('C–N (peptide)').mean - 1.336)).toBeLessThan(0.03)
    expect(get('N–CA–C').rmsZ!).toBeLessThan(2)
    expect(get('S–S (disulfide)').n).toBe(3)
    expect(get('S–S (disulfide)').ideal).toBe(2.031)
    expect(s.some((x) => x.group === 'psc-bond' && x.type === 'C–S')).toBe(true)
  })
  it('B-DNA: phosphodiester + glycosidic bonds with deoxyribose targets', () => {
    const a = load('1bna.cif')
    const s = summarizeGeom(a.geom)
    const p = s.find((x) => x.type === "O3'–P")!
    expect(p.n).toBe(22) // 2 strands × 11 links
    expect(Math.abs(p.mean - 1.607)).toBeLessThan(0.05)
    expect(s.some((x) => x.type.startsWith("C1'–N9"))).toBe(true)
    expect(a.geom.filter((g) => g.group.startsWith('n')).every((g) => g.res.kind === 'nucleic')).toBe(true)
  })
  it('ligand distribution is distance-based and never Z-scored', () => {
    const a = load('1hsg.cif')
    expect(a.ligGeom.length).toBeGreaterThan(40)
    expect(a.ligGeom.every((g) => g.z == null && g.group === 'lig-bond')).toBe(true)
  })
})
