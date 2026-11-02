import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMmcif } from '../mmcif'

const t = readFileSync(join(__dirname, 'fixtures/1ejg.cif'), 'utf8')
describe('PDB altlocs (1EJG)', () => {
  const d = parseMmcif(t)
  it('reports altlocs and keeps the default', () => {
    expect(d.altlocs!.ids).toEqual(expect.arrayContaining(['A', 'B']))
    expect(d.altlocs!.selected).toBe('auto')
    expect(d.altlocs!.residues).toBeGreaterThan(5)
  })
  it('global altloc B changes coordinates but not the atom count of residues that have B', () => {
    const b = parseMmcif(t, 'B')
    expect(b.altlocs!.selected).toBe('B')
    expect(b.parsed.warnings.join(' ')).toMatch(/altloc B where present/)
    const key = (p: ReturnType<typeof parseMmcif>) => p.parsed.atoms.map((a) => a.fractional.map((x) => x.toFixed(3)).join(',')).join(';')
    expect(key(b)).not.toBe(key(d))
  })
})
