import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCif } from '../parseCif'
import { expandStructure } from '../expandStructure'
import { measureOf, relateMolecules, resolvePick, SymCodes } from '../measureModel'
import type { Vec3 } from '../../types'

const s = expandStructure(
  parseCif(readFileSync(resolve(__dirname, '../../../../public/samples/acetic_p21c.cif'), 'utf8')),
)
const pos = s.atoms.map((a) => a.displayCartesian as Vec3)

describe('measure model on a P2₁/c structure', () => {
  it('relates the op-1 molecule to each other molecule with the right element kinds', () => {
    const a0 = s.atoms.findIndex((a) => a.opIndex === 1)
    const A = resolvePick(s, pos, { ai: a0, t: [0, 0, 0] })!
    const kinds = new Set<string>()
    for (const op of [2, 3, 4]) {
      const bi = s.atoms.findIndex((a) => a.opIndex === op && a.auIndex === s.atoms[a0]!.auIndex)
      const B = resolvePick(s, pos, { ai: bi, t: [0, 0, 0] })!
      const rel = relateMolecules(s, pos, [A, B])!
      kinds.add(rel.element.kind)
    }
    expect(kinds).toEqual(new Set(['inversion', 'screw', 'glide']))
    // supercell copy of the same molecule → pure translation along a
    const T = resolvePick(s, pos, { ai: a0 + 1, t: [1, 0, 0] })!
    const rel = relateMolecules(s, pos, [A, T])!
    expect(rel.element.kind).toBe('translation')
    expect(rel.triplet).toBe('1+x,y,z')
  })
  it('distance with symmetry codes, and translation-independent bond length', () => {
    const codes = new SymCodes()
    const bond = s.bonds[0]!
    const m1 = measureOf([resolvePick(s, pos, { ai: bond.a, t: [0, 0, 0] })!, resolvePick(s, pos, { ai: bond.b, t: [0, 0, 0] })!], codes)!
    const m2 = measureOf([resolvePick(s, pos, { ai: bond.a, t: [0, 1, 0] })!, resolvePick(s, pos, { ai: bond.b, t: [0, 1, 0] })!], codes)!
    expect(m1.kind).toBe('distance')
    expect(m1.value).toBeGreaterThan(0.8)
    expect(m1.value).toBeLessThan(2)
    expect(m2.value).toBeCloseTo(m1.value, 9)
    expect(codes.footnotes().length).toBeGreaterThan(0)
    expect(m2.names[0]).toMatch(/[ⁱᵛˣ]/)
  })
})
