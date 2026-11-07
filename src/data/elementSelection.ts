/**
 * Which derived elements an overlay draws for the current selection: the
 * shown copy's element (emphasised) plus the group's context elements.
 * Shared by the 3D cell, the 2D projection and the CIF map so they agree.
 */
import { classifySeitz } from './opClassify'
import { groupCentring } from './elementClasses'
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
  /** True when context was limited to the selection's class for readability. */
  limited: boolean
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
    const c = classifySeitz(seitz.R, seitz.t, groupCentring(demo))
    selected = c.kind === 'identity' || c.kind === 'translation' ? null : selectedElement(c, selectedIndex, [], seitz)
  } else if (selectedIndex !== 1) {
    const s = selectionLabels(demo, selectedIndex, mode)
    const pl = placedPositions(demo, selectedIndex, mode)
    const around = pl.points.filter((p) => p.index === 1 || p.index === selectedIndex).map((p) => p.fractional)
    const t: Vec3 = [s.op.t[0] + s.shift[0], s.op.t[1] + s.shift[1], s.op.t[2] + s.shift[2]]
    selected = selectedElement(s.shown, selectedIndex, around, { R: s.op.R, t })
  }
  const limited = all.length > CONTEXT_CAP
  let context = limited ? all.filter((e) => selected && e.classId === selected.classId) : all
  if (selected) context = context.filter((e) => e.key !== selected!.key)
  return { selected, context, total: all.length, limited }
}
