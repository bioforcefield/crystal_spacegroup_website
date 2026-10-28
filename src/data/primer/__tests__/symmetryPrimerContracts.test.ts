/**
 * Source contracts for home-page Symmetry operations primer animations.
 * Geometric CSS movers + ScrewGhost + InvGhost are authoritative; static B/I match their endpoints.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRIMER_ENDPOINT_TRANSFORMS } from '../../../components/SymmetryPrimer'

const root = resolve(__dirname, '../../../..')
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')

describe('SymmetryPrimer animation contracts', () => {
  const tsx = read('src/components/SymmetryPrimer.tsx') + read('src/data/primer/primerGeometry.ts')
  const css = read('src/index.css')

  it('covers all six operation cards with geometric movers (not PoseGhost)', () => {
    for (const id of ['identity', 'inversion', 'twofold', 'screw', 'mirror', 'glide']) {
      expect(tsx).toMatch(new RegExp(`id: '${id}'`))
      expect(tsx).toMatch(`data-primer={d.id}`)
    }
    expect(tsx).toMatch(/primer-identity-pulse/)
    expect(tsx).toMatch(/primer-inv-ghost/)
    expect(tsx).toMatch(/primer-twofold-rotor/)
    expect(tsx).toMatch(/primer-screw-ghost/)
    expect(tsx).toMatch(/primer-mirror-rotor/)
    expect(tsx).toMatch(/primer-glide-ghost/)
    expect(tsx).toMatch(/function ScrewGhost/)
    expect(tsx).toMatch(/function InvGhost/)
    expect(tsx).not.toMatch(/function PoseGhost/)
    expect(tsx).not.toMatch(/primer-pose-ghost/)
    expect(tsx).not.toMatch(/primer-inv-rotor/)
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
    expect(tsx).toMatch(/objectScale/)
    expect(tsx).toMatch(/#fca5a5/)
    expect(tsx).toMatch(/#86efac/)
    expect(tsx).toMatch(/#93c5fd/)
    expect(tsx).not.toMatch(/primer-hand-near/)
    expect(tsx).not.toMatch(/primer-hand-far/)
    expect(tsx).not.toMatch(/near●/)
    expect(tsx).not.toMatch(/far○/)
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
    expect(css).toMatch(/primer-inv-ghost/)
    expect(tsx).toMatch(/prefers-reduced-motion/)
  })

  it('inversion is JS InvGhost (objectScale 1→−1), improper, distinct from 2-fold', () => {
    expect(tsx).toMatch(/function InvGhost/)
    expect(tsx).toMatch(/inversionScale/)
    expect(tsx).toMatch(/objectScale=\{pose\.s\}/)
    expect(tsx).toMatch(/objectScale=\{-1\}/)
    expect(tsx).toMatch(/Distinct from a 2-fold/)
    expect(tsx).toMatch(/INVERSION_TIP_OBJECT/)
    expect(css).not.toMatch(/@keyframes primer-inv\b/)
    expect(css).not.toMatch(/primer-inv-rotor/)
    expect(css).toMatch(/\.primer-inv-ghost/)
    const invCase = tsx.split("case 'inversion':")[1].split("case 'twofold':")[0]
    expect(invCase).toMatch(/InvGhost/)
    expect(invCase).toMatch(/inversionTipScreen/)
    expect(invCase).not.toMatch(/enantiomorph=\{true\}/)
    expect(invCase).not.toMatch(/StaticEndpoint/)
    expect(invCase).not.toMatch(/primer-inv-rotor/)
  })

  it('2-fold is top-down lens only (axis ⊥ page, no vertical stroke)', () => {
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
    expect(PRIMER_ENDPOINT_TRANSFORMS.twofold.I).toBe('rotate(180 60 36)')
  })

  it('2₁ screw is 180° about axis + ½ along it, same enantiomorph', () => {
    expect(tsx).toMatch(/\+½/)
    expect(tsx).toMatch(/side view: 180° \+ ½ along axis/)
    expect(tsx).toMatch(/proper — hand kept/)
    expect(tsx).toMatch(/function ScrewGhost/)
    const screwCase = tsx.split("case 'screw':")[1].split("case 'mirror':")[0]
    expect(screwCase).toMatch(/<line/)
    expect(screwCase).not.toMatch(/<ellipse/)
    expect(screwCase.match(/enantiomorph=\{false\}/g)?.length).toBeGreaterThanOrEqual(2)
    expect(screwCase).not.toMatch(/enantiomorph=\{true\}/)
    expect(screwCase).toMatch(/yawDeg=\{0\}/)
    expect(screwCase).toMatch(/yawDeg=\{180\}/)
    expect(tsx).toMatch(/yaw: 180 \* e/)
    expect(tsx).toMatch(/axisX - radius \* Math\.cos/)
    expect(css).not.toMatch(/@keyframes primer-screw/)
  })

  it('mirror is improper — CSS scaleX vs screw yaw (hand flips)', () => {
    expect(tsx).toMatch(/improper — hand flips/)
    expect(css).toMatch(/@keyframes primer-mirror/)
    expect(css).toMatch(/scale\(-1, 1\)/)
    expect(PRIMER_ENDPOINT_TRANSFORMS.mirror.I).toContain('scale(-1,1)')
    const mirrorCase = tsx.split("case 'mirror':")[1].split("case 'glide':")[0]
    expect(mirrorCase).toMatch(/StaticEndpoint/)
    expect(mirrorCase).toMatch(/primer-mirror-rotor/)
    // Contrast: screw keeps yaw 180 same hand; mirror uses scale flip
    expect(tsx).toMatch(/yawDeg=\{180\}/)
  })

  it('uses unique glide marker id', () => {
    expect(tsx).toMatch(/primer-glide-arrow/)
    expect(tsx).not.toMatch(/url\(#arrow\)/)
  })

  it('mirror/glide keep geometric CSS scales; inversion uses InvGhost objectScale', () => {
    expect(css).toMatch(/@keyframes primer-mirror/)
    expect(css).toMatch(/scale\(-1, 1\)/)
    expect(css).toMatch(/@keyframes primer-glide/)
    expect(css).toMatch(/scale\(1, -1\)/)
    expect(PRIMER_ENDPOINT_TRANSFORMS.glide.I).toContain('scale(1,-1)')
    expect(tsx).toMatch(/function StaticEndpoint/)
    expect(tsx).toMatch(/PRIMER_ENDPOINT_TRANSFORMS/)
    // inversion no longer in PRIMER_ENDPOINT_TRANSFORMS
    expect(PRIMER_ENDPOINT_TRANSFORMS).not.toHaveProperty('inversion')
    // Static improper ends must not use Motif enantiomorph={true}
    const invCase = tsx.split("case 'inversion':")[1].split("case 'twofold':")[0]
    expect(invCase).not.toMatch(/enantiomorph=\{true\}/)
    const glideCase = tsx.split("case 'glide':")[1]
    expect(glideCase).not.toMatch(/enantiomorph=\{true\}/)
  })
})

describe('Static endpoints match CSS / ghost keyframes', () => {
  const css = read('src/index.css')

  it('inversion B/I match InvGhost ends (s=+1 / s=−1), not CSS scale', () => {
    const tsx = read('src/components/SymmetryPrimer.tsx')
    expect(tsx).toMatch(/inversionJunction\(1\)/)
    expect(tsx).toMatch(/inversionJunction\(-1\)/)
    expect(tsx).toMatch(/objectScale=\{1\}/)
    expect(tsx).toMatch(/objectScale=\{-1\}/)
    expect(css).not.toMatch(/@keyframes primer-inv\b/)
    expect(PRIMER_ENDPOINT_TRANSFORMS).not.toHaveProperty('inversion')
  })

  it('mirror B/I transforms match primer-mirror from/to', () => {
    expect(css).toMatch(
      /@keyframes primer-mirror[\s\S]*?from\s*\{[\s\S]*?translate\(60px, 36px\) scale\(1, 1\) translate\(-26px, 0\)/,
    )
    expect(css).toMatch(
      /@keyframes primer-mirror[\s\S]*?to\s*\{[\s\S]*?translate\(60px, 36px\) scale\(-1, 1\) translate\(-26px, 0\)/,
    )
    expect(PRIMER_ENDPOINT_TRANSFORMS.mirror.I).toBe(
      'translate(60,36) scale(-1,1) translate(-26,0)',
    )
  })

  it('glide B/I transforms match primer-glide 0% / 100%', () => {
    expect(css).toMatch(
      /@keyframes primer-glide[\s\S]*?0%\s*\{[\s\S]*?translate\(32px, 36px\) scale\(1, 1\) translate\(0, -14px\)/,
    )
    expect(css).toMatch(
      /@keyframes primer-glide[\s\S]*?100%\s*\{[\s\S]*?translate\(88px, 36px\) scale\(1, -1\) translate\(0, -14px\)/,
    )
    expect(PRIMER_ENDPOINT_TRANSFORMS.glide.B).toBe(
      'translate(32,36) scale(1,1) translate(0,-14)',
    )
    expect(PRIMER_ENDPOINT_TRANSFORMS.glide.I).toBe(
      'translate(88,36) scale(1,-1) translate(0,-14)',
    )
  })
})
