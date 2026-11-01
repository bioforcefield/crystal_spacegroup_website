import { describe, expect, it } from 'vitest'
import { chooseAltloc, parseMmcif } from '../mmcif'
import { pdbToMmcif } from '../formats'
import { WATERS } from '../waters'

const atom = (n: number, name: string, alt: string, x: number, occ: number, comp = 'SER', seq = 5) =>
  `ATOM  ${String(n).padStart(5)} ${name.padEnd(4)}${alt}${comp} A${String(seq).padStart(4)}    ${x.toFixed(3).padStart(8)}${'0.000'.padStart(8)}${'0.000'.padStart(8)}${occ.toFixed(2).padStart(6)} 10.00           ${name[0]}`

describe('altloc selection', () => {
  it('picks the highest summed occupancy, ties alphabetical', () => {
    expect(chooseAltloc(new Map([['A', 0.3], ['B', 0.7]]))).toBe('B')
    expect(chooseAltloc(new Map([['B', 0.5], ['A', 0.5]]))).toBe('A')
  })
  it('keeps the major conformer (B) of a residue and all blank-altloc atoms', () => {
    const pdb = [
      'CRYST1   20.000   20.000   20.000  90.00  90.00  90.00 P 1           1',
      atom(1, 'N', ' ', 1, 1),
      atom(2, 'CA', ' ', 2, 1),
      atom(3, 'CB', 'A', 3, 0.3),
      atom(4, 'CB', 'B', 4, 0.7),
      atom(5, 'OG', 'A', 5, 0.3),
      atom(6, 'OG', 'B', 6, 0.7),
      'END',
    ].join('\n')
    const pm = parseMmcif(pdbToMmcif(pdb).mmcif)
    const xs = pm.parsed.atoms.map((a) => Math.round(a.fractional[0] * 20))
    expect(xs).toEqual([1, 2, 4, 6])
    expect(pm.parsed.warnings.join(' ')).toMatch(/highest-occupancy altloc/)
  })
})

describe('shared water names', () => {
  it('includes common MD/force-field water names', () => {
    for (const w of ['HOH', 'WAT', 'SPC', 'T3P', 'TIP3']) expect(WATERS.has(w)).toBe(true)
  })
})
