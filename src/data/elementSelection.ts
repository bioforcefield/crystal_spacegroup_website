/**
 * Which derived elements an overlay draws for the current selection: the
 * shown copy's element (emphasised) plus the group's context elements.
 * Shared by the 3D cell, the 2D projection and the CIF map so they agree.
 */
import { classifyInGroup } from './elementClasses'
import { contextElements, selectedElement, type DisplayElement } from './elementGeometry'
import { placedPositions, type PlacementMode } from './nearestImages'
import { selectionLabels } from './opLabels'
import type { Mat3, SpaceGroupDemo, Vec3 } from './types'

/** Above this many elements in the cell, context is limited to the selected element's class. */
export const CONTEXT_CAP = 120

export interface ElementOverlay {
  selected: DisplayElement | null
  context: DisplayElement[]
  /** Total derived elements meeting the cell. */
  total: number
  /** True when context was limited (dense groups) to at most CONTEXT_CAP elements. */
  limited: boolean
  /** Accurate one-line note for a limited overlay ('' otherwise). */
  note: string
}

const centreOf = (e: DisplayElement): Vec3 => {
  const g = e.geom
  if (g.type === 'point') return g.pos
  if (g.type === 'axis') return [(g.p0[0] + g.p1[0]) / 2, (g.p0[1] + g.p1[1]) / 2, (g.p0[2] + g.p1[2]) / 2]
  const n = g.poly.length
  return g.poly.reduce((a, v) => [a[0] + v[0] / n, a[1] + v[1] / n, a[2] + v[2] / n], [0, 0, 0] as Vec3)
}
const dist2 = (a: Vec3, b: Vec3) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
/** Element family: type + symbol + orientation (e.g. all 4/m axes ‖ c). */
const familyOf = (e: DisplayElement) => {
  const g = e.geom
  const o = g.type === 'axis' ? g.dir : g.type === 'plane' ? g.normal : []
  return `${g.type}:${e.symbol}:${o.join(',')}`
}

/** Round-robin over families, each sorted nearest-first to `focus`, until `budget` elements. */
function boundedContext(els: DisplayElement[], focus: Vec3, budget: number): DisplayElement[] {
  const fam = new Map<string, DisplayElement[]>()
  for (const e of els) fam.set(familyOf(e), [...(fam.get(familyOf(e)) ?? []), e])
  const queues = [...fam.values()].map((l) => l.sort((a, b) => dist2(centreOf(a), focus) - dist2(centreOf(b), focus)))
  const out: DisplayElement[] = []
  for (let r = 0; out.length < budget; r++) {
    let any = false
    for (const q of queues) {
      if (r < q.length && out.length < budget) {
        out.push(q[r])
        any = true
      }
    }
    if (!any) break
  }
  return out
}

export function elementOverlay(
  demo: SpaceGroupDemo,
  selectedIndex: number,
  mode: PlacementMode = 'nearest',
  /** CIF map: classify this Seitz pair directly instead of the demo's listed op. */
  seitz?: { R: Mat3; t: Vec3 },
): ElementOverlay {
  const all = contextElements(demo)
  let selected: DisplayElement | null = null
  if (seitz) {
    const c = classifyInGroup(demo, seitz.R, seitz.t)
    selected = c.kind === 'identity' || c.kind === 'translation' ? null : selectedElement(c, selectedIndex, [], seitz)
  } else if (selectedIndex !== 1) {
    const s = selectionLabels(demo, selectedIndex, mode)
    // An unverified copy (see SelectionLabels.copyResidual) highlights nothing.
    if (!s.copyResidual) {
      const pl = placedPositions(demo, selectedIndex, mode)
      const around = pl.points.filter((p) => p.index === 1 || p.index === selectedIndex).map((p) => p.fractional)
      const t: Vec3 = [s.op.t[0] + s.shift[0], s.op.t[1] + s.shift[1], s.op.t[2] + s.shift[2]]
      selected = selectedElement(s.shown, selectedIndex, around, { R: s.op.R, t })
    }
  }
  const others = selected ? all.filter((e) => e.key !== selected!.key) : all
  const budget = CONTEXT_CAP - (selected ? 1 : 0)
  if (others.length <= budget) return { selected, context: others, total: all.length, limited: false, note: '' }
  let context: DisplayElement[]
  let how: string
  if (selected) {
    // Same class as the selection first (nearest to it), then other families.
    const focus = centreOf(selected)
    const same = others.filter((e) => e.classId === selected!.classId)
    context = boundedContext(same, focus, budget)
    if (context.length < budget) {
      const rest = others.filter((e) => e.classId !== selected!.classId)
      context = context.concat(boundedContext(rest, focus, budget - context.length))
    }
    how = 'the selected element, then the nearest elements of its class and of each other kind'
  } else {
    context = boundedContext(others, [0.5, 0.5, 0.5], budget)
    how = 'the elements of each kind nearest the cell centre'
  }
  const shown = context.length + (selected ? 1 : 0)
  return {
    selected,
    context,
    total: all.length,
    limited: true,
    note: `Showing ${shown} of ${all.length} symmetry elements in the cell: ${how}.`,
  }
}
