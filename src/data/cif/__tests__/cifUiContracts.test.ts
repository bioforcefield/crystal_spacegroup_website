/**
 * Lightweight contracts for recent CIF UI work (items 1–5 + camera/cell chrome).
 * Pure checks — no React Testing Library in this repo's Vitest env.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cellBadgeModel } from '../cellBadgeModel'

const root = resolve(__dirname, '../../../..')

function readSrc(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('CIF UI source contracts', () => {
  it('Cell HUD has no expand button that gates lattice details', () => {
    const badge = readSrc('src/components/cif/CellParamsBadge.tsx')
    expect(badge).not.toMatch(/setCellOpen|cellOpen|cif-cell-more|aria-expanded/)
    expect(badge).toMatch(/cellBadgeModel/)
    expect(badge).toMatch(/cif-cell-badge-meta/)
    const model = cellBadgeModel({
      a: 9.968,
      b: 11.966,
      c: 14.171,
      alphaDeg: 77.24,
      betaDeg: 73.47,
      gammaDeg: 87.16,
    })
    // Angles + origin always present in the model (rendered on load)
    expect(model.anglesText.length).toBeGreaterThan(0)
    expect(model.originText).toBe('O (0,0,0)')
  })

  it('FitCifCamera retries on usable size and observes canvas resize', () => {
    const scene = readSrc('src/components/CifStructureScene.tsx')
    expect(scene).toMatch(/aspectForFit/)
    expect(scene).toMatch(/ResizeObserver/)
    expect(scene).toMatch(/clientWidth/)
    expect(scene).toMatch(/computeCifViewBounds/)
    expect(scene).toMatch(/updateProjectionMatrix/)
  })

  it('canvas frame still absolutely fills the workspace', () => {
    const css = readSrc('src/index.css')
    expect(css).toMatch(/\.cif-canvas-frame\s*\{[^}]*position:\s*absolute/s)
    expect(css).toMatch(/\.cif-canvas-frame\s*\{[^}]*inset:\s*0/s)
    expect(css).toMatch(/\.cif-explorer \.viewport-body\.cif-viewport-body \.canvas-wrap\s*\{[^}]*position:\s*relative/s)
  })

  it('In-cell short label is Wrap (not Cell) to avoid HUD confusion', () => {
    const vp = readSrc('src/components/cif/CifViewport.tsx')
    expect(vp).toMatch(/label-full">In cell</)
    expect(vp).toMatch(/label-short">Wrap</)
    expect(vp).not.toMatch(/label-short">Cell</)
  })

  it('Teaching view + Display menu chrome remain wired', () => {
    const vp = readSrc('src/components/cif/CifViewport.tsx')
    expect(vp).toMatch(/Teaching view/)
    expect(vp).toMatch(/cif-display/)
    expect(vp).toMatch(/onTeachingView|Teaching view/)
    expect(vp).toMatch(/Legend|cif-chrome-label/)
  })

  it('lattice HUD lives outside the canvas (strip), not as a covering overlay', () => {
    const scene = readSrc('src/components/CifStructureScene.tsx')
    const vp = readSrc('src/components/cif/CifViewport.tsx')
    const css = readSrc('src/index.css')
    // No in-canvas overlay badge
    expect(scene).not.toMatch(/CellParamsBadge/)
    expect(scene).toMatch(/className="cif-r3f-root"/)
    // Strip rendered above the canvas body
    expect(vp).toMatch(/CellParamsBadge[\s\S]*variant="strip"/)
    expect(vp).toMatch(/CellParamsBadge[\s\S]*viewport-body cif-viewport-body/)
    // R3F fill selector must not blanket every child div (that forced badge to 100%)
    expect(css).not.toMatch(/\.cif-canvas-frame\s*>\s*div\s*\{/)
    expect(css).toMatch(/\.cif-canvas-frame\s*>\s*\.cif-r3f-root\s*\{/)
    // Explorer uses strip, hides overlay badge; no backdrop blur on lattice chrome
    expect(css).toMatch(/\.cif-explorer \.cif-cell-strip\s*\{/)
    expect(css).toMatch(/\.cif-explorer \.cif-cell-badge\s*\{\s*display:\s*none/)
    const badgeBlock = css.match(/\.cif-cell-badge\s*\{[^}]+\}/)?.[0] ?? ''
    expect(badgeBlock).not.toMatch(/backdrop-filter\s*:/)
    expect(badgeBlock).toMatch(/pointer-events:\s*none/)
    expect(badgeBlock).not.toMatch(/height:\s*100%/)
  })
})
