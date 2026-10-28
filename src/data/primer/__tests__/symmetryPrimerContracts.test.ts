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

  it('uses an isometric chiral L MotifGlyph (no flat near/far badges)', () => {
    expect(tsx).toMatch(/function MotifGlyph/)
    expect(tsx).toMatch(/function iso\(/)
    expect(tsx).toMatch(/primer-iso-l/)
    expect(tsx).toMatch(/data-iso-enantiomorph/)
    expect(tsx).toMatch(/enantiomorph/)
    expect(tsx).toMatch(/True isometric chiral L/)
    expect(tsx).toMatch(/yawDeg/)
    expect(tsx).toMatch(/objectMap/)
    // Distinct tips echo ChiralMotif (ball / triangle / square)
    expect(tsx).toMatch(/#fca5a5/)
    expect(tsx).toMatch(/#86efac/)
    expect(tsx).toMatch(/#93c5fd/)
    // No flat near● / far○ handedness ornaments
    expect(tsx).not.toMatch(/primer-hand-near/)
    expect(tsx).not.toMatch(/primer-hand-far/)
    expect(tsx).not.toMatch(/near●/)
    expect(tsx).not.toMatch(/far○/)
    expect(tsx).not.toMatch(/Handedness \/ depth cue/)
    expect(tsx).not.toMatch(/mirrored\s*\?\s*\(/)
    expect(tsx).not.toMatch(/polygon points="0,-7 6,5 -6,5"/)
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
    expect(tsx).toMatch(/prefers-reduced-motion/)
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
    expect(twofoldCase.match(/enantiomorph=\{false\}/g)?.length).toBeGreaterThanOrEqual(2)
    expect(twofoldCase).not.toMatch(/enantiomorph=\{true\}/)
    expect(css).toMatch(/transform-origin:\s*60px 36px/)
    expect(css).toMatch(/@keyframes primer-twofold/)
    expect(css).toMatch(/rotate\(180deg\)/)
  })

  it('2₁ screw is 180° about axis + ½ along it, same enantiomorph', () => {
    expect(tsx).toMatch(/\+½/)
    expect(tsx).toMatch(/side view: 180° \+ ½ along axis/)
    expect(tsx).toMatch(/proper — hand kept/)
    expect(tsx).toMatch(/function ScrewGhost/)
    const screwCase = tsx.split("case 'screw':")[1].split("case 'mirror':")[0]
    expect(screwCase).toMatch(/<line/)
    expect(screwCase).not.toMatch(/<ellipse/)
    // Proper: both markers keep the same hand
    expect(screwCase.match(/enantiomorph=\{false\}/g)?.length).toBeGreaterThanOrEqual(2)
    expect(screwCase).not.toMatch(/enantiomorph=\{true\}/)
    // End pose is yaw 180 (foot away) — crystallographic 2₁, not a mirror
    expect(screwCase).toMatch(/yawDeg=\{0\}/)
    expect(screwCase).toMatch(/yawDeg=\{180\}/)
    expect(screwCase).not.toMatch(/orient="scale\(-1,1\)"/)
    expect(screwCase).not.toMatch(/orient="rotate\(180\)"/)
    // Ghost orbits + yaws (no CSS scaleX(-1) story)
    expect(tsx).toMatch(/yaw = 180 \* e/)
    expect(tsx).toMatch(/60 - radius \* Math\.cos/)
    expect(css).not.toMatch(/@keyframes primer-screw/)
    expect(css).not.toMatch(/translate\(84px, 50px\) scale\(-1, 1\)/)
  })

  it('mirror is improper — opposite isometric enantiomorph vs screw', () => {
    expect(tsx).toMatch(/improper — hand flips/)
    const mirrorCase = tsx.split("case 'mirror':")[1].split("case 'glide':")[0]
    expect(mirrorCase).toMatch(/enantiomorph=\{false\}/)
    expect(mirrorCase).toMatch(/enantiomorph=\{true\}/)
    expect(mirrorCase).toMatch(/label="I"[\s\S]*?enantiomorph=\{true\}/)
    // Mirror keeps yaw 0 (foot toward) — contrast with screw I at yaw 180
    expect(mirrorCase).toMatch(/yawDeg=\{0\}/)
    expect(mirrorCase).not.toMatch(/yawDeg=\{180\}/)
    expect(mirrorCase).not.toMatch(/orient="scale\(-1,1\)"/)
    expect(css).toMatch(/@keyframes primer-mirror/)
    expect(css).toMatch(/scale\(-1, 1\)/)
  })

  it('uses unique glide marker id', () => {
    expect(tsx).toMatch(/primer-glide-arrow/)
    expect(tsx).not.toMatch(/url\(#arrow\)/)
  })

  it('improper ops end on enantiomorph; movers use geometric scales', () => {
    expect(css).toMatch(/@keyframes primer-inv/)
    expect(css).toMatch(/scale\(-1, -1\)/)
    expect(css).toMatch(/@keyframes primer-mirror/)
    expect(css).toMatch(/scale\(-1, 1\)/)
    expect(css).toMatch(/@keyframes primer-glide/)
    expect(css).toMatch(/scale\(1, -1\)/)
    const invCase = tsx.split("case 'inversion':")[1].split("case 'twofold':")[0]
    expect(invCase).toMatch(/enantiomorph=\{true\}/)
    const glideCase = tsx.split("case 'glide':")[1]
    expect(glideCase).toMatch(/enantiomorph=\{true\}/)
    expect(css).not.toMatch(/primer-inv-proper/)
    expect(tsx).not.toMatch(/MotifLocal mirrored/)
  })
})
