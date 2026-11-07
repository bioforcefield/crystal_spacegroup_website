/**
 * Drawn symmetry elements are derived from the classified operations, not the
 * stored screwAxes / glidePlanes: every element is checked back against its
 * own (W, w), every listed operation has an element, the selected element is
 * the shown Near / Wrap copy's, and the reviewer's geometry cases are pinned.
 */
import { describe, expect, it } from 'vitest'
import { getDemo } from '../registry'
import { classifySeitz } from '../opClassify'
import { groupCentring } from '../elementClasses'
import { contextElements, contextElementsInRange, elementSymbol, type DisplayElement } from '../elementGeometry'
import { elementOverlay } from '../elementSelection'
import { selectionLabels } from '../opLabels'
import { placedPositions } from '../nearestImages'
import type { Mat3, Vec3 } from '../types'

const demos = Array.from({ length: 230 }, (_, i) => getDemo(i + 1)!)
const ap = (W: Mat3, t: Vec3, p: Vec3): Vec3 => [0, 1, 2].map((i) => W[i][0] * p[0] + W[i][1] * p[1] + W[i][2] * p[2] + t[i]) as Vec3
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const near = (a: Vec3, b: Vec3, tol = 1e-6) => a.every((x, i) => Math.abs(x - b[i]) < tol)
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const isInt = (x: number) => Math.abs(x - Math.round(x)) < 1e-6

describe('context elements, all 230 groups', () => {
  it.each(demos.map((d, i) => [i + 1, d] as const))('SG %i: derived from group operations, every op covered', (_n, d) => {
    const els = contextElements(d)
    const centring = groupCentring(d)
    const covered = new Set<number>()
    for (const e of els) {
      // Seitz pair is a coset member of a listed operation
      const op = d.operators.find(
        (o) => e.opIndices.includes(o.index) && JSON.stringify(o.R) === JSON.stringify(e.seitz.R) && sub(e.seitz.t, o.t).every(isInt),
      )
      expect(op, `element ${e.key} is not a coset member of its operations`).toBeTruthy()
      // independent re-classification with the group centring gives the same element type
      const c = classifySeitz(e.seitz.R, e.seitz.t, centring)
      expect(c.kind).toBe(e.cls.kind)
      expect(elementSymbol(c)).toBe(e.symbol)
      const { R, t } = e.seitz
      const g = e.geom
      if (g.type === 'axis') {
        for (const p of [g.p0, g.p1]) {
          expect(p.every((x) => x > -1e-6 && x < 1 + 1e-6)).toBe(true)
          const img = ap(R, t, p)
          if (c.kind === 'rotoinversion') expect(near(cross(sub(img, g.point), g.dir), [0, 0, 0])).toBe(true)
          else expect(near(sub(img, p), c.intrinsicRaw)).toBe(true)
        }
        if (c.kind === 'rotoinversion') expect(near(ap(R, t, e.centre!), e.centre!)).toBe(true)
      } else if (g.type === 'plane') {
        expect(g.poly.length).toBeGreaterThanOrEqual(3)
        for (const v of g.poly) {
          expect(Math.abs(v[0] * g.normal[0] + v[1] * g.normal[1] + v[2] * g.normal[2] - g.offset)).toBeLessThan(1e-6)
          expect(near(sub(ap(R, t, v), v), c.intrinsicRaw)).toBe(true)
        }
      } else {
        expect(near(ap(R, t, g.pos), g.pos)).toBe(true)
      }
      for (const i of e.opIndices) covered.add(i)
    }
    for (const op of d.operators) {
      const k = classifySeitz(op.R, op.t, centring).kind
      if (k === 'identity' || k === 'translation') continue
      expect(covered.has(op.index), `op ${op.index} has no drawn element`).toBe(true)
    }
  })
})

describe('translate range is sufficient', () => {
  it.each([52, 57, 88, 100, 142, 166, 194, 199, 220, 227, 230])('SG %i: n ∈ [−1,2]³ finds every element n ∈ [−2,3]³ does', (n) => {
    const d = getDemo(n)!
    const a = new Set(contextElements(d).map((e) => e.key))
    const b = new Set(contextElementsInRange(d, -2, 3).map((e) => e.key))
    expect([...b].filter((k) => !a.has(k))).toEqual([])
  })
})

describe('selected element is the shown copy, Near and Wrap, all 230 groups', () => {
  it.each(demos.map((d, i) => [i + 1, d] as const))('SG %i', (_n, d) => {
    for (const mode of ['nearest', 'wrapped'] as const) {
      for (const op of d.operators) {
        if (op.index === 1) continue
        const s = selectionLabels(d, op.index, mode)
        const ov = elementOverlay(d, op.index, mode)
        if (s.shown.kind === 'translation') {
          expect(ov.selected).toBeNull()
          continue
        }
        const sel = ov.selected!
        expect(sel, `op ${op.index} ${mode}`).toBeTruthy()
        expect(sel.symbol).toBe(elementSymbol(s.shown))
        expect(sel.classId).toBe(s.shownClass.id)
        expect(sel.color).toBe(s.shownClass.color)
        // the element's Seitz pair maps the drawn BASE onto the drawn IMAGE
        const pl = placedPositions(d, op.index, mode).points
        const base = pl.find((p) => p.index === 1)!.fractional
        const img = pl.find((p) => p.index === op.index)!.fractional
        expect(near(ap(sel.seitz.R, sel.seitz.t, base), img, 1e-5)).toBe(true)
        expect(ov.context.some((e) => e.key === sel.key)).toBe(false)
        if (ov.limited) expect(ov.context.every((e) => e.classId === sel.classId)).toBe(true)
      }
    }
  })
})

describe('reviewer geometry cases', () => {
  const find = (sg: number, pred: (e: DisplayElement) => boolean) => contextElements(getDemo(sg)!).filter(pred)
  const onAxis = (e: DisplayElement, p: Vec3, u: Vec3) =>
    e.geom.type === 'axis' && near(cross(sub(e.geom.point, p), u), [0, 0, 0]) && near(cross(e.geom.dir, u), [0, 0, 0])
  const onPlane = (e: DisplayElement, h: Vec3, d: number) =>
    e.geom.type === 'plane' && near(cross(e.geom.normal, h), [0, 0, 0]) &&
    e.geom.poly.every((v) => Math.abs(v[0] * h[0] + v[1] * h[1] + v[2] * h[2] - d) < 1e-6)
  it('Pnna: 2 ‖ c at ¼,0,z; 2 ‖ a at x,¼,¼; 2₁ ‖ b (no 2₁ ‖ a)', () => {
    expect(find(52, (e) => e.symbol === '2' && onAxis(e, [0.25, 0, 0], [0, 0, 1])).length).toBe(1)
    expect(find(52, (e) => e.symbol === '2' && onAxis(e, [0, 0.25, 0.25], [1, 0, 0])).length).toBe(1)
    expect(find(52, (e) => e.symbol === '2₁' && e.geom.type === 'axis' && near(cross(e.geom.dir, [0, 1, 0]), [0, 0, 0])).length).toBeGreaterThan(0)
    expect(find(52, (e) => e.symbol === '2₁' && e.geom.type === 'axis' && near(cross(e.geom.dir, [1, 0, 0]), [0, 0, 0])).length).toBe(0)
  })
  it('Pbcm: mirror z=¼, b-glide x=0', () => {
    expect(find(57, (e) => e.symbol === 'm' && onPlane(e, [0, 0, 1], 0.25)).length).toBe(1)
    expect(find(57, (e) => e.symbol === 'b' && onPlane(e, [1, 0, 0], 0)).length).toBe(1)
    expect(find(57, (e) => onPlane(e, [1, 0, 0], 0) && e.symbol === 'm').length).toBe(0)
  })
  it('P4₃: op 4 element is 4₃ at 0,0,z (not 4₁)', () => {
    const d = getDemo(78)!
    const e = contextElements(d).find((x) => x.opIndices.includes(4) && onAxis(x, [0, 0, 0], [0, 0, 1]))!
    expect(e.symbol).toBe('4₃')
  })
  it('P4bm: diagonal x,−x+½,z is a mirror; x,x,z a g-glide', () => {
    expect(find(100, (e) => e.symbol === 'm' && onPlane(e, [1, 1, 0], 0.5)).length).toBe(1)
    expect(find(100, (e) => e.symbol === 'g' && onPlane(e, [1, -1, 0], 0)).length).toBe(1)
  })
  it('I4₁/a: b-glide at z=⅛ (not an a-glide at ⅞ only)', () => {
    const els = find(88, (e) => onPlane(e, [0, 0, 1], 0.125))
    expect(els.map((e) => e.symbol)).toContain('b')
  })
  it('I4₁md / I-42d: glide vectors lie in their planes', () => {
    for (const sg of [109, 110, 122]) {
      for (const e of find(sg, (x) => x.cls.kind === 'glide')) {
        const h = (e.geom as { normal: Vec3 }).normal
        const g = e.glide!
        expect(Math.abs(h[0] * g[0] + h[1] * g[1] + h[2] * g[2])).toBeLessThan(1e-9)
      }
    }
  })
  it('F432 op 41 draws a rotation axis, not 2₁', () => {
    const d = getDemo(209)!
    const e = contextElements(d).find((x) => x.opIndices.includes(41))!
    expect(e.symbol).toBe('2')
  })
})
