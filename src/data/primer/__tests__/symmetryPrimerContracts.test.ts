/**
 * Source contracts for home-page Symmetry operations primer animations.
 * Ghost endpoints must match static B/I (same Motif pose model).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRIMER_POSES, type PrimerPose } from '../../../components/SymmetryPrimer'

const root = resolve(__dirname, '../../../..')
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')

/** Mirror the TSX interpolators for endpoint assertions (keep in sync). */
function easeInOut(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
}

function lerpInversion(e: number): PrimerPose {
  const { B, I } = PRIMER_POSES.inversion
  return {
    x: B.x + (I.x - B.x) * e,
    y: B.y + (I.y - B.y) * e,
    yawDeg: 0,
    spinDeg: 0,
    enantiomorph: e >= 0.5,
  }
}

function lerpTwofold(e: number): PrimerPose {
  const { B, I } = PRIMER_POSES.twofold
  const cx = 60
  const cy = 36
  const ang = Math.PI * e
  const dx = B.x - cx
  const dy = B.y - cy
  return {
    x: cx + dx * Math.cos(ang) - dy * Math.sin(ang),
    y: cy + dx * Math.sin(ang) + dy * Math.cos(ang),
    yawDeg: 0,
    spinDeg: I.spinDeg * e,
    enantiomorph: false,
  }
}

function lerpScrew(e: number): PrimerPose {
  const { B, I } = PRIMER_POSES.screw
  const ang = Math.PI * e
  const radius = B.x < 60 ? 60 - B.x : B.x - 60
  return {
    x: 60 - radius * Math.cos(ang),
    y: B.y + (I.y - B.y) * e,
    yawDeg: I.yawDeg * e,
    spinDeg: 0,
    enantiomorph: false,
  }
}

function lerpMirror(e: number): PrimerPose {
  const { B, I } = PRIMER_POSES.mirror
  return {
    x: B.x + (I.x - B.x) * e,
    y: B.y,
    yawDeg: 0,
    spinDeg: 0,
    enantiomorph: e >= 0.5,
  }
}

function lerpGlide(e: number): PrimerPose {
  const { B, I } = PRIMER_POSES.glide
  if (e < 0.4) {
    const t = e / 0.4
    const yRef = 2 * 36 - B.y
    return {
      x: B.x,
      y: B.y + (yRef - B.y) * t,
      yawDeg: 0,
      spinDeg: 0,
      enantiomorph: t >= 0.5,
    }
  }
  const t = (e - 0.4) / 0.6
  const yRef = 2 * 36 - B.y
  return {
    x: B.x + (I.x - B.x) * t,
    y: yRef,
    yawDeg: 0,
    spinDeg: 0,
    enantiomorph: true,
  }
}

function nearly(a: PrimerPose, b: PrimerPose) {
  expect(a.x).toBeCloseTo(b.x, 5)
  expect(a.y).toBeCloseTo(b.y, 5)
  expect(a.yawDeg).toBeCloseTo(b.yawDeg, 5)
  expect(a.spinDeg).toBeCloseTo(b.spinDeg, 5)
  expect(a.enantiomorph).toBe(b.enantiomorph)
}

describe('SymmetryPrimer animation contracts', () => {
  const tsx = read('src/components/SymmetryPrimer.tsx')
  const css = read('src/index.css')

  it('covers all six operation cards with movers', () => {
    for (const id of ['identity', 'inversion', 'twofold', 'screw', 'mirror', 'glide']) {
      expect(tsx).toMatch(new RegExp(`id: '${id}'`))
      expect(tsx).toMatch(`data-primer={d.id}`)
    }
    expect(tsx).toMatch(/primer-identity-pulse/)
    expect(tsx).toMatch(/function PoseGhost/)
    expect(tsx).toMatch(/primer-pose-ghost/)
    expect(tsx).toMatch(/PRIMER_POSES/)
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
    expect(css).toMatch(/primer-pose-ghost/)
    expect(tsx).toMatch(/prefers-reduced-motion/)
  })

  it('does not use CSS scale/rotate approximations for improper or 2-fold movers', () => {
    expect(css).not.toMatch(/@keyframes primer-inv/)
    expect(css).not.toMatch(/@keyframes primer-twofold/)
    expect(css).not.toMatch(/@keyframes primer-mirror/)
    expect(css).not.toMatch(/@keyframes primer-glide\b/)
    expect(css).not.toMatch(/@keyframes primer-screw/)
    expect(tsx).not.toMatch(/primer-inv-rotor/)
    expect(tsx).not.toMatch(/primer-twofold-rotor/)
    expect(tsx).not.toMatch(/primer-mirror-rotor/)
    expect(tsx).not.toMatch(/primer-glide-ghost/)
    expect(tsx).not.toMatch(/function ScrewGhost/)
  })

  it('2-fold is top-down lens only (axis ⊥ page, no vertical stroke)', () => {
    expect(tsx).toMatch(/axis ⊥ page/)
    expect(tsx).toMatch(/primer-twofold-arrow/)
    const twofoldCase = tsx.split("case 'twofold':")[1].split("case 'screw':")[0]
    expect(twofoldCase).toMatch(/<ellipse/)
    expect(twofoldCase).not.toMatch(/<line/)
    expect(PRIMER_POSES.twofold.B.enantiomorph).toBe(false)
    expect(PRIMER_POSES.twofold.I.enantiomorph).toBe(false)
    expect(PRIMER_POSES.twofold.I.spinDeg).toBe(180)
    expect(PRIMER_POSES.twofold.B.y).toBe(PRIMER_POSES.twofold.I.y)
  })

  it('2₁ screw is 180° about axis + ½ along it, same enantiomorph', () => {
    expect(tsx).toMatch(/\+½/)
    expect(tsx).toMatch(/side view: 180° \+ ½ along axis/)
    expect(tsx).toMatch(/proper — hand kept/)
    const screwCase = tsx.split("case 'screw':")[1].split("case 'mirror':")[0]
    expect(screwCase).toMatch(/<line/)
    expect(screwCase).not.toMatch(/<ellipse/)
    expect(PRIMER_POSES.screw.B.enantiomorph).toBe(false)
    expect(PRIMER_POSES.screw.I.enantiomorph).toBe(false)
    expect(PRIMER_POSES.screw.B.yawDeg).toBe(0)
    expect(PRIMER_POSES.screw.I.yawDeg).toBe(180)
    expect(PRIMER_POSES.screw.I.y).toBeGreaterThan(PRIMER_POSES.screw.B.y)
  })

  it('mirror is improper — opposite isometric enantiomorph vs screw', () => {
    expect(tsx).toMatch(/improper — hand flips/)
    expect(PRIMER_POSES.mirror.B.enantiomorph).toBe(false)
    expect(PRIMER_POSES.mirror.I.enantiomorph).toBe(true)
    expect(PRIMER_POSES.mirror.I.yawDeg).toBe(0)
    expect(PRIMER_POSES.screw.I.yawDeg).toBe(180)
  })

  it('uses unique glide marker id', () => {
    expect(tsx).toMatch(/primer-glide-arrow/)
    expect(tsx).not.toMatch(/url\(#arrow\)/)
  })

  it('improper ops end on enantiomorph via Motif props (not CSS scale)', () => {
    expect(PRIMER_POSES.inversion.I.enantiomorph).toBe(true)
    expect(PRIMER_POSES.mirror.I.enantiomorph).toBe(true)
    expect(PRIMER_POSES.glide.I.enantiomorph).toBe(true)
    expect(css).not.toMatch(/scale\(-1, -1\)/)
    expect(css).not.toMatch(/scale\(-1, 1\)/)
    expect(css).not.toMatch(/scale\(1, -1\)/)
  })
})

describe('PoseGhost endpoints match static B/I (PRIMER_POSES)', () => {
  it('inversion t=0/1', () => {
    nearly(lerpInversion(0), PRIMER_POSES.inversion.B)
    nearly(lerpInversion(1), PRIMER_POSES.inversion.I)
  })

  it('twofold t=0/1', () => {
    nearly(lerpTwofold(0), PRIMER_POSES.twofold.B)
    nearly(lerpTwofold(1), PRIMER_POSES.twofold.I)
  })

  it('screw t=0/1', () => {
    nearly(lerpScrew(0), PRIMER_POSES.screw.B)
    nearly(lerpScrew(1), PRIMER_POSES.screw.I)
  })

  it('mirror t=0/1', () => {
    nearly(lerpMirror(0), PRIMER_POSES.mirror.B)
    nearly(lerpMirror(1), PRIMER_POSES.mirror.I)
  })

  it('glide t=0/1', () => {
    nearly(lerpGlide(0), PRIMER_POSES.glide.B)
    nearly(lerpGlide(1), PRIMER_POSES.glide.I)
  })

  it('ease helper is unused by endpoints but defined for mid-flight sanity', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(1)).toBe(1)
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 5)
  })
})
