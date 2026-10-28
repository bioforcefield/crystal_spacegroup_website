import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { iso, objectMap, screwEase, screwPose, SCREW_PRIMER } from '../primerGeometry'
import { PRIMER_ENDPOINT_TRANSFORMS } from '../../../components/SymmetryPrimer'

const root = resolve(__dirname, '../../../..')
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')
const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 9))
const det3 = (m: number[][]) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
  m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
  m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
const matOf = (yaw: number, en: boolean) => {
  const cols = [objectMap(1, 0, 0, yaw, en), objectMap(0, 1, 0, yaw, en), objectMap(0, 0, 1, yaw, en)]
  return [0, 1, 2].map((r) => cols.map((c) => c[r]))
}

describe('iso projection', () => {
  it('maps origin to origin and up to screen-up', () => {
    close(iso(0, 0, 0), [0, 0])
    close(iso(0, 1, 0), [0, -1])
  })
  it('x and z project to opposite screen-x at 30°', () => {
    close(iso(1, 0, 0), [0.8660254, 0.5])
    close(iso(0, 0, 1), [-0.8660254, 0.5])
  })
  it('is linear', () => {
    const a = iso(1, 2, 3), b = iso(2, 4, 6)
    close(b, [2 * a[0], 2 * a[1]])
  })
})

describe('objectMap (yaw about +Y, enantiomorph x→−x)', () => {
  it('identity at yaw 0, no flip', () => close(objectMap(1, 2, 3, 0, false), [1, 2, 3]))
  it('enantiomorph flips x only', () => close(objectMap(1, 2, 3, 0, true), [-1, 2, 3]))
  it('yaw 90 sends +X→−Z and +Z→+X; Y fixed', () => {
    close(objectMap(1, 0, 0, 90, false), [0, 0, -1])
    close(objectMap(0, 0, 1, 90, false), [1, 0, 0])
    close(objectMap(0, 5, 0, 90, false), [0, 5, 0])
  })
  it('yaw 180 is a 2-fold about Y: (x,y,z)→(−x,y,−z)', () =>
    close(objectMap(1, 2, 3, 180, false), [-1, 2, -3]))
  it('proper ops keep handedness (det +1); enantiomorph flips it (det −1)', () => {
    for (const yaw of [0, 37, 90, 180, 270]) {
      expect(det3(matOf(yaw, false))).toBeCloseTo(1, 9)
      expect(det3(matOf(yaw, true))).toBeCloseTo(-1, 9)
    }
  })
  it('preserves lengths', () => {
    const [X, Y, Z] = objectMap(1, 2, 3, 123, true)
    expect(X * X + Y * Y + Z * Z).toBeCloseTo(14, 9)
  })
})

describe('2₁ screw ghost endpoints (animation authoritative)', () => {
  it('ease is 0→1 monotone with fixed ends', () => {
    expect(screwEase(0)).toBe(0)
    expect(screwEase(1)).toBe(1)
    expect(screwEase(0.5)).toBeCloseTo(0.5, 9)
    let prev = -1
    for (let p = 0; p <= 1; p += 0.05) { const e = screwEase(p); expect(e).toBeGreaterThanOrEqual(prev); prev = e }
  })
  it('e=0 matches static B (yaw 0)', () => {
    const p = screwPose(0)
    expect(p.x).toBeCloseTo(SCREW_PRIMER.B.x, 9)
    expect(p.y).toBeCloseTo(SCREW_PRIMER.B.y, 9)
    expect(p.yaw).toBe(0)
  })
  it('e=1 matches static I (yaw 180)', () => {
    const p = screwPose(1)
    expect(p.x).toBeCloseTo(SCREW_PRIMER.I.x, 9)
    expect(p.y).toBeCloseTo(SCREW_PRIMER.I.y, 9)
    expect(p.yaw).toBe(SCREW_PRIMER.I.yaw)
  })
  it('B/I are symmetric about the axis and slide +½ downward', () => {
    expect(SCREW_PRIMER.axisX - SCREW_PRIMER.B.x).toBe(SCREW_PRIMER.radius)
    expect(SCREW_PRIMER.I.x - SCREW_PRIMER.axisX).toBe(SCREW_PRIMER.radius)
    expect(SCREW_PRIMER.I.y - SCREW_PRIMER.B.y).toBe(SCREW_PRIMER.halfSlide)
  })
  it('midway is on the axis, half-turned and half-slid', () => {
    const m = screwPose(0.5)
    expect(m.x).toBeCloseTo(SCREW_PRIMER.axisX, 9)
    expect(m.yaw).toBe(90)
    expect(m.y).toBeCloseTo(SCREW_PRIMER.y0 + SCREW_PRIMER.halfSlide / 2, 9)
  })
  it('component wires ScrewGhost + static B/I through SCREW_PRIMER/screwPose (no magic numbers)', () => {
    const tsx = read('src/components/SymmetryPrimer.tsx')
    expect(tsx).toMatch(/screwPose\(e\)/)
    expect(tsx).toMatch(/screwEase\(p\)/)
    expect(tsx).toMatch(/x=\{SCREW_PRIMER\.B\.x\}/)
    expect(tsx).toMatch(/x=\{SCREW_PRIMER\.I\.x\}/)
    expect(tsx).not.toMatch(/radius \* Math\.cos/)
  })
})

describe('2-fold static ↔ CSS keyframes', () => {
  it('B/I = rotate 0°/180° about (60,36), matching @keyframes primer-twofold', () => {
    const css = read('src/index.css')
    expect(PRIMER_ENDPOINT_TRANSFORMS.twofold.B).toBe('rotate(0 60 36)')
    expect(PRIMER_ENDPOINT_TRANSFORMS.twofold.I).toBe('rotate(180 60 36)')
    const kf = css.slice(css.indexOf('@keyframes primer-twofold'))
    const body = kf.slice(0, kf.indexOf('\n}\n'))
    expect(body).toMatch(/0%\s*\{\s*transform:\s*rotate\(0deg\)/)
    expect(body).toMatch(/rotate\(180deg\)/)
    expect(body).not.toMatch(/scale|translate/)
    expect(css).toMatch(/\.primer-twofold-rotor\s*\{\s*transform-origin:\s*60px 36px/)
  })
})

describe('wiring & regression guards', () => {
  const tsx = read('src/components/SymmetryPrimer.tsx')
  it('IndexPage mounts <SymmetryPrimer />', () => {
    const idx = read('src/pages/IndexPage.tsx')
    expect(idx).toMatch(/import SymmetryPrimer from '..\/components\/SymmetryPrimer'/)
    expect(idx).toMatch(/<SymmetryPrimer \/>/)
  })
  it('PoseGhost stays gone and static ends never set enantiomorph={true}', () => {
    expect(tsx).not.toMatch(/PoseGhost/)
    expect(tsx).not.toMatch(/enantiomorph=\{true\}/)
  })
})
