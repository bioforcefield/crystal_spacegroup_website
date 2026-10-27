import { describe, expect, it } from 'vitest'
import { countDemoElements, demoWithCifCell } from '../demoWithCifCell'
import { getDemo } from '../../registry'
import type { CellParams } from '../../types'

const aceticCell: CellParams = {
  a: 13.31,
  b: 4.09,
  c: 5.76,
  alphaDeg: 90,
  betaDeg: 110.4,
  gammaDeg: 90,
}

describe('demoWithCifCell', () => {
  it('returns undefined for missing / out-of-range SG', () => {
    expect(demoWithCifCell(null, aceticCell)).toBeUndefined()
    expect(demoWithCifCell(undefined, aceticCell)).toBeUndefined()
    expect(demoWithCifCell(0, aceticCell)).toBeUndefined()
    expect(demoWithCifCell(231, aceticCell)).toBeUndefined()
  })

  it('keeps P21/c element loci and swaps in the CIF cell metric', () => {
    const teaching = getDemo(14)!
    const scaled = demoWithCifCell(14, aceticCell)!
    expect(scaled.meta.number).toBe(14)
    expect(scaled.cell).toEqual(aceticCell)
    expect(scaled.cell).not.toEqual(teaching.cell)
    expect(scaled.screwAxes.length).toBe(teaching.screwAxes.length)
    expect(scaled.glidePlanes.length).toBe(teaching.glidePlanes.length)
    expect(scaled.inversionCenters.length).toBe(teaching.inversionCenters.length)
    expect(countDemoElements(scaled)).toBeGreaterThan(0)
    // Fractional loci unchanged
    expect(scaled.screwAxes[0]?.origin).toEqual(teaching.screwAxes[0]?.origin)
  })

  it('COD-style cubic Fm-3m (225) still exposes drawable axis-aligned elements', () => {
    const cell: CellParams = {
      a: 5.46,
      b: 5.46,
      c: 5.46,
      alphaDeg: 90,
      betaDeg: 90,
      gammaDeg: 90,
    }
    const scaled = demoWithCifCell(225, cell)
    expect(scaled).toBeDefined()
    expect(scaled!.cell.a).toBe(5.46)
    // May be geometryLimited (body diagonals) but still has some loci
    expect(countDemoElements(scaled!)).toBeGreaterThan(0)
  })
})
