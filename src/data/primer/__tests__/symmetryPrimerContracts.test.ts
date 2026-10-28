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
    expect(tsx).toMatch(/primer-inv-travel/)
    expect(tsx).toMatch(/primer-twofold-rotor/)
    expect(tsx).toMatch(/primer-screw-ghost/)
    expect(tsx).toMatch(/primer-mirror-travel/)
    expect(tsx).toMatch(/primer-glide-ghost/)
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

  it('keeps pure 2-fold at constant height (no axial shift)', () => {
    // Rotor origin at mid-height; B and I share y=36
    expect(tsx).toMatch(/Motif x=\{38\} y=\{36\}/)
    expect(tsx).toMatch(/Motif\s*\n\s*x=\{82\}\s*\n\s*y=\{36\}/)
    expect(css).toMatch(/transform-origin:\s*60px 36px/)
    expect(css).toMatch(/@keyframes primer-twofold/)
  })

  it('screw adds +½ slide distinct from twofold', () => {
    expect(tsx).toMatch(/\+½/)
    expect(css).toMatch(/@keyframes primer-screw/)
    expect(css).toMatch(/translate\(84px, 48px\) rotate\(180deg\)/)
  })

  it('uses unique glide marker id', () => {
    expect(tsx).toMatch(/primer-glide-arrow/)
    expect(tsx).not.toMatch(/url\(#arrow\)/)
  })

  it('improper ops keep mirrored image geometry', () => {
    expect(tsx).toMatch(/primer-inv-mirror/)
    expect(tsx).toMatch(/primer-mirror-image/)
    expect(tsx).toMatch(/primer-glide-image/)
  })
})
