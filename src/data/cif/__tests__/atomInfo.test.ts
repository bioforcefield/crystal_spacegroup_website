import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCif } from '../parseCif'
import { expandStructure } from '../expandStructure'
import { atomInfo, elementInfo, formatTranslation, samePick } from '../atomInfo'
import { fracToCart } from '../../math'

const s = expandStructure(
  parseCif(readFileSync(resolve(__dirname, '../../../../public/samples/acetic_p21c.cif'), 'utf8')),
)
const toCart = (f: [number, number, number]) => fracToCart(f, s.cell)

describe('atom info', () => {
  it('element table', () => {
    expect(elementInfo('C')).toEqual({ symbol: 'C', name: 'Carbon', z: 6 })
    expect(elementInfo('CL')).toMatchObject({ symbol: 'Cl', z: 17 })
    expect(elementInfo('Xx').z).toBeNull()
  })
  it('translation label', () => {
    expect(formatTranslation([0, 0, 0])).toBe('')
    expect(formatTranslation([1, 0, 2])).toBe(' + (1,0,2)')
  })
  it('identity copy: frac round-trips 4 dp, op formula', () => {
    const ai = s.atoms.findIndex((a) => a.opIndex === 1)
    const a = s.atoms[ai]!
    const op = s.operators.find((o) => o.index === 1)
    const inf = atomInfo(a, a.displayCartesian, [0, 0, 0], s.cell, op, toCart)
    const f = a.displayFractional.map((v) => (Math.abs(v) < 5e-5 ? 0 : v).toFixed(4)).join(', ')
    expect(inf.frac).toBe(`(${f})`)
    expect(inf.label).toBe(a.label)
    expect(inf.op).toBe(`op 1 ${op!.triplet}`)
    expect(inf.cart).toMatch(/ Å$/)
  })
  it('supercell copy adds lattice translation to frac + op text', () => {
    const ai = s.atoms.findIndex((a) => a.opIndex === 2)
    const a = s.atoms[ai]!
    const op = s.operators.find((o) => o.index === 2)
    const inf = atomInfo(a, a.displayCartesian, [1, 0, 0], s.cell, op, toCart)
    const x = (a.displayFractional[0] + 1).toFixed(4)
    expect(inf.frac.startsWith(`(${x},`)).toBe(true)
    expect(inf.op).toBe(`op 2 ${op!.triplet} + (1,0,0)`)
  })
  it('samePick', () => {
    expect(samePick({ ai: 1, t: [0, 0, 1] }, { ai: 1, t: [0, 0, 1] })).toBe(true)
    expect(samePick({ ai: 1, t: [0, 0, 1] }, { ai: 1, t: [0, 0, 0] })).toBe(false)
    expect(samePick(null, null)).toBe(false)
  })
})
