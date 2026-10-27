import { describe, expect, it } from 'vitest'
import {
  cromerMannSymbols,
  formFactor,
  hasCromerMann,
} from '../formFactors'

describe('formFactors table', () => {
  it('covers common organics and inorganics with Cromer–Mann coeffs', () => {
    for (const s of [
      'H', 'C', 'N', 'O', 'F', 'Na', 'P', 'S', 'Cl', 'K', 'Ca',
      'Fe', 'Cu', 'Zn', 'Br', 'I', 'Si', 'Al', 'Ti', 'Ba', 'Pb',
      'Ni', 'Au', 'Mo', 'Ag',
    ]) {
      expect(hasCromerMann(s), s).toBe(true)
    }
    expect(cromerMannSymbols().length).toBeGreaterThan(40)
  })

  it('falls back for unknown symbols', () => {
    expect(hasCromerMann('Xx')).toBe(false)
    const f = formFactor('Xx', 0)
    expect(f).toBeGreaterThan(0)
  })

  it('C near forward scatter ≈ Z', () => {
    expect(formFactor('C', 0)).toBeGreaterThan(5)
    expect(formFactor('C', 0)).toBeLessThan(7)
  })
})
