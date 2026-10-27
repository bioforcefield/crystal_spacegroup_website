import { describe, expect, it } from 'vitest'
import {
  UCL_SGP_HUB,
  uclSpaceGroupDiagramUrl,
} from '../../uclDiagram'

describe('uclSpaceGroupDiagramUrl', () => {
  it('pads ITA numbers to three digits with az1 plate', () => {
    expect(uclSpaceGroupDiagramUrl(1)).toBe(
      'http://img.chem.ucl.ac.uk/sgp/large/001az1.htm',
    )
    expect(uclSpaceGroupDiagramUrl(14)).toBe(
      'http://img.chem.ucl.ac.uk/sgp/large/014az1.htm',
    )
    expect(uclSpaceGroupDiagramUrl(167)).toBe(
      'http://img.chem.ucl.ac.uk/sgp/large/167az1.htm',
    )
    expect(uclSpaceGroupDiagramUrl(230)).toBe(
      'http://img.chem.ucl.ac.uk/sgp/large/230az1.htm',
    )
  })

  it('rejects out-of-range numbers', () => {
    expect(() => uclSpaceGroupDiagramUrl(0)).toThrow(/out of range/)
    expect(() => uclSpaceGroupDiagramUrl(231)).toThrow(/out of range/)
    expect(() => uclSpaceGroupDiagramUrl(14.5)).toThrow(/out of range/)
  })

  it('exposes the hub URL', () => {
    expect(UCL_SGP_HUB).toMatch(/img\.chem\.ucl\.ac\.uk\/sgp/)
  })
})
