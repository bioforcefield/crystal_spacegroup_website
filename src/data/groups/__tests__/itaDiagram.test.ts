import { describe, expect, it } from 'vitest'
import itaDiagrams from '../../itaDiagrams.json'
import { itaDiagramEntry } from '../../itaDiagram'

describe('itaDiagrams manifest', () => {
  it('covers all 230 space groups', () => {
    expect(Object.keys(itaDiagrams)).toHaveLength(230)
    for (let n = 1; n <= 230; n++) {
      const e = itaDiagrams[String(n) as keyof typeof itaDiagrams]
      expect(e).toBeTruthy()
      expect(e.file).toBe(`ita-diagrams/${String(n).padStart(3, '0')}.png`)
      expect(e.pdfPage).toBeGreaterThan(100)
    }
  })

  it('maps R-3c (167) and exposes entry helper', () => {
    expect(itaDiagramEntry(167)?.file).toBe('ita-diagrams/167.png')
    expect(itaDiagramEntry(167)?.pdfPage).toBe(555)
    expect(itaDiagramEntry(999)).toBeNull()
  })
})
