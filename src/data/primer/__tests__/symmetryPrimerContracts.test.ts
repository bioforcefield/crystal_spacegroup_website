/**
 * Source contracts for home-page Symmetry operations primer animations.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../../..')
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')

describe('SymmetryPrimer animation contracts', () => {
  const tsx = read('src/components/SymmetryPrimer.tsx')
  const css = read('src/index.css')

  it('covers all six operation cards with movers', () => {
    for (const id of ['identity', 'inversion', 'twofold', 'screw', 'mirror', 'glide']) {
      expect(tsx).toMatch(new RegExp(`id: '${id}'`))
      expect(tsx).toMatch(`data-primer={d.id}`)
    }
    expect(tsx).toMatch(/primer-identity-pulse/)
    expect(tsx).toMatch(/primer-inv-rotor/)
    expect(tsx).toMatch(/primer-twofold-rotor/)
    expect(tsx).toMatch(/primer-screw-ghost/)
    expect(tsx).toMatch(/primer-mirror-rotor/)
    expect(tsx).toMatch(/primer-glide-ghost/)
  })

  it('uses a single chiral L MotifGlyph (not circle/triangle tip swap)', () => {
    expect(tsx).toMatch(/function MotifGlyph/)
    expect(tsx).toMatch(/Chiral 2D L-marker/)
    expect(tsx).toMatch(/Asymmetric right arm/)
    expect(tsx).toMatch(/Tip flag/)
    // No mid-flight shape swap via mirrored circle↔triangle Motif variants
    expect(tsx).not.toMatch(/mirrored\s*\?\s*\(/)
    expect(tsx).not.toMatch(/polygon points="0,-7 6,5 -6,5"/)
    expect(tsx).not.toMatch(/circle cx=\{0\} cy=\{-5\}/)
  })

  it('pauses off-screen via IntersectionObserver and is-inview', () => {
    expect(tsx).toMatch(/IntersectionObserver/)
    expect(tsx).toMatch(/is-inview/)
    expect(css).toMatch(/\.primer-card\.is-inview/)
  })

  it('honors prefers-reduced-motion with static markers', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)/)
    expect(css).toMatch(/\.primer-card \.primer-mover/)
    expect(css).toMatch(/primer-static-end/)
  })

  it('2-fold is top-down lens only (axis ⊥ page, no vertical stroke)', () => {
    // Digon / lens at center; B and I share y=36 (no axial shift)
    expect(tsx).toMatch(/Motif x=\{38\} y=\{36\}/)
    expect(tsx).toMatch(/Motif\s*\n\s*x=\{82\}\s*\n\s*y=\{36\}/)
    expect(tsx).toMatch(/orient="rotate\(180\)"/)
    expect(tsx).toMatch(/axis ⊥ page/)
    expect(tsx).toMatch(/primer-twofold-arrow/)
    // Lens present; no in-plane axis stroke in the twofold case
    const twofoldCase = tsx.split("case 'twofold':")[1].split("case 'screw':")[0]
    expect(twofoldCase).toMatch(/<ellipse/)
    expect(twofoldCase).not.toMatch(/<line/)
    expect(css).toMatch(/transform-origin:\s*60px 36px/)
    expect(css).toMatch(/@keyframes primer-twofold/)
    expect(css).toMatch(/rotate\(180deg\)/)
  })

  it('2₁ screw is side view: upright +½, left↔right (not cartwheel)', () => {
    expect(tsx).toMatch(/\+½/)
    expect(tsx).toMatch(/side view: 180° \+ ½ along axis/)
    const screwCase = tsx.split("case 'screw':")[1].split("case 'mirror':")[0]
    expect(screwCase).toMatch(/<line/)
    expect(screwCase).not.toMatch(/<ellipse/)
    expect(screwCase).toMatch(/orient="scale\(-1,1\)"/)
    expect(screwCase).not.toMatch(/orient="rotate\(180\)"/)
    expect(css).toMatch(/@keyframes primer-screw/)
    expect(css).toMatch(/translate\(84px, 50px\) scale\(-1, 1\)/)
    expect(css).not.toMatch(/translate\(84px, 48px\) rotate\(180deg\)/)
  })

  it('uses unique glide marker id', () => {
    expect(tsx).toMatch(/primer-glide-arrow/)
    expect(tsx).not.toMatch(/url\(#arrow\)/)
  })

  it('improper ops use geometric scale/mirror transforms (not opacity crossfade)', () => {
    // Inversion: continuous scale(-1,-1) about center
    expect(css).toMatch(/@keyframes primer-inv/)
    expect(css).toMatch(/scale\(-1, -1\)/)
    expect(tsx).toMatch(/orient="scale\(-1,-1\)"/)
    // Mirror: scaleX(-1) about plane
    expect(css).toMatch(/@keyframes primer-mirror/)
    expect(css).toMatch(/scale\(-1, 1\)/)
    expect(tsx).toMatch(/orient="scale\(-1,1\)"/)
    // Glide: scaleY(-1) then translate
    expect(css).toMatch(/@keyframes primer-glide/)
    expect(css).toMatch(/scale\(1, -1\)/)
    expect(tsx).toMatch(/orient="scale\(1,-1\)"/)
    // No opacity crossfade between different Motif tips
    expect(css).not.toMatch(/primer-inv-proper/)
    expect(css).not.toMatch(/primer-inv-mirror/)
    expect(css).not.toMatch(/primer-mirror-proper/)
    expect(css).not.toMatch(/primer-mirror-image/)
    expect(css).not.toMatch(/primer-glide-proper/)
    expect(css).not.toMatch(/primer-glide-image/)
    expect(tsx).not.toMatch(/primer-inv-proper/)
    expect(tsx).not.toMatch(/primer-mirror-image/)
    expect(tsx).not.toMatch(/MotifLocal mirrored/)
  })
})
