import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useMemo,
  useState,
} from 'react'
import CellParamsBadge from './CellParamsBadge'
import type {
  CifColorMode,
  CifHBondMode,
  CifPlacementMode,
  CifThermalMode,
  CifVisibility,
} from './cifViewTypes'
import { operatorColor } from '../../data/cif/operatorColors'
import type { ExpandedStructure } from '../../data/cif/types'
import { describeCifStructure } from '../../data/a11y/structureSummary'
import type { SpaceGroupDemo } from '../../data/types'
import VisitCounter from '../VisitCounter'
import SupercellPicker from '../SupercellPicker'
import {
  baseFileName,
  downloadText,
  moleculeRecords,
  p1SupercellCif,
  sdf,
} from '../../data/cif/exportFormats'
import { supercellTranslations } from '../../data/supercell'
import { atomInfo, samePick, type AtomPick, type AtomInfo } from '../../data/cif/atomInfo'
import { fracToCart } from '../../data/math'
import { placeCifStructure } from '../../data/cif/placement'
import {
  measureOf,
  relateMolecules,
  resolvePick,
  SymCodes,
  type Measurement,
} from '../../data/cif/measureModel'
import type { SceneAnnotations } from './MeasureOverlay'
import type { Vec3 } from '../../data/types'
import {
  elementsPresent,
  equivalenceClasses,
  equivalenceColor,
  jmolColor,
} from '../../data/cif/colorSchemes'
import {
  CIF_ATOM_CAP,
  DEFAULT_MULTIPLES,
  setAxisCapped,
  type CellMultiples,
} from '../../data/supercell'

const CifStructureScene = lazy(() => import('../CifStructureScene'))

export interface CifViewportProps {
  structure: ExpandedStructure | null
  /** Original CIF text + file name (for Download). */
  sourceText?: string | null
  sourceName?: string | null
  selectedOp: number
  onSelectOp: (index: number) => void
  visibility: CifVisibility
  onVisibilityChange: (v: CifVisibility) => void
  placementMode: CifPlacementMode
  onPlacementModeChange: (m: CifPlacementMode) => void
  showSymmetryElements: boolean
  onToggleSymmetryElements: () => void
  canShowElements: boolean
  elementCount: number
  elementDemo: SpaceGroupDemo | null
  resetToken: number
  onResetView: () => void
  colorMode: CifColorMode
  onColorModeChange: (m: CifColorMode) => void
  thermalMode: CifThermalMode
  onThermalModeChange: (m: CifThermalMode) => void
  hbondMode: CifHBondMode
  onHBondModeChange: (m: CifHBondMode) => void
}

function displaySummary(
  thermalMode: CifThermalMode,
  hbondMode: CifHBondMode,
  hbondCount: number | undefined,
): string {
  const thermal =
    thermalMode === 'off'
      ? 'No thermal'
      : thermalMode === 'uiso'
        ? 'Uiso'
        : 'Ellipsoid'
  const hbond =
    hbondMode === 'off'
      ? 'No H-bonds'
      : hbondMode === 'links'
        ? `H-bonds${hbondCount ? ` · ${hbondCount}` : ''}`
        : 'Partners'
  return `${thermal} · ${hbond}`
}

export default function CifViewport({
  structure,
  sourceText = null,
  sourceName = null,
  selectedOp,
  onSelectOp,
  visibility,
  onVisibilityChange,
  placementMode,
  onPlacementModeChange,
  showSymmetryElements,
  onToggleSymmetryElements,
  canShowElements,
  elementCount,
  elementDemo,
  resetToken,
  onResetView,
  colorMode,
  onColorModeChange,
  thermalMode,
  onThermalModeChange,
  hbondMode,
  onHBondModeChange,
}: CifViewportProps) {
  const [viewOpen, setViewOpen] = useState(false)
  const [mult, setMult] = useState<{ s: ExpandedStructure | null; v: CellMultiples }>({
    s: null,
    v: DEFAULT_MULTIPLES,
  })
  const multiples: CellMultiples =
    structure && mult.s === structure ? mult.v : DEFAULT_MULTIPLES
  const perCell = structure?.atoms.length ?? 0

  // —— Atom inspection ——
  const [hover, setHover] = useState<{ pick: AtomPick; x: number; y: number } | null>(null)
  const [pin, setPin] = useState<{ s: ExpandedStructure; pick: AtomPick } | null>(null)
  const [hl, setHl] = useState<{ s: ExpandedStructure; el: string } | null>(null)
  const pinned = structure && pin?.s === structure ? pin.pick : null
  const highlightElement = structure && hl?.s === structure ? hl.el : null
  const placedPositions = useMemo(
    () =>
      structure
        ? placeCifStructure(structure, placementMode, selectedOp, elementDemo ?? null).positions
        : [],
    [structure, placementMode, selectedOp, elementDemo],
  )
  const infoFor = (p: AtomPick): AtomInfo | null => {
    if (!structure) return null
    const a = structure.atoms[p.ai]
    const pos = placedPositions[p.ai]
    if (!a || !pos) return null
    return atomInfo(
      a,
      pos as [number, number, number],
      p.t,
      structure.cell,
      structure.operators.find((o) => o.index === a.opIndex),
      (f) => fracToCart(f, structure.cell),
    )
  }
  const hoverInfo = hover && structure ? infoFor(hover.pick) : null
  const pinnedInfo = pinned ? infoFor(pinned) : null
  const hlList = useMemo(() => {
    if (!structure || !highlightElement) return []
    return structure.atoms
      .map((a, ai) => ({ a, ai }))
      .filter(({ a }) => a.element === highlightElement)
  }, [structure, highlightElement])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (measureOnRef.current && (e.key === 'Escape' || e.key === 'Backspace')) {
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        undoRef.current()
        return
      }
      if (e.key === 'Escape') {
        setPin(null)
        setHl(null)
        setHover(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  // —— Measure mode ——
  const [measureOn, setMeasureOn] = useState(false)
  const [mp, setMp] = useState<{ s: ExpandedStructure | null; picks: AtomPick[]; saved: AtomPick[][] }>({
    s: null,
    picks: [],
    saved: [],
  })
  const [showElement, setShowElement] = useState(true)
  const [copied, setCopied] = useState(false)
  const mPicks = structure && mp.s === structure ? mp.picks : []
  const mSaved = structure && mp.s === structure ? mp.saved : []
  const setPicks = (picks: AtomPick[], saved = mSaved) => structure && setMp({ s: structure, picks, saved })
  const measureModel = useMemo(() => {
    if (!structure) return null
    const pos = placedPositions as Vec3[]
    const codes = new SymCodes()
    const res = (ps: AtomPick[]) => ps.map((p) => resolvePick(structure, pos, p)).filter((x) => !!x)
    const saved = mSaved.map((ps) => measureOf(res(ps), codes)).filter((m): m is Measurement => !!m)
    const curAtoms = res(mPicks)
    curAtoms.forEach((a) => codes.code(a))
    const current = measureOf(curAtoms, codes)
    const relation = curAtoms.length >= 2 ? relateMolecules(structure, pos, curAtoms) : null
    return { codes, saved, current, curAtoms, relation, footnotes: codes.footnotes() }
  }, [structure, placedPositions, mPicks, mSaved])
  const supercellSpan = structure
    ? Math.max(structure.cell.a * multiples[0], structure.cell.b * multiples[1], structure.cell.c * multiples[2])
    : 10
  const annotations = useMemo<SceneAnnotations | null>(() => {
    if (!measureOn || !measureModel) return null
    const ann: SceneAnnotations = { markers: [], lines: [], labels: [], element: null }
    const V = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
    const D = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
    const N = (a: Vec3): Vec3 => {
      const n = Math.hypot(...a) || 1
      return [a[0] / n, a[1] / n, a[2] / n]
    }
    const draw = (m: Measurement, color: string) => {
      const p = m.atoms.map((a) => a.cart)
      ann.lines.push({ points: p, color })
      let lp: Vec3
      if (m.kind === 'distance') lp = V(p[0]!, D(p[1]!, p[0]!), 0.5)
      else if (m.kind === 'angle') {
        const u = N(D(p[0]!, p[1]!))
        const w = N(D(p[2]!, p[1]!))
        const r = 0.6
        const arc: Vec3[] = []
        for (let i = 0; i <= 16; i++) {
          const f = i / 16
          arc.push(V(p[1]!, N(V(V([0, 0, 0], u, 1 - f), w, f)), r))
        }
        ann.lines.push({ points: arc, color, dashed: false, width: 2 })
        lp = V(p[1]!, N(V(u, w)), 1.05)
      } else lp = V(V(p[1]!, D(p[2]!, p[1]!), 0.5), [0, 0.35, 0])
      const val = m.text.slice(m.text.lastIndexOf('  ') + 2)
      ann.labels.push({ pos: lp, text: val, color })
    }
    measureModel.saved.forEach((m) => draw(m, '#93c5fd'))
    if (measureModel.current) draw(measureModel.current, '#fbbf24')
    measureModel.curAtoms.forEach((a) =>
      ann.markers.push({ pos: a.cart, r: 0.42, color: '#fbbf24' }),
    )
    const rel = measureModel.relation
    if (rel && showElement) {
      const e = rel.element
      const m = V(rel.centroidA, D(rel.centroidB, rel.centroidA), 0.5)
      const L = supercellSpan * 0.75
      if ((e.kind === 'inversion' || e.kind === 'rotoinversion') && e.pointCart)
        ann.element = { kind: 'point', p: e.pointCart, color: '#f472b6' }
      if (e.kind === 'rotoinversion' && e.pointCart && e.axisCart)
        ann.lines.push({ points: [V(e.pointCart, e.axisCart, -L), V(e.pointCart, e.axisCart, L)], color: '#f472b6', dashed: false, width: 3 })
      if ((e.kind === 'rotation' || e.kind === 'screw') && e.pointCart && e.axisCart) {
        const q = V(e.pointCart, e.axisCart, (D(m, e.pointCart)[0] * e.axisCart[0] + D(m, e.pointCart)[1] * e.axisCart[1] + D(m, e.pointCart)[2] * e.axisCart[2]))
        ann.element = { kind: 'line', a: V(q, e.axisCart, -L), b: V(q, e.axisCart, L), color: '#34d399' }
      }
      if ((e.kind === 'mirror' || e.kind === 'glide') && e.pointCart && e.normalCart) {
        const n = e.normalCart
        const dd = D(m, e.pointCart)
        const c = V(m, n, -(dd[0] * n[0] + dd[1] * n[1] + dd[2] * n[2]))
        ann.element = { kind: 'plane', center: c, normal: n, size: L * 1.6, color: '#a78bfa' }
      }
      if (e.kind === 'translation')
        ann.lines.push({ points: [rel.centroidA, rel.centroidB], color: '#e2e8f0', dashed: false, width: 3 })
      ann.labels.push({ pos: V(m, [0, 0.6, 0]), text: e.symbol, color: '#f9a8d4' })
    }
    return ann
  }, [measureOn, measureModel, showElement, supercellSpan])
  const measureText = () => {
    if (!measureModel) return ''
    const all = [...measureModel.saved, ...(measureModel.current ? [measureModel.current] : [])]
    const lines = all.map((m) => m.text)
    if (measureModel.footnotes.length) lines.push('', 'Symmetry codes:', ...measureModel.footnotes)
    if (measureModel.relation)
      lines.push('', `Molecule pair: ${measureModel.relation.triplet}`, ...measureModel.relation.element.lines)
    return lines.join('\n')
  }
  const measureBtn = (
    <button
      type="button"
      className={`btn${measureOn ? ' btn-primary' : ''}`}
      onClick={() => {
        setMeasureOn((o) => !o)
        setPin(null)
      }}
      disabled={!structure}
      aria-pressed={measureOn}
      title="Measure distances, angles and torsions; pick atoms on two molecules to get the symmetry element relating them"
    >
      Measure{measureOn ? ' · on' : ''}
    </button>
  )
  const measureOnRef = useRef(false)
  measureOnRef.current = measureOn
  const undoRef = useRef(() => {})
  undoRef.current = () => {
    if (mPicks.length) setPicks(mPicks.slice(0, -1))
  }
  const toggleHighlight = (el: string) =>
    structure && setHl(highlightElement === el ? null : { s: structure, el })
  const showPanel = !!structure && (!!pinnedInfo || !!highlightElement || measureOn)

  // —— Download ——
  const [dlOpen, setDlOpen] = useState(false)
  const doDownload = (kind: 'cif' | 'sdf-au' | 'sdf-cell' | 'sdf-view' | 'p1') => {
    setDlOpen(false)
    if (!structure) return
    const base = baseFileName(undefined, sourceName ? sourceName.replace(/\s*\(.*?\)/g, '') : undefined)
    const disp = structure.atoms.map((a) => a.displayCartesian as [number, number, number])
    const inView = (ai: number) => {
      const a = structure.atoms[ai]!
      if (visibility === 'asymmetric') return a.opIndex === 1
      if (visibility === 'selected') return a.opIndex === 1 || a.opIndex === selectedOp
      return true
    }
    const ts = supercellTranslations(multiples)
    const mtag = multiples.join('x')
    if (kind === 'cif') {
      if (sourceText) downloadText(sourceText, `${base}.cif`, 'chemical/x-cif')
      return
    }
    if (kind === 'p1') {
      downloadText(
        p1SupercellCif(structure, placedPositions as [number, number, number][], inView, multiples, ts, base),
        `${base}_P1_${mtag}.cif`,
        'chemical/x-cif',
      )
      return
    }
    const recs =
      kind === 'sdf-au'
        ? moleculeRecords(structure, disp, (ai) => structure.atoms[ai]!.opIndex === 1, undefined, base)
        : kind === 'sdf-cell'
          ? moleculeRecords(structure, disp, () => true, undefined, base)
          : moleculeRecords(structure, placedPositions as [number, number, number][], inView, ts, base)
    const suffix = kind === 'sdf-au' ? 'asu' : kind === 'sdf-cell' ? 'cell' : `view_${mtag}`
    downloadText(sdf(recs), `${base}_${suffix}.sdf`, 'chemical/x-mdl-sdfile')
  }
  const downloadMenu = (
    <div className="cif-download-wrap">
      <button
        type="button"
        className={`btn${dlOpen ? ' btn-primary' : ''}`}
        onClick={() => setDlOpen((o) => !o)}
        disabled={!structure}
        aria-expanded={dlOpen}
        aria-haspopup="menu"
      >
        Download ▾
      </button>
      {dlOpen && structure && (
        <div className="cif-download-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => doDownload('cif')} disabled={!sourceText}>
            CIF — original file
          </button>
          <button type="button" role="menuitem" onClick={() => doDownload('sdf-au')}>
            SDF — asymmetric unit
          </button>
          <button type="button" role="menuitem" onClick={() => doDownload('sdf-cell')}>
            SDF — unit cell (whole molecules)
          </button>
          <button type="button" role="menuitem" onClick={() => doDownload('sdf-view')}>
            SDF — current view ({multiples.join('×')})
          </button>
          <button type="button" role="menuitem" onClick={() => doDownload('p1')}>
            CIF — P1 supercell ({multiples.join('×')})
          </button>
        </div>
      )}
    </div>
  )
  const eqInfo = useMemo(() => {
    if (!structure) return { count: 0, labels: [] as string[] }
    const { classOf, count } = equivalenceClasses(structure.atoms)
    const labels: string[] = []
    structure.atoms.forEach((a, i) => {
      const k = classOf[i]!
      if (a.opIndex === 1 && labels[k] == null) labels[k] = a.residue ?? ""
    })
    return { count, labels }
  }, [structure])
  const [displayOpen, setDisplayOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const viewToggleRef = useRef<HTMLButtonElement>(null)
  const viewSheetRef = useRef<HTMLDivElement>(null)
  const displayToggleRef = useRef<HTMLButtonElement>(null)
  const displaySheetRef = useRef<HTMLDivElement>(null)
  const prevOpenRef = useRef(false)
  const prevDisplayRef = useRef(false)

  useEffect(() => {
    if (!viewOpen) {
      if (prevOpenRef.current) {
        viewToggleRef.current?.focus()
      }
      prevOpenRef.current = false
      return
    }
    prevOpenRef.current = true
    const sheet = viewSheetRef.current
    const focusables = () =>
      sheet
        ? Array.from(
            sheet.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => !el.hasAttribute('disabled'))
        : []
    const id = window.setTimeout(() => {
      const list = focusables()
      ;(list[0] ?? sheet)?.focus()
    }, 0)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setViewOpen(false)
        return
      }
      if (e.key !== 'Tab' || !sheet) return
      const list = focusables()
      if (list.length === 0) return
      const first = list[0]!
      const last = list[list.length - 1]!
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !sheet.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('keydown', onKey)
    }
  }, [viewOpen])

  useEffect(() => {
    if (!displayOpen) {
      if (prevDisplayRef.current) {
        displayToggleRef.current?.focus()
      }
      prevDisplayRef.current = false
      return
    }
    prevDisplayRef.current = true
    const sheet = displaySheetRef.current
    const id = window.setTimeout(() => {
      const first = sheet?.querySelector<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      ;(first ?? sheet)?.focus()
    }, 0)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setDisplayOpen(false)
      }
    }
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        displaySheetRef.current?.contains(t) ||
        displayToggleRef.current?.contains(t)
      ) {
        return
      }
      setDisplayOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [displayOpen])

  const applyTeachingView = () => {
    onPlacementModeChange('nearest')
    onVisibilityChange('molecules')
    onColorModeChange('operator')
    onThermalModeChange('off')
    onHBondModeChange('off')
    if (canShowElements && !showSymmetryElements) {
      onToggleSymmetryElements()
    }
    setDisplayOpen(false)
  }

  const hbondLive =
    hbondMode === 'off'
      ? 'H-bond contacts hidden'
      : hbondMode === 'links'
        ? `H-bond contacts shown${structure?.hbonds?.length ? `, ${structure.hbonds.length} contacts` : ''}`
        : `H-bond partner highlighting on${structure?.hbonds?.length ? `, ${structure.hbonds.length} contacts` : ''}`

  const canvasLabel = structure
    ? describeCifStructure(structure)
    : 'Crystal structure 3D view. Upload a CIF to begin.'

  const displayLabel = displaySummary(
    thermalMode,
    hbondMode,
    structure?.hbonds?.length,
  )

  const thermalControls = (
    <div className="segmented" role="group" aria-label="Thermal displacement">
      <button
        type="button"
        className={thermalMode === 'off' ? 'seg active' : 'seg'}
        onClick={() => onThermalModeChange('off')}
        aria-pressed={thermalMode === 'off'}
        title="Hide thermal displacement parameters (No U)"
      >
        No thermal
      </button>
      <button
        type="button"
        className={thermalMode === 'uiso' ? 'seg active' : 'seg'}
        onClick={() => onThermalModeChange('uiso')}
        aria-pressed={thermalMode === 'uiso'}
        title="Scale ball radius by Uiso when present"
      >
        Uiso
      </button>
      <button
        type="button"
        className={thermalMode === 'ellipsoid' ? 'seg active' : 'seg'}
        onClick={() => onThermalModeChange('ellipsoid')}
        aria-pressed={thermalMode === 'ellipsoid'}
        title="Draw anisotropic ellipsoids when Uij present; else Uiso balls"
      >
        Ellipsoid
      </button>
    </div>
  )

  const hbondControls = (
    <div className="segmented" role="group" aria-label="H-bond contacts">
      <button
        type="button"
        className={hbondMode === 'off' ? 'seg active' : 'seg'}
        onClick={() => onHBondModeChange('off')}
        aria-pressed={hbondMode === 'off'}
        title="Hide H-bond contacts"
      >
        No H-bonds
      </button>
      <button
        type="button"
        className={hbondMode === 'links' ? 'seg active' : 'seg'}
        onClick={() => onHBondModeChange('links')}
        aria-pressed={hbondMode === 'links'}
        disabled={!structure?.hbonds?.length}
        title="Dashed H···A contacts (pink = cross-operator)"
      >
        H-bonds{structure?.hbonds?.length ? ` · ${structure.hbonds.length}` : ''}
      </button>
      <button
        type="button"
        className={hbondMode === 'partners' ? 'seg active' : 'seg'}
        onClick={() => onHBondModeChange('partners')}
        aria-pressed={hbondMode === 'partners'}
        disabled={!structure?.hbonds?.length}
        title="Show H-bonds and dim molecules not partnered with the asymmetric unit"
      >
        Partners
      </button>
    </div>
  )

  const visibilityControls = (compact: boolean) => (
    <div className="segmented" role="group" aria-label="Copy visibility">
      <button
        type="button"
        className={visibility === 'molecules' ? 'seg active' : 'seg'}
        onClick={() => onVisibilityChange('molecules')}
        aria-pressed={visibility === 'molecules'}
        title="Show intact molecules (one copy per operator)"
      >
        Molecules
      </button>
      <button
        type="button"
        className={visibility === 'all' ? 'seg active' : 'seg'}
        onClick={() => onVisibilityChange('all')}
        aria-pressed={visibility === 'all'}
        title="Show all symmetry copies"
      >
        {compact ? 'All' : 'All copies'}
      </button>
      <button
        type="button"
        className={visibility === 'selected' ? 'seg active' : 'seg'}
        onClick={() => onVisibilityChange('selected')}
        aria-pressed={visibility === 'selected'}
        title="BASE + IMAGE — asymmetric unit and the selected operator copy"
      >
        Selected pair
      </button>
      <button
        type="button"
        className={visibility === 'asymmetric' ? 'seg active' : 'seg'}
        onClick={() => onVisibilityChange('asymmetric')}
        aria-pressed={visibility === 'asymmetric'}
        title="Asymmetric unit only (AU)"
      >
        {compact ? 'Asym. unit' : 'Asym. unit'}
      </button>
    </div>
  )

  const colorOptions: { mode: CifColorMode; label: string; title: string }[] = [
    { mode: 'operator', label: 'Symmetry op', title: 'Color by symmetry operation that generated each copy (default)' },
    { mode: 'element', label: 'Element', title: 'CPK / Jmol element colors; bonds half-colored' },
    { mode: 'equivalence', label: 'Equivalence', title: 'Each independent molecule in the asymmetric unit gets a color; its symmetry copies share it' },
    { mode: 'residue', label: 'Residue', title: 'Color by residue / component id when present' },
  ]
  const colorControls = (
    <div className="segmented cif-color-by" role="group" aria-label="Color by">
      <span className="cif-color-by-label" aria-hidden="true">Color by</span>
      {colorOptions.map((o) => (
        <button
          key={o.mode}
          type="button"
          className={colorMode === o.mode ? 'seg active' : 'seg'}
          onClick={() => onColorModeChange(o.mode)}
          aria-pressed={colorMode === o.mode}
          title={o.title}
        >
          {o.label}
        </button>
      ))}
    </div>
  )

  const symmetryButton = (
    <button
      type="button"
      className={`btn${showSymmetryElements && canShowElements ? ' btn-primary' : ''}`}
      onClick={onToggleSymmetryElements}
      disabled={!structure || !canShowElements}
      aria-pressed={showSymmetryElements && canShowElements}
      title={
        !structure
          ? 'Load a CIF first'
          : !elementDemo
            ? 'Needs a resolvable space-group number (1–230)'
            : elementCount === 0
              ? 'No drawable loci for this group yet (operators still listed)'
              : showSymmetryElements
                ? 'Hide screw / glide / inversion overlays'
                : 'Show screw / glide / inversion overlays'
      }
    >
      Symmetry elements
      {canShowElements
        ? showSymmetryElements
          ? ' · on'
          : ' · off'
        : ''}
    </button>
  )

  return (
    <main className="viewport">
      <div className="viewport-toolbar">
        <div className="legend-stack" aria-label="Legend">
          <div className="cif-chrome-label">Legend</div>
          <div className="legend class-legend">
            {structure && colorMode === 'element' ? (
              elementsPresent(structure.atoms).map((el) => (
                <button
                  key={el}
                  type="button"
                  className={`legend-item cif-legend-op${highlightElement === el ? ' active' : ''}`}
                  onClick={() => toggleHighlight(el)}
                  aria-pressed={highlightElement === el}
                  title={`Highlight all ${el} atoms and list them`}
                >
                  <span className="swatch" style={{ background: jmolColor(el) }} />
                  {el}
                </button>
              ))
            ) : structure && colorMode === 'equivalence' ? (
              Array.from({ length: eqInfo.count }, (_, k) => (
                <span key={k} className="legend-item">
                  <span className="swatch" style={{ background: equivalenceColor(k) }} />
                  Mol {k + 1}
                  {eqInfo.labels[k] ? ` · ${eqInfo.labels[k]}` : ''}
                </span>
              ))
            ) : structure && colorMode === 'residue' ? (
              <span className="legend-item muted">Residue / component colors</span>
            ) : structure ? (
              structure.operators.slice(0, 12).map((op) => (
                <button
                  key={op.index}
                  type="button"
                  className={`legend-item cif-legend-op${op.index === selectedOp ? ' active' : ''}`}
                  onClick={() => onSelectOp(op.index)}
                  title={op.triplet}
                  aria-pressed={op.index === selectedOp}
                  aria-label={`Operator ${op.index}${op.index === 1 ? ' asymmetric unit' : ''}: ${op.triplet}`}
                >
                  <span
                    className="swatch"
                    style={{ background: operatorColor(op.index) }}
                  />
                  op {op.index}
                  {op.index === 1 ? ' (AU)' : ''}
                  <span className="cif-legend-triplet">{op.triplet}</span>
                </button>
              ))
            ) : (
              <span className="legend-item muted">
                Upload a CIF to map intact molecules by symmetry operator
              </span>
            )}
            {structure && colorMode === 'operator' && structure.operators.length > 12 && (
              <span className="legend-item muted">
                +{structure.operators.length - 12} more
              </span>
            )}
          </div>
          {structure && (
            <div className="cif-legend-help">
              <button
                type="button"
                className="cif-help-toggle"
                aria-expanded={helpOpen}
                onClick={() => setHelpOpen((o) => !o)}
              >
                {helpOpen ? 'Hide tip' : 'How to read'}
              </button>
              {helpOpen && (
                <p className="legend chirality cif-help-tip">
                  Ball ≈ element · tint ≈ operator · bonds keep each molecule
                  intact (min-image unwrap)
                  {canShowElements && showSymmetryElements
                    ? ' · overlays: screws / glides / inversions / mirrors'
                    : ''}
                </p>
              )}
            </div>
          )}
          {elementDemo && showSymmetryElements && canShowElements && (
            <div
              className="legend elements-legend"
              aria-label="Symmetry element classes"
            >
              {elementDemo.classLegendOrder
                .filter((id) => id !== 'identity')
                .map((id) => {
                  const cls = elementDemo.symmetryClasses[id]
                  if (!cls) return null
                  return (
                    <span key={id} className="legend-item">
                      <span
                        className="swatch"
                        style={{ background: cls.color }}
                      />
                      {cls.label}
                    </span>
                  )
                })}
              {elementDemo.geometryLimited && (
                <span
                  className="legend-item muted"
                  title={elementDemo.geometryNote}
                >
                  limited geometry
                </span>
              )}
            </div>
          )}
        </div>

        <div className="toolbar-actions cif-toolbar-actions" aria-label="Actions">
          <div className="cif-chrome-label cif-chrome-label-actions">Actions</div>
          {/* Always one-tap: Near/Cell + Molecules (phone) */}
          <div className="cif-toolbar-primary">
            <div className="segmented" role="group" aria-label="Motif placement">
              <button
                type="button"
                className={placementMode === 'nearest' ? 'seg active' : 'seg'}
                onClick={() => onPlacementModeChange('nearest')}
                aria-pressed={placementMode === 'nearest'}
                title="Place molecules near the selected element (may leave the cell)"
              >
                <span className="label-full">Nearest images</span>
                <span className="label-short">Near</span>
              </button>
              <button
                type="button"
                className={placementMode === 'wrapped' ? 'seg active' : 'seg'}
                onClick={() => onPlacementModeChange('wrapped')}
                aria-pressed={placementMode === 'wrapped'}
                title="Wrap every atom into the unit cell [0,1)³"
              >
                <span className="label-full">In cell</span>
                <span className="label-short">Wrap</span>
              </button>
            </div>
            <div
              className="segmented cif-vis-primary"
              role="group"
              aria-label="Molecule visibility"
            >
              <button
                type="button"
                className={visibility === 'molecules' ? 'seg active' : 'seg'}
                onClick={() => onVisibilityChange('molecules')}
                aria-pressed={visibility === 'molecules'}
              >
                Molecules
              </button>
            </div>
            <button
              type="button"
              ref={viewToggleRef}
              className={`btn cif-view-toggle${viewOpen ? ' btn-primary' : ''}`}
              onClick={() => {
                setViewOpen((o) => !o)
                setDisplayOpen(false)
              }}
              aria-expanded={viewOpen}
              aria-controls="cif-view-sheet"
            >
              View{viewOpen ? ' · close' : ''}
            </button>
          </div>

          {/* Desktop: visibility, symmetry, color, Display, Teaching, Reset */}
          <div className="cif-toolbar-secondary cif-toolbar-desktop-only">
            {visibilityControls(false)}
            {symmetryButton}
            {colorControls}
            <div className="cif-display-wrap">
              <button
                type="button"
                ref={displayToggleRef}
                className={`btn cif-display-toggle${displayOpen ? ' btn-primary' : ''}`}
                onClick={() => setDisplayOpen((o) => !o)}
                aria-expanded={displayOpen}
                aria-controls="cif-display-sheet"
                title={`Display options (${displayLabel})`}
              >
                Display{displayOpen ? ' · close' : ''}
              </button>
              {displayOpen && (
                <div
                  id="cif-display-sheet"
                  className="cif-display-sheet"
                  role="dialog"
                  aria-label="Display options"
                  tabIndex={-1}
                  ref={displaySheetRef}
                >
                  <div className="cif-display-section-label">Thermal</div>
                  {thermalControls}
                  <div className="cif-display-section-label">H-bonds</div>
                  {hbondControls}
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn"
              onClick={applyTeachingView}
              disabled={!structure}
              title="Molecules + Nearest + Symmetry on + By operator; thermal and H-bonds off"
            >
              Teaching view
            </button>
            <button
              type="button"
              className="btn"
              onClick={onResetView}
              disabled={!structure}
            >
              Reset view
            </button>
            {measureBtn}
            {downloadMenu}
          </div>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {structure ? hbondLive : ''}
        </p>

        {/* Phone View sheet */}
        {viewOpen && (
          <div
            id="cif-view-sheet"
            className="cif-view-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="View options"
            tabIndex={-1}
            ref={viewSheetRef}
          >
            {visibilityControls(true)}
            {colorControls}
            <div className="cif-view-sheet-actions">
              {symmetryButton}
              <button
                type="button"
                className="btn"
                onClick={applyTeachingView}
                disabled={!structure}
                title="Molecules + Nearest + Symmetry on + By operator; advanced off"
              >
                Teaching view
              </button>
              <button
                type="button"
                className="btn"
                onClick={onResetView}
                disabled={!structure}
              >
                Reset view
              </button>
              {measureBtn}
            {downloadMenu}
            </div>
            <div className="cif-display-section-label">Display</div>
            {thermalControls}
            {hbondControls}
          </div>
        )}
      </div>

      {structure && (
        <div className="cif-op-chips" role="toolbar" aria-label="Operators (touch)">
          {structure.operators.map((op) => (
            <button
              key={op.index}
              type="button"
              className={`op-chip${op.index === selectedOp ? ' active' : ''}${op.index === 1 ? ' is-base' : ''}`}
              style={{ ['--op-color' as string]: operatorColor(op.index) }}
              onClick={() => onSelectOp(op.index)}
              title={op.triplet}
              aria-pressed={op.index === selectedOp}
              aria-label={`Operator ${op.index}: ${op.triplet}`}
            >
              <span className="op-chip-swatch" />
              <span className="op-chip-label">
                {op.index}. {op.triplet}
              </span>
            </button>
          ))}
        </div>
      )}

      {structure && (
        <CellParamsBadge cell={structure.cell} variant="strip" />
      )}

      {structure && (
        <SupercellPicker
          id="cif-supercell"
          multiples={multiples}
          onAxis={(axis, n) =>
            setMult({ s: structure, v: setAxisCapped(multiples, axis, n, perCell, CIF_ATOM_CAP) })
          }
          onReset={() => {
            setMult({ s: structure, v: DEFAULT_MULTIPLES })
            onResetView()
          }}
          perCell={perCell}
          cap={CIF_ATOM_CAP}
          unit="atoms"
        />
      )}

      <div className={`viewport-body cif-viewport-body${showPanel ? ' has-atom-panel' : ''}`}>
        <div
          id="demo-main"
          className="canvas-wrap"
          role="img"
          aria-label={canvasLabel}
          tabIndex={-1}
        >
          {structure ? (
            <Suspense
              fallback={
                <div className="cif-empty">
                  <p>Loading 3D view…</p>
                </div>
              }
            >
              <CifStructureScene
                structure={structure}
                selectedOp={selectedOp}
                visibility={visibility}
                placementMode={placementMode}
                resetToken={resetToken}
                elementDemo={elementDemo}
                showSymmetryElements={
                  showSymmetryElements && canShowElements
                }
                colorMode={colorMode}
                thermalMode={thermalMode}
                hbondMode={hbondMode}
                multiples={multiples}
                onAtomHover={(pick, x, y) => setHover(pick ? { pick, x, y } : null)}
                annotations={annotations}
                onAtomPick={(pick) => {
                  if (measureOn) {
                    const last = mPicks[mPicks.length - 1]
                    if (samePick(last ?? null, pick)) return
                    setPicks(mPicks.length >= 4 ? [pick] : [...mPicks, pick])
                    setHover(null)
                    return
                  }
                  setPin(samePick(pick, pinned) ? null : { s: structure, pick })
                  setHover(null)
                }}
                pinnedAtom={pinned}
                highlightElement={highlightElement}
              />
            </Suspense>
          ) : (
            <div className="cif-empty">
              <p>
                Drop in a <code>.cif</code> from CSD or COD, or load the
                teaching sample, to see intact molecules colored by symmetry
                operator.
              </p>
            </div>
          )}
        </div>
        {showPanel && (
          <aside className="cif-atom-panel" aria-label="Atom details">
            <div className="cif-atom-panel-head">
              <span className="cif-chrome-label">Atom details</span>
              <button
                type="button"
                className="btn btn-small"
                onClick={() => {
                  setPin(null)
                  setHl(null)
                  setMeasureOn(false)
                }}
                aria-label="Close atom details (Esc)"
                title="Close (Esc)"
              >
                ×
              </button>
            </div>
            {measureOn && measureModel && (
              <div className="cif-measure">
                <div className="cif-measure-hint">
                  Click 2 atoms → distance, 3 → angle, 4 → torsion. Atoms on two molecules → their
                  symmetry element. Esc / ⌫ undoes the last pick.
                </div>
                {measureModel.curAtoms.length > 0 && (
                  <div className="cif-measure-current">
                    <div className="cif-measure-names">
                      {measureModel.curAtoms.map((a) => measureModel.codes.name(a)).join(' – ')}
                    </div>
                    {measureModel.current && (
                      <div className="cif-measure-value">
                        {measureModel.current.kind}:{' '}
                        <b>{measureModel.current.text.slice(measureModel.current.text.lastIndexOf('  ') + 2)}</b>
                      </div>
                    )}
                    <div className="cif-measure-btns">
                      <button
                        type="button"
                        className="btn btn-small"
                        disabled={!measureModel.current}
                        onClick={() => setPicks([], [...mSaved, mPicks])}
                      >
                        Save
                      </button>
                      <button type="button" className="btn btn-small" onClick={() => setPicks(mPicks.slice(0, -1))}>
                        Undo
                      </button>
                      <button type="button" className="btn btn-small" onClick={() => setPicks([])}>
                        Clear picks
                      </button>
                    </div>
                  </div>
                )}
                {measureModel.relation && (
                  <div className="cif-measure-relation">
                    <div className="cif-chrome-label">Molecule A → B</div>
                    <div className="mono">{measureModel.relation.triplet}</div>
                    {measureModel.relation.note && <div className="muted">{measureModel.relation.note}</div>}
                    {measureModel.relation.element.lines.map((l, i) => (
                      <div key={i} className={i === 0 ? 'cif-rel-head' : 'mono cif-rel-line'}>
                        {l}
                      </div>
                    ))}
                    <label className="cif-rel-show">
                      <input type="checkbox" checked={showElement} onChange={(e) => setShowElement(e.target.checked)} />{' '}
                      Show element in 3D
                    </label>
                  </div>
                )}
                {measureModel.saved.length > 0 && (
                  <ul className="cif-measure-list">
                    {measureModel.saved.map((m, i) => (
                      <li key={i}>
                        <span className="mono">{m.text}</span>
                        <button
                          type="button"
                          className="btn btn-small"
                          aria-label="Delete measurement"
                          onClick={() => setPicks(mPicks, mSaved.filter((_, j) => j !== i))}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {measureModel.footnotes.length > 0 && (
                  <div className="cif-measure-foot mono">
                    {measureModel.footnotes.map((f) => (
                      <div key={f}>{f}</div>
                    ))}
                  </div>
                )}
                <div className="cif-measure-btns">
                  <button
                    type="button"
                    className="btn btn-small"
                    disabled={!measureModel.saved.length && !measureModel.current}
                    onClick={() => {
                      void navigator.clipboard?.writeText(measureText()).then(() => {
                        setCopied(true)
                        setTimeout(() => setCopied(false), 1200)
                      })
                    }}
                  >
                    {copied ? 'Copied' : 'Copy as text'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-small"
                    disabled={!measureModel.saved.length && !mPicks.length}
                    onClick={() => setPicks([], [])}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
            {pinnedInfo && <AtomInfoBlock info={pinnedInfo} />}
            <label className="cif-atom-filter">
              Highlight element{' '}
              <select
                value={highlightElement ?? ''}
                onChange={(e) =>
                  structure && setHl(e.target.value ? { s: structure, el: e.target.value } : null)
                }
              >
                <option value="">none</option>
                {structure && elementsPresent(structure.atoms).map((el) => (
                  <option key={el} value={el}>
                    {el}
                  </option>
                ))}
              </select>
            </label>
            {highlightElement && (
              <div className="cif-atom-list">
                <div className="cif-atom-list-head">
                  {hlList.length} {highlightElement} atoms in the unit cell
                </div>
                <ul>
                  {hlList.map(({ a, ai }) => {
                    const inf = infoFor({ ai, t: [0, 0, 0] })
                    return (
                      <li key={ai}>
                        <button
                          type="button"
                          className={samePick(pinned, { ai, t: [0, 0, 0] }) ? 'active' : ''}
                          onClick={() => structure && setPin({ s: structure, pick: { ai, t: [0, 0, 0] } })}
                        >
                          <b>{a.label}</b> <span className="muted">op {a.opIndex}</span>
                          <span className="mono">{inf?.frac}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </aside>
        )}
      </div>

      <footer className="viewport-footer">
        <span className="viewport-footer-text">
          CIF explorer · intact molecules (covalent + min-image unwrap) ·
          {structure?.operatorSource === 'cif'
            ? 'operators from the CIF symmetry loop'
            : structure?.operatorSource === 'demo'
              ? 'operators from ITA (CIF had no symmetry loop)'
              : 'operators'}
          {structure?.spaceGroupNumber != null
            ? ` · teaching demo: /sg/${structure.spaceGroupNumber}`
            : ''}
          {placementMode === 'nearest'
            ? ' · Nearest images may sit just outside the cell'
            : ' · In cell wraps atoms into [0, 1)³'}
          {canShowElements && showSymmetryElements
            ? ` · ${elementCount} symmetry loci on CIF cell`
            : ''}
          {' ('}
          <VisitCounter className="visit-counter--footer" />
          {')'}
        </span>
      </footer>
      {hoverInfo && hover && (
        <div
          className="cif-atom-tooltip"
          role="tooltip"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <AtomInfoBlock info={hoverInfo} compact />
        </div>
      )}
    </main>
  )
}

function AtomInfoBlock({ info, compact = false }: { info: AtomInfo; compact?: boolean }) {
  return (
    <dl className={`cif-atom-info${compact ? ' compact' : ''}`}>
      <div className="cif-atom-info-title">
        <b>{info.label}</b> · {info.title}
        {info.atomicNumber != null ? ` · Z = ${info.atomicNumber}` : ''}
      </div>
      <dt>frac</dt>
      <dd className="mono">{info.frac}</dd>
      <dt>cart</dt>
      <dd className="mono">{info.cart}</dd>
      <dt>sym</dt>
      <dd className="mono">{info.op}</dd>
      {info.occupancy != null && (
        <>
          <dt>occ</dt>
          <dd className="mono">{info.occupancy}</dd>
        </>
      )}
      {info.uIso != null && (
        <>
          <dt>Uiso</dt>
          <dd className="mono">{info.uIso}</dd>
        </>
      )}
    </dl>
  )
}
