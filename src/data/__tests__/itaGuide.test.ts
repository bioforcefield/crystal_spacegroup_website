import { describe, expect, it } from 'vitest'
import {
  ITA_GUIDE_CITATIONS,
  ITA_GUIDE_CAVEATS,
  ITA_PLANE_LINE_STYLES,
  P21C_ITA_WALKTHROUGH,
} from '../itaGuide'
import { OPERATORS } from '../p21c'

describe('ITA diagram guide content', () => {
  it('lists real IUCr / JAC citation URLs', () => {
    expect(ITA_GUIDE_CITATIONS.length).toBeGreaterThanOrEqual(4)
    for (const c of ITA_GUIDE_CITATIONS) {
      expect(c.url).toMatch(/^https:\/\//)
      expect(c.label.length).toBeGreaterThan(8)
      expect(c.note.length).toBeGreaterThan(20)
    }
    const urls = ITA_GUIDE_CITATIONS.map((c) => c.url)
    expect(urls).toContain('https://journals.iucr.org/j/issues/2010/05/02/kk5061/')
    expect(urls).toContain('https://it.iucr.org/Ac/explanationAc.pdf')
    expect(urls.some((u) => u.includes('it.iucr.org'))).toBe(true)
  })

  it('documents plane line styles with orientation-relative meanings', () => {
    const ids = ITA_PLANE_LINE_STYLES.map((r) => r.id)
    expect(ids).toEqual([
      'mirror',
      'glide-inplane',
      'glide-perp',
      'glide-n',
      'glide-e',
      'glide-d',
    ])
    expect(ITA_PLANE_LINE_STYLES[1].style).toMatch(/dashed/i)
    expect(ITA_PLANE_LINE_STYLES[2].style).toMatch(/dotted/i)
    expect(ITA_GUIDE_CAVEATS.some((c) => /same physical glide/i.test(c))).toBe(true)
  })

  it('P21/c walk-through matches site operators (unique axis b, choice 1)', () => {
    expect(P21C_ITA_WALKTHROUGH.number).toBe(14)
    expect(P21C_ITA_WALKTHROUGH.hm).toBe('P21/c')
    expect(P21C_ITA_WALKTHROUGH.operators).toHaveLength(4)
    expect(P21C_ITA_WALKTHROUGH.panels).toHaveLength(4)
    for (const op of P21C_ITA_WALKTHROUGH.operators) {
      const site = OPERATORS.find((o) => o.index === op.index)
      expect(site, `missing site op ${op.index}`).toBeTruthy()
      expect(site!.triplet).toBe(op.triplet)
      expect(site!.label).toBe(op.label)
    }
  })
})
