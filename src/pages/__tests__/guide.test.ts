import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { GUIDE_SYMBOL } from '../IndexPage'
import { CLASS_PALETTE_ORDER, SYMMETRY_CLASSES } from '../../data/symmetryPalette'

describe('How to use & legend', () => {
  const src = readFileSync('src/pages/IndexPage.tsx', 'utf8')
  it('symbol table covers every symmetry class (driven by the palette)', () => {
    expect(Object.keys(GUIDE_SYMBOL).sort()).toEqual(Object.keys(SYMMETRY_CLASSES).sort())
    expect(CLASS_PALETTE_ORDER).toHaveLength(13)
    expect(src).toMatch(/CLASS_LEGEND_ORDER\.map[\s\S]*GUIDE_SYMBOL\[id\]/)
  })
  it('wording and links', () => {
    expect(src).toContain('Nearest images (Near)')
    expect(src).toContain('In cell (Wrap)')
    expect(src).not.toContain('independent student tool')
    expect(src).toContain('href="#site-disclaimer"')
    expect(src).toContain('id="site-disclaimer"')
    for (const p of ['?asm=', '?src=redo', 'diagram=1', '?analysis=', '?dis=', '?alt=']) expect(src).toContain(p)
  })
})
