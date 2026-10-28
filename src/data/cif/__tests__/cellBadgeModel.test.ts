import { describe, expect, it } from 'vitest'
import { cellBadgeModel } from '../cellBadgeModel'
import type { CellParams } from '../../types'

const ortho: CellParams = {
  a: 5.12,
  b: 8.4,
  c: 12.345,
  alphaDeg: 90,
  betaDeg: 90,
  gammaDeg: 90,
}

const triclinic: CellParams = {
  a: 9.968,
  b: 11.966,
  c: 14.171,
  alphaDeg: 77.24,
  betaDeg: 73.47,
  gammaDeg: 87.16,
}

describe('cellBadgeModel', () => {
  it('always exposes a/b/c + angles + origin (no expand gate)', () => {
    const m = cellBadgeModel(triclinic)
    expect(m.aText).toBe('a 9.968 Å')
    expect(m.bText).toMatch(/^b 11\.97/)
    expect(m.cText).toMatch(/^c 14\.17/)
    expect(m.anglesText).toContain('α')
    expect(m.anglesText).toContain('β')
    expect(m.anglesText).toContain('γ')
    expect(m.originText).toBe('O (0,0,0)')
    expect(m.orthorhombic).toBe(false)
  })

  it('collapses orthorhombic angles to a short line', () => {
    const m = cellBadgeModel(ortho)
    expect(m.orthorhombic).toBe(true)
    expect(m.anglesText).toBe('α = β = γ = 90°')
    expect(m.aText).toBe('a 5.120 Å')
  })

  it('defaults missing angles to 90°', () => {
    const m = cellBadgeModel({ a: 1, b: 2, c: 3 })
    expect(m.orthorhombic).toBe(true)
    expect(m.anglesText).toBe('α = β = γ = 90°')
  })
})
