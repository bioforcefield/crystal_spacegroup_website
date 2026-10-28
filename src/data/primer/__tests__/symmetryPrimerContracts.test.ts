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

  it('uses a single chiral L MotifGlyph with near/far handedness cue', () => {
    expect(tsx).toMatch(/function MotifGlyph/)
    expect(tsx).toMatch(/Handedness \/ depth cue/)
    expect(tsx).toMatch(/primer-hand-near/)
    expect(tsx).toMatch(/primer-hand-far/)
    expect(tsx).toMatch(/enantiomorph/)
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
    expect(tsx).toMatch(/Motif\s*\n\s*x=\{38\}\s*\n\s*y=\{36\}/)
    expect(tsx).toMatch(/Motif\s*\n\s*x=\{82\}\s*\n\s*y=\{36\}/)
    expect(tsx).toMatch(/orient="rotate\(180\)"/)
    expect(tsx).toMatch(/axis ⊥ page/)
    expect(tsx).toMatch(/primer-twofold-arrow/)
    const twofoldCase = tsx.split("case 'twofold':")[1].split("case 'screw':")[0]
    expect(twofoldCase).toMatch(/<ellipse/)
    expect(twofoldCase).not.toMatch(/<line/)
    // Proper: same enantiomorph both ends
    expect(twofoldCase.match(/enantiomorph=\{false\}/g)?.length).toBeGreaterThanOrEqual(2)
    expect(css).toMatch(/transform-origin:\s*60px 36px/)
    expect(css).toMatch(/@keyframes primer-twofold/)
    expect(css).toMatch(/rotate\(180deg\)/)
  })

  it('2₁ screw is side view, proper — same enantiomorph, no scaleX(-1)', () => {
    expect(tsx).toMatch(/\+½/)
    expect(tsx).toMatch(/side view: 180° \+ ½ along axis/)
    expect(tsx).toMatch(/proper — hand kept/)
    const screwCase = tsx.split("case 'screw':")[1].split("case 'mirror':")[0]
    expect(screwCase).toMatch(/<line/)
    expect(screwCase).not.toMatch(/<ellipse/)
    // Proper: both markers keep the same hand
    expect(screwCase.match(/enantiomorph=\{false\}/g)?.length).toBeGreaterThanOrEqual(2)
    expect(screwCase).not.toMatch(/enantiomorph=\{true\}/)
    // No improper scaleX(-1) on the static image (that looked like mirror)
    expect(screwCase).not.toMatch(/orient="scale\(-1,1\)"/)
    expect(screwCase).not.toMatch(/orient="rotate\(180\)"/)
    expect(css).toMatch(/@keyframes primer-screw/)
    // End pose keeps scale(1,1) — foreshorten through axis but never flip sign
    expect(css).toMatch(/translate\(84px, 50px\) scale\(1, 1\)/)
    expect(css).not.toMatch(/translate\(84px, 50px\) scale\(-1, 1\)/)
    expect(css).not.toMatch(/translate\(84px, 48px\) rotate\(180deg\)/)
  })

  it('mirror is improper — opposite enantiomorph vs screw', () => {
    expect(tsx).toMatch(/improper — hand flips/)
    const mirrorCase = tsx.split("case 'mirror':")[1].split("case 'glide':")[0]
    expect(mirrorCase).toMatch(/enantiomorph=\{false\}/)
    expect(mirrorCase).toMatch(/enantiomorph=\{true\}/)
    // Static I is the flipped hand
    expect(mirrorCase).toMatch(/label="I"[\s\S]*?enantiomorph=\{true\}/)
    expect(css).toMatch(/@keyframes primer-mirror/)
    expect(css).toMatch(/scale\(-1, 1\)/)
  })

  it('uses unique glide marker id', () => {
    expect(tsx).toMatch(/primer-glide-arrow/)
    expect(tsx).not.toMatch(/url\(#arrow\)/)
  })

  it('improper ops use geometric scale/mirror transforms (not opacity crossfade)', () => {
    expect(css).toMatch(/@keyframes primer-inv/)
    expect(css).toMatch(/scale\(-1, -1\)/)
    expect(tsx).toMatch(/orient="scale\(-1,-1\)"/)
    expect(css).toMatch(/@keyframes primer-mirror/)
    expect(css).toMatch(/scale\(-1, 1\)/)
    expect(css).toMatch(/@keyframes primer-glide/)
    expect(css).toMatch(/scale\(1, -1\)/)
    expect(tsx).toMatch(/orient="scale\(1,-1\)"/)
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
