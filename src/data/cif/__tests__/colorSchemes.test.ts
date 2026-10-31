import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCif } from '../parseCif'
import { expandStructure } from '../expandStructure'
import {
  JMOL_COLORS,
  elementsPresent,
  equivalenceClasses,
  equivalenceColor,
  jmolColor,
} from '../colorSchemes'
import { elementColor, operatorColor } from '../operatorColors'
import { fracToCart } from '../../math'
import { replicaOffsets } from '../../supercell'

const load = (p: string) =>
  expandStructure(parseCif(readFileSync(resolve(__dirname, '../../../../public/samples', p), 'utf8')))

describe('element (Jmol) colors', () => {
  it('standard CPK values', () => {
    expect(jmolColor('C')).toBe('#909090')
    expect(jmolColor('O')).toBe('#FF0D0D')
    expect(jmolColor('N')).toBe('#3050F8')
    expect(jmolColor('H')).toBe('#FFFFFF')
    expect(jmolColor('CL')).toBe(JMOL_COLORS.Cl)
    expect(jmolColor('Xx')).toBe('#FF1493')
  })
  it('default operator scheme palette untouched', () => {
    expect(elementColor('C')).toBe('#94a3b8')
    expect(operatorColor(1)).toBe('hsla(200, 78%, 62%, 1)')
  })
})

describe('symmetry equivalence', () => {
  it('acetic P21/c: copies share their AU molecule class', () => {
    const s = load('acetic_p21c.cif')
    const { classOf, count } = equivalenceClasses(s.atoms)
    expect(count).toBeGreaterThanOrEqual(1)
    s.atoms.forEach((a, i) => {
      const id = s.atoms.findIndex((b) => b.opIndex === 1 && b.auIndex === a.auIndex)
      expect(classOf[i]).toBe(classOf[id])
    })
    expect(elementsPresent(s.atoms)[0]).toBe('C')
  })
  it("Z'>1 sample (COD 1100303, P-1) has several independent molecules", () => {
    const s = load('cod/1100303.cif')
    const { classOf, count } = equivalenceClasses(s.atoms)
    expect(count).toBeGreaterThan(1)
    expect(new Set(classOf).size).toBe(count)
    expect(equivalenceColor(0)).not.toBe(equivalenceColor(1))
  })
})

describe('op indexing incl. supercell', () => {
  it('lattice translations keep generating op', () => {
    const s = load('acetic_p21c.cif')
    const off = replicaOffsets([2, 1, 2], (f) => fracToCart(f, s.cell))
    // replicas are per-offset copies of the same atom list → same opIndex sequence
    const ops = off.flatMap(() => s.atoms.map((a) => a.opIndex))
    expect(ops).toHaveLength(s.atoms.length * 3)
    expect(ops.slice(0, s.atoms.length)).toEqual(s.atoms.map((a) => a.opIndex))
    expect(new Set(s.atoms.map((a) => a.opIndex)).size).toBe(s.operators.length)
  })
})
