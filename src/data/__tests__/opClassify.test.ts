/**
 * Derived operation labels: hand-checked ITA regressions, independent
 * invariant checks over all 230 groups (canonical op and the shown Near /
 * Wrap copy), locus strings evaluated back onto the element, and the motion
 * caption checked against the drawn opPath.
 */
import { describe, expect, it } from 'vitest'
import { getDemo } from '../registry'
import { classifySeitz, fmtVec, shownLatticeShift, type OpClassification } from '../opClassify'
import { opClass } from '../elementClasses'
import { selectionLabels } from '../opLabels'
import { placedPositions, type PlacementMode } from '../nearestImages'
import { buildOpPath } from '../opPath'
import { cellBasis } from '../math'
import type { Mat3, Vec3 } from '../types'

const demos = Array.from({ length: 230 }, (_, i) => getDemo(i + 1)!)
const sym = (sg: number, idx: number) => {
  const d = getDemo(sg)!
  return opClass(d, d.operators.find((o) => o.index === idx)!)
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

/*
 * Centred groups, hand-checked against ITA Vol. A (2016) by working the
 * Seitz pair by hand: the element type is reduced modulo Z³ + centring,
 * while the operation symbol keeps this coset member's own vector.
 */
describe('centred groups: element type modulo the full translation lattice', () => {
  const cases: [number, number, string, string, string][] = [
    // [sg, op, triplet, ITA operation symbol, element label]
    [209, 41, '-x,z+1/2,y+1/2', '2(0,½,½) 0, y, y', '2-fold rotation ‖ [011]'], // F: (0,½,½) is a lattice vector
    [209, 80, 'y+1/2,x+1/2,-z', '2(½,½,0) x, x, 0', '2-fold rotation ‖ [110]'],
    [199, 12, 'y+1/2,-z+1/2,-x', '3⁺(⅓,⅓,−⅓) x, x−⅙, −x+⅓', '3₂ screw ‖ [111̄]'], // I period along ⟨111⟩ is ½
    [197, 17, 'z+1/2,x+1/2,y+1/2', '3⁺(½,½,½) x, x, x', '3-fold rotation (3⁺) ‖ [111]'], // (½,½,½) = I centring
    [127, 8, 'y+1/2,x+1/2,-z', '2(½,½,0) x, x, 0', '2₁ screw ‖ [110]'], // P: diagonal 2₁
    [140, 24, 'y+1/2,x+1/2,-z', '2(½,½,0) x, x, 0', '2₁ screw ‖ [110]'], // I: (½,½,½) not ∥ [110]
    [76, 4, 'y,-x,z+3/4', '4⁻(0,0,¾) 0, 0, z', '4₁ screw ‖ c'],
    [78, 4, 'y,-x,z+1/4', '4⁻(0,0,¼) 0, 0, z', '4₃ screw ‖ c'],
    [52, 2, '-x+1/2,-y,z', '2 ¼, 0, z', '2-fold rotation ‖ c'],
    [52, 4, '-x+1/2,y+1/2,-z+1/2', '2(0,½,0) ¼, y, ¼', '2₁ screw ‖ b'],
    [64, 6, 'x+1/2,y,-z+1/2', 'a x, y, ¼', 'e-glide (double glide), plane x, y, ¼, glide (½,0,0)'], // Cmce
    [64, 14, 'x,y+1/2,-z+1/2', 'b x, y, ¼', 'e-glide (double glide), plane x, y, ¼, glide (½,0,0)'],
    [65, 14, 'x+1/2,y+1/2,-z', 'n(½,½,0) x, y, 0', 'mirror, plane x, y, 0'], // Cmmm: slide is the C vector
    [88, 15, 'x,y+1/2,-z+1/4', 'b x, y, ⅛', 'b-glide, plane x, y, ⅛, glide (0,½,0)'], // I4₁/a
    [109, 14, 'y+1/2,x,z+3/4', 'd(¼,¼,−¼) x, x−¼, z', 'd-glide, plane x, x−¼, z, glide (¼,¼,−¼)'], // I4₁md
    [122, 14, 'y+1/2,x,z+3/4', 'd(¼,¼,−¼) x, x−¼, z', 'd-glide, plane x, x−¼, z, glide (¼,¼,−¼)'], // I-42d
    [108, 14, 'y+1/2,x+1/2,z', 'g(½,½,0) x, x, z', 'c-glide, plane x, x, z, glide (0,0,½)'], // I4cm: ½[110] ≡ ½c mod I
    [166, 23, '-x+y+2/3,y+1/3,z+1/3', 'g(⅙,⅓,⅓) x, 2x−½, z', 'glide, plane x, 2x−½, z, glide (½,1,0)'], // hex ½[120]: g, not n
    [161, 10, '-y+2/3,-x+1/3,z+5/6', 'g(⅙,−⅙,−⅙) x, −x+½, z', 'n-glide, plane x, −x+½, z, glide (½,−½,½)'],
  ]
  for (const [sg, idx, triplet, symbol, label] of cases) {
    it(`SG ${sg} op ${idx} ${triplet} → ${label}`, () => {
      const op = getDemo(sg)!.operators.find((o) => o.index === idx)!
      expect(op.triplet.replace(/\s/g, '').replace(/−/g, '-').replace(/½/g, '1/2')).toBe(triplet)
      const c = sym(sg, idx)
      expect(c.symbol).toBe(symbol)
      expect(c.label).toBe(label)
    })
  }
  it('no screw is left with an unverified (vague) order in any group', () => {
    for (const d of demos) for (const op of d.operators) expect(opClass(d, op).label).not.toMatch(/^screw \(/)
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
/** Shortest group translation along integer u, as a fraction of u (rational scan). */
function periodOf(u: Vec3): number {
  for (let k = 1; k <= 12; k++) if (inGroupLattice(u.map((x) => (x * k) / 12) as Vec3)) return k / 12
  throw new Error('no period')
}
const dotI = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
/**
 * Independent glide-letter oracle (ITA Table 2.1.2.1) by brute force over
 * explicit candidate vectors: a/b/c half axes (two → e), n half the diagonal
 * of the plane's axis-preferring Z³ mesh with components 0/±½, d components
 * ±¼/±¾, else g. Membership is "differs by an in-plane group translation".
 */
function oracleLetter(h: Vec3, g: Vec3): string {
  const same = (v: Vec3) => dotI(h, v) === 0 && inGroupLattice(sub(g, v))
  const axes = [0, 1, 2].filter((i) => h[i] === 0 && same([0, 1, 2].map((k) => (k === i ? 0.5 : 0)) as Vec3))
  if (axes.length >= 2) return 'e'
  if (axes.length === 1) return 'abc'[axes[0]]
  // Z³ mesh: in-plane primitive vectors sorted by (non-zeros, length); v1 first, v2 the first making a unimodular cell.
  const vs: Vec3[] = []
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) {
    const v: Vec3 = [i, j, k]
    if (dotI(h, v) !== 0 || (!i && !j && !k)) continue
    const gg = [i, j, k].reduce((a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a })
    if (gg === 1) vs.push(v)
  }
  const nz = (v: Vec3) => v.filter((x) => x !== 0).length
  vs.sort((p, q) => nz(p) - nz(q) || dotI(p, p) - dotI(q, q))
  let mesh: [Vec3, Vec3] | null = null
  for (const a of vs) { for (const b of vs) {
    const cr: Vec3 = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
    if (close(cr, h) || close(cr, h.map((x) => -x) as Vec3)) { mesh = [a, b]; break }
  } if (mesh) break }
  const halfDiag = add(mesh![0], mesh![1]).map((x) => x / 2) as Vec3
  const halves: Vec3[] = []
  const quarters: Vec3[] = []
  const Q = [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75]
  for (const x of Q) for (const y of Q) for (const z of Q) {
    const v: Vec3 = [x, y, z]
    if (nz(v) < 2 || dotI(h, v) !== 0) continue
    if (v.every((t) => t === 0 || Math.abs(t) === 0.5)) halves.push(v)
    if (v.every((t) => t === 0 || Math.abs(t) === 0.25 || Math.abs(t) === 0.75)) quarters.push(v)
  }
  if (same(halfDiag) && halves.some(same)) return 'n'
  if (quarters.some(same)) return 'd'
  return 'g'
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
      // a screw iff the advance is not a group translation (Z³ + centring)
      expect(c.kind === 'screw').toBe(!inGroupLattice(c.intrinsicRaw))
      if (c.kind === 'screw') {
        // m/n of the axis period P (shortest group translation along u), turn positive about ±u
        expect(c.screwM).toBeGreaterThan(0)
        expect(c.screwM).toBeLessThan(c.order)
        const P = periodOf(c.axis!)
        const s = c.sense === '-' ? -1 : 1
        const want = c.axis!.map((x) => (s * x * P * c.screwM!) / c.order) as Vec3
        expect(inGroupLattice(sub(want, c.intrinsicRaw))).toBe(true)
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
      // mirror iff the slide is a group translation
      expect(c.kind === 'mirror').toBe(inGroupLattice(c.intrinsicRaw))
      // element glide vector ≡ raw slide modulo an in-plane group translation
      const dl = sub(c.intrinsicRaw, c.intrinsic)
      expect(inGroupLattice(dl)).toBe(true)
      expect(close(mv(W, dl), dl)).toBe(true)
      if (c.kind === 'glide') expect(c.glideLetter).toBe(oracleLetter(c.normal!, c.intrinsicRaw))
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
        const c = opClass(d, op)
        checkInvariants(op.R, op.t, c)
        // the bare Z³ classification must agree on everything but the element type
        const z = classifySeitz(op.R, op.t)
        expect(z.symbol).toBe(c.symbol)
        // audit vs stored data label (kind words only; informational)
        const old = op.label.toLowerCase()
        const oldKind = /screw|2₁|3₁|3₂|4₁|4₂|4₃|6₁|6₂|6₃|6₄|6₅/.test(old) ? 'screw' : /glide/.test(old) ? 'glide' : /mirror/.test(old) ? 'mirror' : /inversion \(|^inversion/.test(old) ? 'inversion' : null
        if (oldKind && oldKind !== c.kind) wrong.push(`${d.meta.number}:${op.index}`)
        n++
      }
    }
    expect(n).toBe(4425)
    console.info(`[opClassify audit] stored label kind ≠ derived kind for ${wrong.length} operators`)
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
          const L = shownLatticeShift(op.R, op.t, b.fractional, im.fractional)!
          expect(L.every(Number.isInteger)).toBe(true)
          const w = add(op.t, L)
          const c = classifySeitz(op.R, w, latticeT.slice(1))
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

  it('shownLatticeShift rejects a non-lattice residual', () => {
    const I: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    expect(shownLatticeShift(I, [0, 0, 0], [0.1, 0.2, 0.3], [1.1, 0.2, 0.3])).toEqual([1, 0, 0])
    expect(shownLatticeShift(I, [0, 0, 0], [0.1, 0.2, 0.3], [0.6, 0.2, 0.3])).toBeNull()
  })

  it('motion caption: turn sense and helix hand vs the axis nominal hand (P4₁ op 4)', () => {
    const s = selectionLabels(getDemo(76)!, 4, 'nearest')
    expect(s.canonical.short).toBe('4₁')
    expect(s.motion.lead).toContain('quarter-turn (−90°, 4⁻)')
    expect(s.motion.lead).toContain('left-handed helical path')
    expect(s.motion.pathHand).toBe('left')
    expect(s.motion.notes.join(' ')).toMatch(/4₁ axis, which is right-handed/)
    const r = selectionLabels(getDemo(76)!, 2, 'nearest')
    expect(r.motion.lead).toContain('quarter-turn (+90°, 4⁺)')
    expect(r.motion.pathHand).toBe('right')
  })
})
