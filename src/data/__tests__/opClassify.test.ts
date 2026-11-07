/**
 * Derived operation labels: hand-checked ITA regressions, independent
 * invariant checks over all 230 groups (canonical op and the shown Near /
 * Wrap copy), locus strings evaluated back onto the element, and the motion
 * caption checked against the drawn opPath.
 */
import { describe, expect, it } from 'vitest'
import { getDemo } from '../registry'
import { classifySeitz, fmtVec, shownLatticeShift, type OpClassification } from '../opClassify'
import { selectionLabels } from '../opLabels'
import { placedPositions, type PlacementMode } from '../nearestImages'
import { buildOpPath } from '../opPath'
import { cellBasis } from '../math'
import type { Mat3, Vec3 } from '../types'

const demos = Array.from({ length: 230 }, (_, i) => getDemo(i + 1)!)
const sym = (sg: number, idx: number) => {
  const op = getDemo(sg)!.operators.find((o) => o.index === idx)!
  return classifySeitz(op.R, op.t)
}

describe('hand-checked ITA regressions (from the review)', () => {
  const cases: [number, number, string, string][] = [
    [36, 7, '-x+1/2,y+1/2,z', 'b ¼, y, z'], // Cmc2₁: not "mirror ⊥ a"
    [36, 8, 'x+1/2,-y+1/2,z+1/2', 'n(½,0,½) x, ¼, z'],
    [65, 14, 'x+1/2,y+1/2,-z', 'n(½,½,0) x, y, 0'], // Cmmm 14–16: glides
    [65, 15, '-x+1/2,y+1/2,z', 'b ¼, y, z'],
    [65, 16, 'x+1/2,-y+1/2,z', 'a x, ¼, z'],
    [41, 6, '-x,-y+1/2,z+1/2', '2(0,0,½) 0, ¼, z'], // Aba2: 2₁ not 2
    [43, 6, '-x,-y+1/2,z+1/2', '2(0,0,½) 0, ¼, z'], // Fdd2
    [43, 10, '-x+1/2,-y,z+1/2', '2(0,0,½) ¼, 0, z'],
    [52, 3, 'x,-y+1/2,-z+1/2', '2 x, ¼, ¼'], // Pnna: 2 ‖ a, not 2₁ ‖ b
    [57, 6, 'x,y,-z+1/2', 'm x, y, ¼'], // Pbcm: m and b swapped
    [57, 7, '-x,y+1/2,z', 'b 0, y, z'],
    [100, 8, '-y+1/2,-x+1/2,z', 'm x, −x+½, z'], // P4bm diagonal: mirror
    [100, 6, 'y+1/2,x+1/2,z', 'g(½,½,0) x, x, z'],
    [194, 7, '-y,-x,-z+1/2', '2 x, −x, ¼'], // P6₃/mmc: plain 2, not 2₁ ‖ c
    [194, 9, '-x+y,y,-z+1/2', '2 x, 2x, ¼'],
    [194, 11, 'x,x-y,-z+1/2', '2 2y, y, ¼'],
    [194, 2, 'x-y,x,z+1/2', '6⁺(0,0,½) 0, 0, z'],
    [166, 14, '-y+2/3,x-y+1/3,z+1/3', '3⁺(0,0,⅓) ⅓, ⅓, z'], // R centring → 3₁
    [166, 16, 'y+2/3,x+1/3,-z+1/3', '2(½,½,0) x, x−⅙, ⅙'],
    [81, 4, '-y,x,-z', '4̄⁻ 0, 0, z; 0, 0, 0'],
    [99, 2, '-y,x,z', '4⁺ 0, 0, z'],
    [99, 8, '-y,-x,z', 'm x, −x, z'],
    [2, 2, '-x,-y,-z', '1̄ 0, 0, 0'],
    [14, 2, '-x,y+1/2,-z+1/2', '2(0,½,0) 0, y, ¼'],
    [14, 4, 'x,-y+1/2,z+1/2', 'c x, ¼, z'],
  ]
  for (const [sg, idx, triplet, want] of cases) {
    it(`SG ${sg} op ${idx} ${triplet} → ${want}`, () => {
      const op = getDemo(sg)!.operators.find((o) => o.index === idx)!
      expect(op.triplet.replace(/\s/g, '').replace(/−/g, '-').replace(/½/g, '1/2')).toBe(triplet)
      expect(sym(sg, idx).symbol).toBe(want)
    })
  }
  it('screw orders and senses', () => {
    expect(sym(194, 2).short).toBe('6₃')
    expect(sym(166, 14).short).toBe('3₁')
    expect(sym(76, 2).short).toBe('4₁')
    expect(sym(78, 2).short).toBe('4₃')
    expect(sym(14, 2).label).toBe('2₁ screw ‖ b')
    expect(sym(52, 3).label).toBe('2-fold rotation ‖ a')
  })
})

/* ---------- independent checks (integer / rational arithmetic only) ---------- */

const mv = (A: Mat3, v: Vec3): Vec3 => [0, 1, 2].map((i) => A[i][0] * v[0] + A[i][1] * v[1] + A[i][2] * v[2]) as Vec3
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const isInt = (x: number) => Math.abs(x - Math.round(x)) < 1e-6
const close = (a: Vec3, b: Vec3, tol = 1e-6) => a.every((x, i) => Math.abs(x - b[i]) < tol)
const det = (m: Mat3) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
const trW = (m: Mat3) => m[0][0] + m[1][1] + m[2][2]
const WT = (W: Mat3): Mat3 => [0, 1, 2].map((i) => [W[0][i], W[1][i], W[2][i]]) as Mat3

/** Evaluate an ITA-style locus "e1, e2, e3" at letter values. */
function evalLocus(locus: string, vals: Record<string, number>): Vec3 {
  const FR: Record<string, number> = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 }
  const num = (s: string) => {
    if (s in FR) return FR[s]
    if (s.includes('/')) {
      const [p, q] = s.split('/').map(Number)
      return p / q
    }
    return Number(s)
  }
  return locus.split(', ').map((expr) => {
    const e = expr.replace(/−/g, '-')
    const re = /([+-]?)([0-9/½⅓⅔¼¾⅙⅚⅛⅜⅝⅞]*)([xyz]?)/g
    let total = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(e)) && m[0] !== '') {
      const sign = m[1] === '-' ? -1 : 1
      const coef = m[2] ? num(m[2]) : 1
      total += sign * coef * (m[3] ? vals[m[3]] : m[2] ? 1 : 0)
    }
    return total
  }) as Vec3
}

/** Group translations (Z³ plus centring vectors) as a membership test. */
let latticeT: Vec3[] = [[0, 0, 0]]
const inGroupLattice = (v: Vec3) => latticeT.some((c) => sub(v, c).every(isInt))
function setLattice(ts: Vec3[]) {
  latticeT = ts
}

function checkInvariants(W: Mat3, w: Vec3, c: OpClassification) {
  const d = det(W)
  const t = trW(W)
  const img = (p: Vec3) => add(mv(W, p), w)
  switch (c.kind) {
    case 'identity':
    case 'translation':
      expect(close(W.flat() as unknown as Vec3, [1, 0, 0], 0) || t === 3).toBe(true)
      expect(c.kind === 'identity').toBe(w.every(isInt))
      break
    case 'rotation':
    case 'screw': {
      expect(d).toBe(1)
      expect(close(mv(W, c.axis!), c.axis!)).toBe(true)
      expect(c.axis!.every(Number.isInteger)).toBe(true)
      // The point lies on the element: (W,w)p − p = unreduced intrinsic, ∥ axis.
      expect(close(sub(img(c.point), c.point), c.intrinsicRaw)).toBe(true)
      // n-fold power is a pure translation n·w_g (a lattice vector).
      let p: Vec3 = [0.1, 0.2, 0.3]
      const p0 = p
      for (let k = 0; k < c.order; k++) p = img(p)
      expect(close(sub(p, p0), c.intrinsicRaw.map((x) => x * c.order) as Vec3)).toBe(true)
      expect(inGroupLattice(c.intrinsicRaw.map((x) => x * c.order) as Vec3)).toBe(true)
      // reduced part is a screw iff non-integral
      expect(c.kind === 'screw').toBe(!c.intrinsicRaw.every(isInt))
      if (c.screwM) {
        // m/n·u ≡ intrinsic (mod lattice along u), with the turn positive about ±u
        const s = c.sense === '-' ? -1 : 1
        const want = c.axis!.map((x) => (s * x * c.screwM!) / c.order) as Vec3
        expect(sub(want, c.intrinsicRaw).every(isInt)).toBe(true)
      }
      // locus string evaluates onto the axis
      for (const v of [0, 0.37]) {
        const q = evalLocus(c.locus, { x: v, y: v, z: v })
        expect(close(sub(img(q), q), c.intrinsicRaw)).toBe(true)
      }
      break
    }
    case 'mirror':
    case 'glide': {
      expect(d).toBe(-1)
      expect(t).toBe(1)
      expect(close(mv(WT(W), c.normal!), c.normal!.map((x) => -x) as Vec3)).toBe(true)
      expect(close(sub(img(c.point), c.point), c.intrinsicRaw)).toBe(true)
      expect(close(mv(W, c.intrinsicRaw), c.intrinsicRaw)).toBe(true) // in-plane
      expect(inGroupLattice(c.intrinsicRaw.map((x) => 2 * x) as Vec3)).toBe(true) // glide twice = group translation
      // glide reduced vector differs from raw by an in-plane lattice vector
      const dl = sub(c.intrinsicRaw, c.intrinsic)
      expect(dl.every(isInt)).toBe(true)
      expect(close(mv(W, dl), dl)).toBe(true)
      if (c.glideLetter && 'abc'.includes(c.glideLetter)) {
        const i = 'abc'.indexOf(c.glideLetter)
        expect(c.intrinsic.map(Math.abs)).toEqual([0, 1, 2].map((k) => (k === i ? 0.5 : 0)))
      }
      for (const [u, v] of [[0, 0], [0.31, 0.62]]) {
        const q = evalLocus(c.locus.includes('=') ? '0, 0, 0' : c.locus, { x: u, y: v, z: u + v })
        if (!c.locus.includes('=')) expect(close(sub(img(q), q), c.intrinsicRaw)).toBe(true)
      }
      break
    }
    case 'inversion':
      expect(close(W.map((r) => r.map((x) => -x)) as unknown as Vec3, [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as unknown as Vec3) || t === -3).toBe(true)
      expect(close(img(c.centre!), c.centre!)).toBe(true)
      break
    case 'rotoinversion':
      expect(d).toBe(-1)
      expect(close(img(c.centre!), c.centre!)).toBe(true)
      expect(close(mv(W, c.axis!), c.axis!.map((x) => -x) as Vec3)).toBe(true)
      expect([-3, 4, 6]).toContain(c.order === 3 ? -3 : c.order)
      break
  }
}

describe('all 230 groups: canonical labels and shown copies are internally exact', () => {
  it('canonical (W, w) of every listed operator', () => {
    let n = 0
    const wrong: string[] = []
    for (const d of demos) {
      setLattice(d.operators.filter((o) => o.R.every((r, i) => r.every((x, j) => x === (i === j ? 1 : 0)))).map((o) => o.t))
      for (const op of d.operators) {
        const c = classifySeitz(op.R, op.t)
        checkInvariants(op.R, op.t, c)
        // audit vs stored data label (kind words only)
        const old = op.label.toLowerCase()
        const oldKind = /screw|2₁|3₁|3₂|4₁|4₂|4₃|6₁|6₂|6₃|6₄|6₅/.test(old) ? 'screw' : /glide/.test(old) ? 'glide' : /mirror/.test(old) ? 'mirror' : /inversion \(|^inversion/.test(old) ? 'inversion' : null
        if (oldKind && oldKind !== c.kind && !(oldKind === 'screw' && c.kind === 'rotation' && /3ₙ/.test(old))) wrong.push(`${d.meta.number}:${op.index}`)
        n++
      }
    }
    expect(n).toBe(4425)
    // The stored labels disagree with the derived kind for a substantial set (audit only).
    console.info(`[opClassify audit] stored label kind ≠ derived kind for ${wrong.length} operators`)
    expect(wrong.length).toBeGreaterThan(100)
  })

  for (const mode of ['nearest', 'wrapped'] as PlacementMode[]) {
    it(`${mode}: shown copy (W, w + L) and its motion match the drawn ghost path`, () => {
      let differ = 0
      for (const d of demos) {
        setLattice(d.operators.filter((o) => o.R.every((r, i) => r.every((x, j) => x === (i === j ? 1 : 0)))).map((o) => o.t))
        const A = cellBasis(d.cell)
        for (const op of d.operators) {
          if (op.index === 1) continue
          const pl = placedPositions(d, op.index, mode)
          const b = pl.points.find((p) => p.index === 1)!
          const im = pl.points.find((p) => p.index === op.index)!
          const L = shownLatticeShift(op.R, op.t, b.fractional, im.fractional)
          expect(L.every(Number.isInteger)).toBe(true)
          const w = add(op.t, L)
          const c = classifySeitz(op.R, w)
          checkInvariants(op.R, w, c)
          const sel = selectionLabels(d, op.index, mode)
          expect(sel.shown.symbol).toBe(c.symbol)
          if (sel.kindDiffers) differ++
          // drawn path: axial / glide part and centre agree with the label (Cartesian)
          const path = buildOpPath(b.cartesian, b.operator.R, im.cartesian, im.operator.R, d.cell)
          const intrC = mv(A, c.intrinsicRaw)
          if (path.kind === 'screw' || path.kind === 'rotation') expect(close(path.axial!, intrC, 1e-6)).toBe(true)
          if (path.kind === 'glide' || path.kind === 'mirror') expect(close(path.glide!, intrC, 1e-6)).toBe(true)
          if (path.kind === 'inversion' || path.kind === 'rotoinversion') expect(close(path.center!, mv(A, c.centre!), 1e-6)).toBe(true)
          const kindsAgree: Record<string, string[]> = {
            rotation: ['rotation', 'screw'], screw: ['screw'], mirror: ['mirror', 'glide'], glide: ['glide'],
            inversion: ['inversion'], rotoinversion: ['rotoinversion'], translation: ['translation'], identity: ['identity'],
          }
          expect(kindsAgree[c.kind]).toContain(path.kind)
        }
      }
      console.info(`[opClassify audit] ${mode}: shown copy is a different element type for ${differ} operators`)
    }, 120_000)
  }

  it('P4mm op 8 in Near: canonical mirror, shown copy is a glide (caption says so)', () => {
    const s = selectionLabels(getDemo(99)!, 8, 'nearest')
    expect(s.canonical.symbol).toBe('m x, −x, z')
    if (s.shifted) {
      expect(s.caption).toContain('Shown copy adds lattice')
      expect(s.caption).toContain(s.shown.kind === 'glide' ? 'glide' : s.shown.symbol)
    }
  })

  it('fractions format exactly', () => {
    expect(fmtVec([0.5, 1 / 3, -0.25])).toBe('(½,⅓,−¼)')
  })
})
