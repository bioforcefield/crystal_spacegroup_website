import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ITA_GUIDE_CITATIONS,
  ITA_GUIDE_CAVEATS,
  ITA_HALF_CELL_HEIGHT_NOTE,
  ITA_PLANE_NORMAL_STYLES,
  ITA_PLANE_PARALLEL_STYLES,
  P21C_ITA_WALKTHROUGH,
  P21C_PLATE_VIEWS,
} from '../itaGuide'
import { OPERATORS } from '../p21c'

describe('ITA diagram guide content', () => {
  it('cites verified Dauter 2010 and Ac Tables 2.1.2.x (no Ab §1.4 claims)', () => {
    const byId = Object.fromEntries(ITA_GUIDE_CITATIONS.map((c) => [c.id, c]))
    expect(byId['dauter-2010'].url).toBe(
      'https://journals.iucr.org/j/issues/2010/05/02/kk5061/',
    )
    expect(byId['dauter-2010'].note).toMatch(/§2\.4/)
    expect(byId['ita-explanation-ac'].url).toBe(
      'https://it.iucr.org/Ac/explanationAc.pdf',
    )
    expect(byId['ita-explanation-ac'].note).toMatch(/2\.1\.2\.2/)
    expect(byId['ita-explanation-ac'].note).toMatch(/Wyckoff/)
    expect(byId['ita-ch1o4-ab']).toBeUndefined()
    const blob =
      JSON.stringify(ITA_GUIDE_CITATIONS) +
      ITA_GUIDE_CAVEATS.join('\n') +
      ITA_HALF_CELL_HEIGHT_NOTE
    // Forbid unsupported Ab graphical-symbol section cites; Ac §1.4.4 Wyckoff
    // disclaimer in the Ac citation note is intentional.
    expect(blob).not.toMatch(/Ab §1\.4/)
    expect(blob).not.toMatch(/ITA §1\.4\.[12]\b/)
    expect(blob).toMatch(/Ac §1\.4\.4 is Wyckoff/)
  })

  it('half-cell height note follows Dauter §2.4 in-page element scope', () => {
    expect(ITA_HALF_CELL_HEIGHT_NOTE).toMatch(/2\/2₁ axes/)
    expect(ITA_HALF_CELL_HEIGHT_NOTE).toMatch(/mirror\/glide planes/)
    expect(ITA_HALF_CELL_HEIGHT_NOTE).toMatch(/inversion centres/)
    expect(ITA_HALF_CELL_HEIGHT_NOTE).toMatch(/h\+½/)
    expect(ITA_HALF_CELL_HEIGHT_NOTE).toMatch(/Dauter/)
    expect(ITA_HALF_CELL_HEIGHT_NOTE).toMatch(/§2\.4/)
    expect(ITA_HALF_CELL_HEIGHT_NOTE).toMatch(/not to every annotation/)
    // Must not revive the over-narrow "planes parallel only" rule
    expect(ITA_HALF_CELL_HEIGHT_NOTE).not.toMatch(/only planes parallel/i)
    expect(ITA_GUIDE_CAVEATS).toContain(ITA_HALF_CELL_HEIGHT_NOTE)
    expect(ITA_GUIDE_CAVEATS.join('\n')).not.toMatch(
      /For planes drawn parallel to the page, ITA/,
    )
  })

  it('documents plane line styles from Dauter without Ab section numbers', () => {
    const n = ITA_PLANE_NORMAL_STYLES.find((r) => r.id === 'glide-n')!
    expect(n.style).toMatch(/dash–dot/)
    expect(n.meaning).toMatch(/in-page and out-of-page|45°/)
    expect(ITA_PLANE_PARALLEL_STYLES.some((r) => /corner/.test(r.style))).toBe(
      true,
    )
  })

  it('P21/c walk-through panels follow independently derived plate views', () => {
    expect(P21C_PLATE_VIEWS.map((v) => v.id)).toEqual([
      'along-b',
      'along-a',
      'along-c',
      'general',
    ])
    expect(P21C_ITA_WALKTHROUGH.panels.map((p) => p.id)).toEqual(
      P21C_PLATE_VIEWS.map((v) => v.id),
    )
    expect(P21C_ITA_WALKTHROUGH.panels[0].whatToSee).toMatch(/y = 1\/4/)
    expect(P21C_ITA_WALKTHROUGH.panels[1].whatToSee).toMatch(/Vertical dashed/i)
    expect(P21C_ITA_WALKTHROUGH.panels[2].whatToSee).toMatch(/z = 1\/4/)
    expect(P21C_ITA_WALKTHROUGH.panels[2].whatToSee).toMatch(/z = 3\/4/)
    expect(P21C_ITA_WALKTHROUGH.panels[2].whatToSee).toMatch(/§2\.4/)
    expect(P21C_ITA_WALKTHROUGH.panels[3].whatToSee).toMatch(/½\+y|1\/2\+y/)
  })

  it('P21/c triplets still match site operators', () => {
    for (const op of P21C_ITA_WALKTHROUGH.operators) {
      const site = OPERATORS.find((o) => o.index === op.index)!
      expect(site.triplet).toBe(op.triplet)
      expect(site.label).toBe(op.label)
    }
  })

  it('guide SVG glyphs use single lens and single-barb screw', () => {
    const src = readFileSync('src/components/ItaDiagramGuide.tsx', 'utf8')
    expect(src).not.toMatch(
      /2-fold ⊥ page[\s\S]{0,200}<ellipse[\s\S]{0,120}<ellipse/,
    )
    expect(src).toMatch(/glyph-twofold-perp/)
    expect(src).toMatch(/ITA_HALF_CELL_HEIGHT_NOTE/)
    expect(src).not.toMatch(/ITA §1\.4/)
  })
})

import { getDemo as getDemoForGuide } from '../registry'
import { opClass as opClassForGuide } from '../elementClasses'
import { P21C_ITA_WALKTHROUGH as GUIDE } from '../itaGuide'
describe('ITA guide P2₁/c table agrees with the derived classification', () => {
  it('labels match kind / screw / glide letter of /sg/14 operators', () => {
    const d = getDemoForGuide(14)!
    const want: Record<number, RegExp> = { 1: /identity/i, 2: /2₁ screw/, 3: /inversion/i, 4: /c-glide/ }
    for (const row of GUIDE.operators) {
      const op = d.operators.find((o) => o.index === row.index)!
      expect(opClassForGuide(d, op).label).toMatch(want[row.index])
      expect(row.label).toMatch(want[row.index])
    }
  })
})
