import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ITA_GUIDE_CITATIONS,
  ITA_GUIDE_CAVEATS,
  ITA_PLANE_NORMAL_STYLES,
  ITA_PLANE_PARALLEL_STYLES,
  P21C_ITA_WALKTHROUGH,
  P21C_PLATE_VIEWS,
} from '../itaGuide'
import { OPERATORS } from '../p21c'

describe('ITA diagram guide content', () => {
  it('lists real IUCr / JAC citation URLs with Ab vs Ac distinguished', () => {
    expect(ITA_GUIDE_CITATIONS.length).toBeGreaterThanOrEqual(4)
    const byId = Object.fromEntries(ITA_GUIDE_CITATIONS.map((c) => [c.id, c]))
    expect(byId['dauter-2010'].url).toBe(
      'https://journals.iucr.org/j/issues/2010/05/02/kk5061/',
    )
    expect(byId['ita-explanation-ac'].url).toBe(
      'https://it.iucr.org/Ac/explanationAc.pdf',
    )
    expect(byId['ita-explanation-ac'].note).toMatch(/2\.1\.2\.2/)
    expect(byId['ita-ch1o4-ab'].url).toBe(
      'https://it.iucr.org/Ab/ch1o4v0001/contents/',
    )
    expect(byId['ita-ch1o4-ab'].note).toMatch(/1\.4\.2/)
  })

  it('uses ITA §1.4.1 vector wording for n/e/d (not vague 45° shorthand alone)', () => {
    const n = ITA_PLANE_NORMAL_STYLES.find((r) => r.id === 'glide-n')!
    const e = ITA_PLANE_NORMAL_STYLES.find((r) => r.id === 'glide-e')!
    const d = ITA_PLANE_NORMAL_STYLES.find((r) => r.id === 'glide-d')!
    expect(n.meaning).toMatch(/½ along the line in the page/)
    expect(n.meaning).toMatch(/½ normal to the page/)
    expect(n.meaning).not.toMatch(/roughly 45/i)
    expect(e.meaning).toMatch(/two glide vectors/i)
    expect(d.meaning).toMatch(/in-page component/i)
    expect(ITA_PLANE_PARALLEL_STYLES.some((r) => /corner/.test(r.style))).toBe(
      true,
    )
    expect(ITA_GUIDE_CAVEATS.some((c) => /h\+½|h\+1\/2|h\+½/.test(c) || /h\+½/.test(c) || /h\+½|paired-height|parallel-plane/.test(c))).toBe(true)
  })

  it('P21/c walk-through panels follow independently derived plate views', () => {
    expect(P21C_PLATE_VIEWS.map((v) => v.id)).toEqual([
      'along-b',
      'along-a',
      'along-c',
      'general',
    ])
    expect(P21C_PLATE_VIEWS.map((v) => v.quadrant)).toEqual([
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
    ])
    expect(P21C_ITA_WALKTHROUGH.panels.map((p) => p.id)).toEqual(
      P21C_PLATE_VIEWS.map((v) => v.id),
    )

    const tl = P21C_PLATE_VIEWS[0]
    expect(tl.projectionAlong).toBe('b')
    expect(tl.axes).toEqual({ right: 'a', down: 'c' })
    expect(P21C_ITA_WALKTHROUGH.panels[0].whatToSee).toMatch(/angular corner/i)
    expect(P21C_ITA_WALKTHROUGH.panels[0].whatToSee).toMatch(/y = 1\/4/)
    expect(P21C_ITA_WALKTHROUGH.panels[0].whatToSee).not.toMatch(
      /screw-axis height/i,
    )

    const tr = P21C_PLATE_VIEWS[1]
    expect(tr.projectionAlong).toBe('a')
    expect(tr.axes).toEqual({ left: 'b', down: 'c_p' })
    expect(P21C_ITA_WALKTHROUGH.panels[1].whatToSee).toMatch(/Vertical dashed/i)
    expect(P21C_ITA_WALKTHROUGH.panels[1].whatToSee).toMatch(/Horizontal single-barb/i)

    const bl = P21C_PLATE_VIEWS[2]
    expect(bl.projectionAlong).toBe('c')
    expect(bl.axes).toEqual({ up: 'b', right: 'a_p' })
    expect(P21C_ITA_WALKTHROUGH.panels[2].whatToSee).toMatch(/Horizontal dotted/i)
    expect(P21C_ITA_WALKTHROUGH.panels[2].whatToSee).toMatch(/z = 1\/4/)
    expect(P21C_ITA_WALKTHROUGH.panels[2].whatToSee).toMatch(/not a height along a/i)
    // Must not claim the 1/4 is a height along a as the positive reading.
    expect(P21C_ITA_WALKTHROUGH.panels[2].whatToSee).not.toMatch(
      /labelled 1\/4 for height along a(?!xes)/i,
    )

    const br = P21C_ITA_WALKTHROUGH.panels[3]
    expect(br.whatToSee).toMatch(/½\+y|1\/2\+y/)
    expect(br.whatToSee).toMatch(/\+y/)
    expect(br.whatToSee).toMatch(/comma inside/i)
  })

  it('P21/c triplets still match site operators (independent of plate prose)', () => {
    expect(P21C_ITA_WALKTHROUGH.operators).toHaveLength(4)
    for (const op of P21C_ITA_WALKTHROUGH.operators) {
      const site = OPERATORS.find((o) => o.index === op.index)!
      expect(site.triplet).toBe(op.triplet)
      expect(site.label).toBe(op.label)
    }
  })

  it('guide SVG glyphs use single lens and single-barb screw, not crossed ellipses', () => {
    const src = readFileSync('src/components/ItaDiagramGuide.tsx', 'utf8')
    // No crossed double-ellipse 2-fold mark
    expect(src).not.toMatch(
      /2-fold ⊥ page[\s\S]{0,200}<ellipse[\s\S]{0,120}<ellipse/,
    )
    expect(src).toMatch(/glyph-twofold-perp/)
    expect(src).toMatch(/glyph-screw21-perp/)
    expect(src).toMatch(/glyph-screw21-parallel/)
    expect(src).toMatch(/single-barb|Single-barb|upper barb only/)
    expect(src).toMatch(/angular corner|Angular corner/)
    // + label beside circle, not centered inside the same-hand sample
    expect(src).toMatch(/General site \+y \(label beside\)/)
  })
})
