import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMmcif } from '../../mmcif'
import { buildMacroModel } from '../../macro'
import { analyzeStructure, PEPTIDE_PRO, DISULF } from '..'

const load = (f: string) => analyzeStructure(buildMacroModel(parseMmcif(readFileSync(join(__dirname, '../../__tests__/fixtures', f), 'utf8'))))

describe('Pro links and disulfides', () => {
  const a = load('1crn.cif')
  it('reads struct_conn disulfides and uses CCP4 targets', () => {
    const ss = a.geom.filter((g) => g.type === 'S–S (disulfide)')
    expect(ss).toHaveLength(3)
    expect(ss[0]!.ideal).toBe(DISULF.SS.mu)
    expect(a.geom.filter((g) => g.type === 'CB–SG–SG (disulfide)')).toHaveLength(6)
    expect(a.geom.filter((g) => g.kind === 'torsion')).toHaveLength(3)
  })
  it('uses PTRANS targets when the next residue is Pro', () => {
    const p = a.geom.filter((g) => g.type === 'C–N–CA →Pro')
    expect(p.length).toBeGreaterThan(0)
    expect(p[0]!.ideal).toBe(PEPTIDE_PRO.CNCA.mu)
    expect(a.geom.some((g) => g.type === 'C–N–CD →Pro')).toBe(true)
    expect(a.geom.find((g) => g.type === 'C–N (peptide)')!.ideal).toBe(1.336)
  })
})
