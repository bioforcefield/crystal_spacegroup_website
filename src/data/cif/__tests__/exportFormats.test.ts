import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCif } from '../parseCif'
import { expandStructure } from '../expandStructure'
import { baseFileName, molBlock, moleculeRecords, p1SupercellCif, sdf } from '../exportFormats'
import { supercellTranslations } from '../../supercell'

const s = expandStructure(
  parseCif(readFileSync(resolve(__dirname, '../../../../public/samples/acetic_p21c.cif'), 'utf8')),
)
const disp = s.atoms.map((a) => a.displayCartesian as [number, number, number])

/** Minimal SDF reader: atom count per record (V2000 + V3000). */
function readCounts(text: string): number[] {
  return text
    .split('$$$$\n')
    .filter((r) => r.trim())
    .map((r) => {
      const lines = r.split('\n')
      const counts = lines[3]!
      if (counts.includes('V3000')) {
        const c = lines.find((l) => l.startsWith('M  V30 COUNTS'))!
        return Number(c.split(/\s+/)[3])
      }
      return Number(counts.slice(0, 3))
    })
}

describe('molfile', () => {
  it('V2000 counts, atom and bond lines', () => {
    const m = molBlock({
      name: 'w',
      atoms: [
        { el: 'O', xyz: [0, 0, 0] },
        { el: 'H', xyz: [0.9572, 0, 0] },
        { el: 'H', xyz: [-0.24, 0.927, 0] },
      ],
      bonds: [[0, 1], [0, 2]],
    })
    const l = m.split('\n')
    expect(l[3]).toBe('  3  2  0  0  0  0  0  0  0  0999 V2000')
    expect(l[4]).toBe('    0.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0')
    expect(l[5]!.slice(0, 30)).toBe('    0.9572    0.0000    0.0000')
    expect(l[7]).toBe('  1  2  1  0  0  0  0')
    expect(l.at(-1)).toBe('M  END')
  })
  it('switches to V3000 above 999 atoms', () => {
    const atoms = Array.from({ length: 1000 }, (_, i) => ({ el: 'C', xyz: [i, 0, 0] as [number, number, number] }))
    const m = molBlock({ name: 'big', atoms, bonds: [[0, 1]] })
    expect(m).toContain('V3000')
    expect(m).toContain('M  V30 COUNTS 1000 1 0 0 0')
    expect(m).toContain('M  V30 1 1 1 2')
  })
})

describe('SDF from structure', () => {
  it('unit cell: atom count round-trips, one record per molecule', () => {
    const recs = moleculeRecords(s, disp, () => true)
    expect(recs).toHaveLength(new Set(s.atoms.map((a) => a.moleculeId)).size)
    const text = sdf(recs)
    expect(readCounts(text).reduce((a, b) => a + b, 0)).toBe(s.atoms.length)
    expect(text).toContain('> <SPACE_GROUP>')
    expect(text).toContain('> <CELL>')
  })
  it('asymmetric unit and supercell view', () => {
    const au = moleculeRecords(s, disp, (ai) => s.atoms[ai]!.opIndex === 1)
    expect(au.reduce((n, r) => n + r.atoms.length, 0)).toBe(s.atoms.filter((a) => a.opIndex === 1).length)
    const view = moleculeRecords(s, disp, () => true, supercellTranslations([1, 1, 3]))
    expect(readCounts(sdf(view)).reduce((a, b) => a + b, 0)).toBe(s.atoms.length * 3)
    const bondsCell = moleculeRecords(s, disp, () => true).reduce((n, r) => n + r.bonds.length, 0)
    expect(view.reduce((n, r) => n + r.bonds.length, 0)).toBe(bondsCell * 3)
  })
  it('P1 supercell CIF lists every atom and re-parses', () => {
    const txt = p1SupercellCif(s, disp, () => true, [2, 1, 1], supercellTranslations([2, 1, 1]), 'acetic')
    const re = parseCif(txt)
    expect(re.atoms.length).toBe(s.atoms.length * 2)
    expect(re.cell.a).toBeCloseTo(s.cell.a * 2, 3)
  })
  it('file names', () => {
    expect(baseFileName(undefined, 'COD 2100301.cif')).toBe('COD_2100301')
    expect(baseFileName('blk', undefined)).toBe('blk')
  })
})
