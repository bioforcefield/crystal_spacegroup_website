// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, cleanup } from '@testing-library/react'
import HeroCellMotif, { HERO_B, HERO_CENTER, HERO_I } from '../HeroCellMotif'

afterEach(cleanup)
const css = readFileSync('src/index.css', 'utf8')
describe('hero logo motif', () => {
  it('B and I are centrosymmetric through the projected cell centre', () => {
    expect(HERO_CENTER).toEqual({ x: 110, y: 105 })
    expect((HERO_B.x + HERO_I.x) / 2).toBe(110)
    expect((HERO_B.y + HERO_I.y) / 2).toBe(105)
  })
  it('straight B→⊙→I path, ⊙ marked in inversion pink, I is the point-inverted motif, aria-hidden', () => {
    const { container } = render(<HeroCellMotif />)
    expect(container.querySelector('.hero-motif')!.getAttribute('aria-hidden')).toBe('true')
    const path = container.querySelector('line.hero-inv-path')!
    expect([path.getAttribute('x1'), path.getAttribute('y1'), path.getAttribute('x2'), path.getAttribute('y2')]).toEqual(['86', '91', '134', '119'])
    expect(path.getAttribute('stroke')).toBe('#f472b6')
    expect(container.querySelector('.hero-inv-center circle')!.getAttribute('cx')).toBe('110')
    expect(container.querySelector('.hero-atom-i-pop')!.getAttribute('transform')).toContain('scale(-1)')
    expect(container.querySelector('.hero-cell-label')!.textContent).toBe('P21/c · P1')
    expect(container.querySelector('.hero-cell-label line')).not.toBeNull()
    expect(container.querySelector('.hero-bond-dash, .hero-screw-path')).toBeNull()
  })
  it('one 8 s timeline, no 3D tilt, reduced motion stops all', () => {
    expect(css).not.toMatch(/hero-cell-tilt/)
    for (const k of ['hero-b', 'hero-draw', 'hero-center-pulse', 'hero-i', 'hero-fade-path']) expect(css).toMatch(new RegExp(`animation: ${k} 8s`))
    const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce) {\n  .hero-face-outer'))
    for (const c of ['.hero-atom-b', '.hero-atom-i', '.hero-inv-path', '.hero-inv-draw', '.hero-inv-pulse']) expect(rm.slice(0, 400)).toContain(c)
  })
})
