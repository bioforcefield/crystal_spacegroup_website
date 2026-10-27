import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expandStructure } from '../../cif/expandStructure'
import { parseCif } from '../../cif/parseCif'
import { getDemo } from '../../registry'
import {
  describeCifStructure,
  describeSpaceGroupCanvas,
} from '../structureSummary'

describe('a11y structure summaries', () => {
  it('describes a CIF structure with SG and cell', () => {
    const text = readFileSync(
      resolve(__dirname, '../../../../public/samples/acetic_p21c.cif'),
      'utf8',
    )
    const s = expandStructure(parseCif(text))
    const d = describeCifStructure(s)
    expect(d).toMatch(/space group/i)
    expect(d).toMatch(/angstrom/i)
    expect(d).toMatch(/operators/i)
  })

  it('describes a space-group demo canvas', () => {
    const demo = getDemo(14)!
    const d = describeSpaceGroupCanvas(demo)
    expect(d).toMatch(/14/)
    expect(d).toMatch(/P21/)
  })
})
