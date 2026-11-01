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
import VisitCounter from '../VisitCounter'
import { operatorColor } from '../../data/cif/operatorColors'
import type { ExpandedStructure } from '../../data/cif/types'
import { describeCifStructure } from '../../data/a11y/structureSummary'
import type { SpaceGroupDemo } from '../../data/types'
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
import { cifDownloadName, escTarget, isDenseSupercell, nonBondedSteps, pairPickLabels } from '../../data/cif/viewportUi'
import {
  CIF_ATOM_CAP,
  DEFAULT_MULTIPLES,
  setAxisCapped,
  type CellMultiples,
} from '../../data/supercell'

import { PDB_REPS, PDB_SUPERCELL_ATOM_CAP, type PdbRepresentation } from '../../data/pdb/macro'
import { INTERACTION_TYPES, type InteractionType, type LigandSite } from '../../data/pdb/interactions'
import { chainColor } from '../../data/pdb/chainColors'
import LigandDiagram2D from './LigandDiagram2D'
import { expandMacro } from '../../data/pdb/macro'
import { detectFormat } from '../../data/pdb/formats'
import {
  EXPORT_FORMATS, EXPORT_VIEWS, exportFileName, macroAsuSet, pocketSet, rcsbDownloads, smallAsuSet, viewSet, writeExport,
  type ExportFormat, type ExportView,
} from '../../data/export/structureExport'

const CifStructureScene = lazy(() => import('../CifStructureScene'))

export type CifExample = 'pdb:4hhb' | 'pdb:1bna' | 'sample'

export interface CifViewportProps {
  /** First-run example buttons in the empty viewport. */
  onOpenExample?: (ex: CifExample) => void
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
  /** A load is in flight (spinner over the viewer). */
  busy?: boolean
  /** PDB / macromolecule controls (ignored for small-molecule CIFs). */
  pdbRep?: PdbRepresentation
  onPdbRepChange?: (r: PdbRepresentation) => void
  showWaters?: boolean
  onShowWatersChange?: (v: boolean) => void
  ligandSite?: LigandSite | null
  interactionTypes?: Set<InteractionType>
  onExitFocus?: () => void
  /** 2D interaction diagram open (ligand focus). */
  diagramOpen?: boolean
  onDiagramOpenChange?: (open: boolean) => void
  /** Residue key highlighted from table/diagram hover. */
  highlightRes?: string | null
  onHighlightRes?: (key: string | null) => void
  /** Residue key the 3D camera centres on. */
  centerRes?: string | null
  /** Residue picked in the structure-analysis drawer. */
  analysisFocus?: import('./analysis/types').AnalysisFocus | null
  overlayTraces?: { points: import('../../data/types').Vec3[][]; color: string }[] | null
  /** Rendered under the 3D canvas (PDB sequence strip). */
  sequenceSlot?: import('react').ReactNode
  /** PDB: residue key (chain|seq|comp) of the pinned atom, for the sequence strip. */
  onPinnedResidue?: (key: string | null) => void
  onCenterRes?: (key: string | null) => void
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
  busy = false,
  pdbRep = 'cartoon',
  onPdbRepChange,
  showWaters = false,
  onShowWatersChange,
  ligandSite = null,
  interactionTypes,
  onExitFocus,
  diagramOpen = false,
  onDiagramOpenChange,
  highlightRes = null,
  onHighlightRes,
  centerRes = null,
  analysisFocus = null,
  overlayTraces = null,
  sequenceSlot = null,
  onPinnedResidue,
  onCenterRes,
  onOpenExample,
}: CifViewportProps) {
  const macro = structure?.macro ?? null
  const atomCap = macro ? PDB_SUPERCELL_ATOM_CAP : CIF_ATOM_CAP
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
  const placedResult = useMemo(
    () =>
      structure ? placeCifStructure(structure, placementMode, selectedOp, elementDemo ?? null) : null,
    [structure, placementMode, selectedOp, elementDemo],
  )
  const placedPositions = placedResult?.positions ?? []
  const placedHidden = placedResult?.hidden
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
  // Toolbar dropdowns (only one open at a time).
  const [openMenu, setOpenMenu] = useState<null | 'show' | 'color' | 'display' | 'download'>(null)
  const openMenuRef = useRef(openMenu)
  openMenuRef.current = openMenu
  const panelOpenRef = useRef(false)
  // Esc: close the innermost thing (menu → Measure → atom panel). Backspace: undo last Measure pick.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (e.key === 'Backspace' && measureOnRef.current && !typing) {
        e.preventDefault()
        undoRef.current()
        return
      }
      if (e.key !== 'Escape') return
      const t = escTarget({
        menuOpen: openMenuRef.current != null,
        measureOn: measureOnRef.current,
        hasPicks: false,
        panelOpen: panelOpenRef.current,
      })
      if (t === 'menu') setOpenMenu(null)
      else if (t === 'measure') setMeasureOn(false)
      if (t === 'panel' || t === 'measure') {
        setPin(null)
        setHl(null)
      }
      setHover(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  // Close menus on outside click.
  useEffect(() => {
    if (!openMenu) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest('.cif-menu-wrap')) return
      setOpenMenu(null)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [openMenu])
  // Hover with a short leave delay so the tooltip does not flicker between neighbouring atoms.
  const hoverTimer = useRef<number | undefined>(undefined)
  const onAtomHover = (pick: AtomPick | null, x: number, y: number) => {
    window.clearTimeout(hoverTimer.current)
    if (pick) {
      setHover((h) =>
        h && samePick(h.pick, pick) && Math.abs(h.x - x) < 6 && Math.abs(h.y - y) < 6 ? h : { pick, x, y },
      )
    } else hoverTimer.current = window.setTimeout(() => setHover(null), 140)
  }
  // —— Measure mode ——
  const [measureOn, setMeasureOn] = useState(false)
  // New CIF → leave Measure mode (picks + supercell are keyed by structure, so they reset too).
  const [measureFor, setMeasureFor] = useState<ExpandedStructure | null>(structure)
  if (measureFor !== structure) {
    setMeasureFor(structure)
    if (measureOn) setMeasureOn(false)
    if (openMenu) setOpenMenu(null)
  }
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
      title={structure ? 'Measure distances, angles and torsions; pick atoms on two molecules to get the symmetry element relating them' : 'Load a structure first'}
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
  panelOpenRef.current = showPanel

  // —— Download ——
  const [exportViewPick, setExportView] = useState<ExportView | 'pocket' | null>(null)
  const exportView: ExportView | 'pocket' =
    exportViewPick === 'pocket' && !ligandSite ? placementMode : exportViewPick ?? placementMode
  const exportBase = macro?.model.pdbId
    ? macro.model.pdbId.toLowerCase()
    : baseFileName(undefined, sourceName ? sourceName.replace(/\s*\(.*?\)/g, '').replace(/\s*·.*$/, '') : undefined)
  const doExport = (fmt: ExportFormat) => {
    if (!structure) return
    setDlOpen(false)
    try {
      const title = macro?.model.pdbId?.toUpperCase() ?? exportBase
      let set
      if (exportView === 'pocket' && macro && ligandSite) set = pocketSet(macro.model, ligandSite.ligand.atoms, ligandSite.pocket, `${title} ${ligandSite.ligand.label} pocket`)
      else if (exportView === 'asu' || exportView === 'pocket') set = macro ? macroAsuSet(macro.model) : smallAsuSet(structure, title)
      else {
        // PDB entries: export all atoms (Full atoms) when under the cap, otherwise what is drawn.
        const src = macro && macro.fullAllowed && macro.rep !== 'full' ? expandMacro(macro.model, 'full', macro.showWaters) : structure
        set = viewSet(src, exportView, {
          title, multiples,
          selectedOp,
          include: src === structure ? (ai) => {
            const a = structure.atoms[ai]!
            if (visibility === 'asymmetric') return a.opIndex === 1
            if (visibility === 'selected') return a.opIndex === 1 || a.opIndex === selectedOp
            return true
          } : undefined,
        })
      }
      const fm = EXPORT_FORMATS.find((f) => f.v === fmt)!
      downloadText(writeExport(set, fmt), exportFileName(exportBase, exportView, fmt, multiples), fm.mime)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e))
    }
  }
  const dlOpen = openMenu === 'download'
  const setDlOpen = (o: boolean | ((x: boolean) => boolean)) =>
    setOpenMenu((m) => ((typeof o === 'function' ? o(m === 'download') : o) ? 'download' : null))
  const doDownload = (kind: 'cif' | 'sdf-au' | 'sdf-cell' | 'sdf-view' | 'p1') => {
    setDlOpen(false)
    if (!structure) return
    const base = baseFileName(undefined, sourceName ? sourceName.replace(/\s*\(.*?\)/g, '') : undefined)
    const disp = structure.atoms.map((a) => a.displayCartesian as [number, number, number])
    const inView = (ai: number) => {
      const a = structure.atoms[ai]!
      if (placedHidden?.has(ai)) return false
      if (visibility === 'asymmetric') return a.opIndex === 1
      if (visibility === 'selected') return a.opIndex === 1 || a.opIndex === selectedOp
      return true
    }
    const sg = structure.spaceGroupNumber ?? null
    const ts = supercellTranslations(multiples)
    const mtag = multiples.join('x')
    if (kind === 'cif') {
      if (sourceText) {
        const f = detectFormat(sourceText, sourceName ?? '')
        const ext = f === 'pdb' ? 'pdb' : f === 'mae' ? 'mae' : 'cif'
        downloadText(sourceText, macro || f !== 'cif' ? `${base}.${ext}` : cifDownloadName(base, sg, '', 'cif'), 'text/plain')
      }
      return
    }
    if (kind === 'p1') {
      downloadText(
        p1SupercellCif(structure, placedPositions as [number, number, number][], inView, multiples, ts, base),
        cifDownloadName(base, sg, `P1_${mtag}`, 'cif'),
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
    downloadText(sdf(recs), cifDownloadName(base, sg, suffix, 'sdf'), 'chemical/x-mdl-sdfile')
  }
  const downloadMenu = (
    <div className="cif-download-wrap cif-menu-wrap">
      <button
        type="button"
        className={`btn${dlOpen ? ' btn-primary' : ''}`}
        onClick={() => setDlOpen((o) => !o)}
        disabled={!structure}
        title={structure ? undefined : 'Load a structure first'}
        aria-expanded={dlOpen}
        aria-haspopup="menu"
      >
        Download ▾
      </button>
      {dlOpen && structure && (
        <div className="cif-download-menu" role="menu">
          <div className="cif-menu-head" role="presentation">CIF</div>
          <button type="button" role="menuitem" onClick={() => doDownload('cif')} disabled={!sourceText}>
            Original file
          </button>
          {!macro && (<>
          <button type="button" role="menuitem" onClick={() => doDownload('p1')}>
            P1 supercell ({multiples.join('×')})
          </button>
          <div className="cif-menu-head" role="presentation">SDF (molecules)</div>
          <button type="button" role="menuitem" onClick={() => doDownload('sdf-au')}>
            Asymmetric unit
          </button>
          <button type="button" role="menuitem" onClick={() => doDownload('sdf-cell')}>
            Unit cell (whole molecules)
          </button>
          <button type="button" role="menuitem" onClick={() => doDownload('sdf-view')}>
            Current view ({multiples.join('×')})
          </button>
          <div className="cif-menu-hint" role="presentation">
            “Current view” = exactly what is drawn (Show filter + supercell).
          </div>
          </>)}
          <div className="cif-menu-head" role="presentation">Coordinates</div>
          <div className="cif-export-row" role="presentation">
            <label>
              Scope{' '}
              <select data-testid="export-view" value={exportView} onChange={(e) => setExportView(e.target.value as ExportView | 'pocket')}>
                {EXPORT_VIEWS.map((v) => (
                  <option key={v.v} value={v.v}>{v.label}{v.v !== 'asu' ? ` (${multiples.join('×')})` : ''}</option>
                ))}
                {macro && ligandSite && <option value="pocket">Ligand + pocket ({ligandSite.ligand.label})</option>}
              </select>
            </label>
          </div>
          <div className="cif-export-fmts" role="presentation">
            {EXPORT_FORMATS.map((f) => (
              <button key={f.v} type="button" role="menuitem" data-testid={`export-${f.v}`}
                disabled={f.v === 'cif' && (exportView === 'pocket' || (!!macro && !macro.model.crystal))}
                title={`${f.label} · ${exportFileName(exportBase, exportView, f.v, multiples)}`}
                onClick={() => doExport(f.v)}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="cif-menu-hint" role="presentation">
            ASU keeps the space group + symmetry operators. Views export what that placement draws over the {multiples.join('×')} supercell, written as P 1 with the supercell lattice (CRYST1 / _cell). Bonds are perceived from distances.
          </div>
          {macro?.model.pdbId && (<>
            <div className="cif-menu-head" role="presentation">RCSB originals · {macro.model.pdbId.toUpperCase()}</div>
            {rcsbDownloads(macro.model.pdbId).map((d) => (
              <a key={d.url} role="menuitem" className="cif-menu-link" href={d.url} target="_blank" rel="noopener noreferrer" onClick={() => setDlOpen(false)}>{d.label} ↗</a>
            ))}
          </>)}
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
  const applyTeachingView = () => {
    onPlacementModeChange('nearest')
    onVisibilityChange('molecules')
    onColorModeChange('operator')
    onThermalModeChange('off')
    onHBondModeChange('off')
    if (macro) onPdbRepChange?.('cartoon')
    if (canShowElements && !showSymmetryElements) {
      onToggleSymmetryElements()
    }
    setOpenMenu(null)
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

  const displayLabel = displaySummary(thermalMode, hbondMode, structure?.hbonds?.length)

  const seg = <T extends string>(
    label: string,
    cur: T,
    set: (v: T) => void,
    opts: { v: T; label: string; title: string; disabled?: boolean }[],
  ) => (
    <div className="segmented" role="group" aria-label={label}>
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          className={cur === o.v ? 'seg active' : 'seg'}
          onClick={() => set(o.v)}
          aria-pressed={cur === o.v}
          disabled={o.disabled}
          title={o.title}
        >
          {o.label}
        </button>
      ))}
    </div>
  )

  const nH = structure?.hbonds?.length ?? 0
  const thermalControls = seg('Thermal displacement', thermalMode, onThermalModeChange, [
    { v: 'off', label: 'No thermal', title: 'Hide thermal displacement parameters (No U)' },
    { v: 'uiso', label: 'Uiso', title: 'Scale ball radius by Uiso when present' },
    { v: 'ellipsoid', label: 'Ellipsoid', title: 'Draw anisotropic ellipsoids when Uij present; else Uiso balls' },
  ])
  const hbondControls = seg('H-bond contacts', hbondMode, onHBondModeChange, [
    { v: 'off', label: 'No H-bonds', title: 'Hide H-bond contacts' },
    { v: 'links', label: `H-bonds${nH ? ` · ${nH}` : ''}`, title: 'Dashed H···A contacts (pink = cross-operator)', disabled: !nH },
    { v: 'partners', label: 'Partners', title: 'Show H-bonds and dim molecules not partnered with the asymmetric unit', disabled: !nH },
  ])

  const showOptions: { v: CifVisibility; label: string; title: string }[] = [
    { v: 'molecules', label: 'Molecules', title: 'Show intact molecules (one copy per operator)' },
    { v: 'all', label: 'All copies', title: 'Show all symmetry copies' },
    { v: 'selected', label: 'Selected pair', title: 'BASE + IMAGE — asymmetric unit and the selected operator copy' },
    { v: 'asymmetric', label: 'Asym. unit', title: 'Asymmetric unit only (AU)' },
  ]
  const colorOptions: { v: CifColorMode; label: string; title: string }[] = [
    { v: 'operator', label: 'Symmetry op', title: 'Color by symmetry operation that generated each copy (default)' },
    { v: 'element', label: 'Element', title: 'CPK / Jmol element colors; bonds half-colored' },
    { v: 'equivalence', label: 'Equivalence', title: 'Each independent molecule in the asymmetric unit gets a color; its symmetry copies share it' },
    { v: 'residue', label: 'Residue', title: 'Color by residue / component id when present' },
    ...(macro ? [{ v: 'chain' as const, label: 'Chain', title: 'Color by polymer chain (auth chain id)' }] : []),
  ]

  /** Compact dropdown (radio menu) used for Show ▾ and Color ▾. */
  const radioMenu = <T extends string>(
    key: 'show' | 'color',
    label: string,
    cur: T,
    set: (v: T) => void,
    opts: { v: T; label: string; title: string }[],
    extraClass = '',
  ) => {
    const curLabel = opts.find((o) => o.v === cur)?.label ?? ''
    const open = openMenu === key
    return (
      <div className={`cif-menu-wrap ${extraClass}`}>
        <button
          type="button"
          className={`btn cif-tb-btn${open ? ' btn-primary' : ''}`}
          onClick={() => setOpenMenu(open ? null : key)}
          disabled={!structure}
          aria-haspopup="menu"
          aria-expanded={open}
          title={`${label}: ${curLabel}`}
        >
          <span className="cif-tb-key">{label}</span> {curLabel} ▾
        </button>
        {open && (
          <div className="cif-download-menu cif-radio-menu" role="menu" aria-label={label}>
            {opts.map((o) => (
              <button
                key={o.v}
                type="button"
                role="menuitemradio"
                aria-checked={cur === o.v}
                className={cur === o.v ? 'active' : ''}
                onClick={() => {
                  set(o.v)
                  setOpenMenu(null)
                }}
                title={o.title}
              >
                <span className="cif-menu-check" aria-hidden="true">{cur === o.v ? '●' : '○'}</span> {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const symOn = showSymmetryElements && canShowElements
  const symmetrySwitch = (
    <button
      type="button"
      role="switch"
      className={`cif-switch${symOn ? ' on' : ''}`}
      onClick={onToggleSymmetryElements}
      disabled={!structure || !canShowElements}
      aria-checked={symOn}
      title={
        !structure
          ? 'Load a structure first'
          : !elementDemo
            ? 'Needs a resolvable space-group number (1–230)'
            : elementCount === 0
              ? 'No drawable loci for this group yet (operators still listed)'
              : showSymmetryElements
                ? 'Hide screw / glide / inversion overlays'
                : 'Show screw / glide / inversion overlays'
      }
    >
      <span className="cif-switch-track" aria-hidden="true">
        <span className="cif-switch-thumb" />
      </span>
      <span className="cif-switch-label">Symmetry<span className="cif-sw-long"> elements</span></span>
    </button>
  )

  const displayOpen = openMenu === 'display'
  const displayMenu = (
    <div className="cif-display-wrap cif-menu-wrap">
      <button
        type="button"
        className={`btn cif-display-toggle cif-tb-btn${displayOpen ? ' btn-primary' : ''}`}
        onClick={() => setOpenMenu(displayOpen ? null : 'display')}
        aria-expanded={displayOpen}
        aria-controls="cif-display-sheet"
        disabled={!structure}
        title={`Display options (${displayLabel})`}
      >
        Display ▾
      </button>
      {displayOpen && (
        <div id="cif-display-sheet" className="cif-display-sheet" role="dialog" aria-label="Display options">
          {macro ? (
            <>
              <div className="cif-display-section-label">Representation</div>
              {seg('Representation', pdbRep, (r) => onPdbRepChange?.(r), PDB_REPS.map((r) => ({
                ...r,
                disabled: r.v === 'full' && !macro.fullAllowed,
                title: r.v === 'full' && !macro.fullAllowed ? `Too many atoms (${macro.fullAtomCount.toLocaleString()})` : r.title,
              })))}
              {macro.model.hasWater && (
                <label className="cif-pdb-waters">
                  <input
                    type="checkbox"
                    checked={showWaters}
                    disabled={pdbRep !== 'full'}
                    onChange={(e) => onShowWatersChange?.(e.target.checked)}
                  />{' '}
                  Show waters{pdbRep !== 'full' ? ' (Full atoms only)' : ''}
                </label>
              )}
            </>
          ) : (
            <>
              <div className="cif-display-section-label">Thermal</div>
              {thermalControls}
              <div className="cif-display-section-label">H-bonds</div>
              {hbondControls}
            </>
          )}
          <div className="cif-display-section-label">Preset</div>
          <button
            type="button"
            className="btn btn-small"
            onClick={applyTeachingView}
            disabled={!structure}
            title="Molecules + Nearest + Symmetry on + By operator; thermal and H-bonds off"
          >
            Teaching view
          </button>
        </div>
      )}
    </div>
  )

  const selectedOpObj = structure?.operators.find((o) => o.index === selectedOp) ?? null
  const dense = isDenseSupercell(multiples)
  const nonBonded = useMemo(
    () => (structure && measureModel ? nonBondedSteps(structure, measureModel.curAtoms) : []),
    [structure, measureModel],
  )
  const pairLabels = useMemo(
    () =>
      structure && measureModel?.relation
        ? pairPickLabels(measureModel.curAtoms, (i) => structure.atoms[measureModel.curAtoms[i]!.pick.ai]!.opIndex)
        : null,
    [structure, measureModel],
  )
  const kbdAtoms = useMemo(
    () => (structure ? structure.atoms.map((a, ai) => ({ a, ai })).filter(({ a }) => a.opIndex === 1).slice(0, 400) : []),
    [structure],
  )
  const pinnedPdb = pinned && structure ? structure.atoms[pinned.ai]?.pdb : undefined
  const pinnedResKey = pinnedPdb ? `${pinnedPdb.chain}|${pinnedPdb.seq}|${pinnedPdb.comp}` : null
  useEffect(() => { onPinnedResidue?.(pinnedResKey) }, [pinnedResKey, onPinnedResidue])
  const pickAtom = (pick: AtomPick) => {
    if (!structure) return
    if (measureOn) {
      const last = mPicks[mPicks.length - 1]
      if (samePick(last ?? null, pick)) return
      setPicks(mPicks.length >= 4 ? [pick] : [...mPicks, pick])
      setHover(null)
      return
    }
    setPin(samePick(pick, pinned) ? null : { s: structure, pick })
    setHover(null)
  }

  return (
    <main className="viewport cif-vp" id="cif-viewer" tabIndex={-1}>
      <div className="viewport-toolbar cif-toolbar-row" role="toolbar" aria-label="Viewer controls">
        <div className="segmented cif-tb-view" role="group" aria-label="Motif placement">
          <span className="cif-tb-key" aria-hidden="true">View</span>
          <button
            type="button"
            className={placementMode === 'nearest' ? 'seg active' : 'seg'}
            onClick={() => onPlacementModeChange('nearest')}
            aria-pressed={placementMode === 'nearest'}
            title="Place molecules near the selected element (may leave the cell)"
          >
            <span className="label-full">Nearest</span>
            <span className="label-short">Near</span>
          </button>
          <button
            type="button"
            className={placementMode === 'whole' ? 'seg active' : 'seg'}
            onClick={() => onPlacementModeChange('whole')}
            aria-pressed={placementMode === 'whole'}
            title="Whole molecules whose centre lies in the unit cell (atoms may protrude past faces)"
          >
            <span className="label-full">Cell (whole)</span>
            <span className="label-short">Whole</span>
          </button>
          <button
            type="button"
            className={placementMode === 'wrapped' ? 'seg active' : 'seg'}
            onClick={() => onPlacementModeChange('wrapped')}
            aria-pressed={placementMode === 'wrapped'}
            title="Wrap every atom into the unit cell [0,1)³"
          >
            <span className="label-full">Cell (atoms)</span>
            <span className="label-short">Wrap</span>
          </button>
        </div>
        {radioMenu('show', 'Show', visibility, onVisibilityChange, showOptions, 'cif-tb-show')}
        {radioMenu('color', 'Color', colorMode, onColorModeChange, colorOptions, 'cif-tb-color cif-tb-mini')}
        <div className="cif-tb-sym">{symmetrySwitch}</div>
        <div className="cif-tb-display">{displayMenu}</div>
        <div className="cif-tb-measure cif-tb-mini">{measureBtn}</div>
        <div className="cif-tb-download cif-tb-mini">{downloadMenu}</div>
        <button
          type="button"
          className="btn cif-tb-reset"
          onClick={onResetView}
          disabled={!structure}
          title="Reset the camera"
        >
          Reset
        </button>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {structure ? hbondLive : ''}
        </p>
      </div>

      <div className="legend-stack cif-legend-row" aria-label="Legend">
        <span className="cif-chrome-label">Legend</span>
        <div className="legend class-legend cif-legend-line">
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
          ) : structure && macro && colorMode === 'chain' ? (
            macro.model.chains.map((c, k) => (
              <span key={c} className="legend-item">
                <span className="swatch" style={{ background: chainColor(k) }} />
                Chain {c}
              </span>
            ))
          ) : structure && colorMode === 'residue' ? (
            <span className="legend-item muted">Residue / component colors</span>
          ) : structure ? (
            <>
              {structure.operators.map((op) => (
                <button
                  key={op.index}
                  type="button"
                  className={`legend-item cif-legend-op cif-op-chip-compact${op.index === selectedOp ? ' active' : ''}`}
                  onClick={() => onSelectOp(op.index)}
                  title={op.triplet}
                  aria-pressed={op.index === selectedOp}
                  aria-label={`Operator ${op.index}${op.index === 1 ? ' asymmetric unit' : ''}: ${op.triplet}`}
                >
                  <span className="swatch" style={{ background: operatorColor(op.index) }} />
                  {op.index}
                  {op.index === 1 ? ' AU' : ''}
                </button>
              ))}
              {selectedOpObj && (
                <span className="cif-selected-op-card" aria-live="polite">
                  op {selectedOpObj.index}: <span className="mono">{selectedOpObj.triplet}</span>
                </span>
              )}
            </>
          ) : (
            <span className="legend-item muted">Load a structure to colour copies by symmetry operator</span>
          )}
          {ligandSite && (
            <span className="cif-elements-inline" aria-label="Interaction types">
              <span className="cif-legend-sep" aria-hidden="true">|</span>
              {INTERACTION_TYPES.filter((t) => interactionTypes?.has(t.v) ?? true).map((t) => (
                <span key={t.v} className="legend-item">
                  <span className="swatch cif-dash-swatch" style={{ borderColor: t.color }} />
                  {t.label}
                </span>
              ))}
              <span className="cif-seg" role="group" aria-label="Ligand view">
                <button type="button" className={`btn btn-small${!diagramOpen ? ' is-active' : ''}`} aria-pressed={!diagramOpen} onClick={() => onDiagramOpenChange?.(false)}>
                  3D
                </button>
                <button type="button" className={`btn btn-small${diagramOpen ? ' is-active' : ''}`} aria-pressed={diagramOpen} onClick={() => onDiagramOpenChange?.(true)} data-testid="lig2d-toggle">
                  2D diagram
                </button>
              </span>
              <button type="button" className="btn btn-small" onClick={onExitFocus}>
                Exit focus
              </button>
            </span>
          )}
          {elementDemo && symOn && (
            <span className="cif-elements-inline" aria-label="Symmetry element classes">
              <span className="cif-legend-sep" aria-hidden="true">|</span>
              {elementDemo.classLegendOrder
                .filter((id) => id !== 'identity')
                .map((id) => {
                  const cls = elementDemo.symmetryClasses[id]
                  if (!cls) return null
                  return (
                    <span key={id} className="legend-item">
                      <span className="swatch" style={{ background: cls.color }} />
                      {cls.label}
                    </span>
                  )
                })}
              {elementDemo.geometryLimited && (
                <span className="legend-item muted" title={elementDemo.geometryNote}>
                  limited geometry
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {structure && (
        <div className="cif-lattice-row">
          <CellParamsBadge cell={structure.cell} variant="strip" />
          <SupercellPicker
            id="cif-supercell"
            multiples={multiples}
            onAxis={(axis, n) =>
              setMult({ s: structure, v: setAxisCapped(multiples, axis, n, perCell, atomCap) })
            }
            onReset={() => {
              setMult({ s: structure, v: DEFAULT_MULTIPLES })
              onResetView()
            }}
            perCell={perCell}
            cap={atomCap}
            unit="atoms"
            strictCap
            compact
          />
          {dense && (
            <span className="cif-dense-note" role="note">
              Dense supercell: interior cell edges faded, copies drawn smaller
            </span>
          )}
        </div>
      )}

      <div className={`viewport-body cif-viewport-body cif-overlay-body${showPanel ? ' has-atom-overlay' : ''}`}>
        <div
          id="demo-main"
          className="canvas-wrap"
          role="img"
          aria-label={canvasLabel}
          tabIndex={-1}
        >
          {ligandSite && diagramOpen && (
            <LigandDiagram2D
              site={ligandSite}
              types={interactionTypes ?? new Set(INTERACTION_TYPES.map((t) => t.v))}
              highlight={highlightRes}
              onHover={(k) => onHighlightRes?.(k)}
              onPick={(k) => onCenterRes?.(k)}
              onClose={() => onDiagramOpenChange?.(false)}
            />
          )}
          {structure ? (
            <Suspense
              fallback={
                <div className="cif-empty cif-loading" role="status">
                  <span className="cif-spinner" aria-hidden="true" />
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
                showSymmetryElements={symOn}
                colorMode={colorMode}
                thermalMode={thermalMode}
                hbondMode={hbondMode}
                multiples={multiples}
                onAtomHover={onAtomHover}
                annotations={annotations}
                onAtomPick={pickAtom}
                pinnedAtom={pinned}
                highlightElement={highlightElement}
                hoverAtom={hover?.pick ?? null}
                ligandSite={ligandSite}
                interactionTypes={interactionTypes}
                highlightRes={highlightRes}
                centerRes={centerRes}
                analysisFocus={analysisFocus}
                overlayTraces={overlayTraces}
              />
            </Suspense>
          ) : (
            <div className="cif-empty">
              {busy ? (
                <div className="cif-loading" role="status">
                  <span className="cif-spinner" aria-hidden="true" />
                  <p>Loading structure…</p>
                </div>
              ) : (
                <div className="cif-welcome" data-testid="cif-welcome">
                  <p className="cif-welcome-title">Explore a crystal structure</p>
                  <p>
                    Load a PDB ID, a COD id or a file (<code>.cif</code> <code>.mmcif</code> <code>.pdb</code>{' '}
                    <code>.mae</code>) from the panel, or drop a file here. Every copy is coloured by the symmetry
                    operator that generated it.
                  </p>
                  {onOpenExample && (
                    <div className="cif-welcome-examples" role="group" aria-label="Examples">
                      <button type="button" className="btn" onClick={() => onOpenExample('pdb:4hhb')}>
                        4HHB · haemoglobin
                      </button>
                      <button type="button" className="btn" onClick={() => onOpenExample('pdb:1bna')}>
                        1BNA · B-DNA
                      </button>
                      <button type="button" className="btn" onClick={() => onOpenExample('sample')}>
                        Acetic acid · P2₁/c
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {structure && busy && (
            <div className="cif-busy-veil" role="status">
              <span className="cif-spinner" aria-hidden="true" />
              <span>Loading structure…</span>
            </div>
          )}
        </div>
        {showPanel && (
          <aside className="cif-atom-panel cif-atom-overlay" aria-label="Atom details">
            <div className="cif-atom-panel-head">
              <span className="cif-chrome-label">{measureOn ? 'Measure' : 'Atom details'}</span>
              <button
                type="button"
                className="btn btn-small"
                onClick={() => {
                  setPin(null)
                  setHl(null)
                  setMeasureOn(false)
                }}
                aria-label="Close panel (Esc)"
                title="Close (Esc)"
              >
                ×
              </button>
            </div>
            {measureOn && measureModel && (
              <div className="cif-measure">
                <div className="cif-measure-hint">
                  Click 2 atoms → distance, 3 → angle, 4 → torsion. Atoms on two molecules → their symmetry
                  element. ⌫ undoes the last pick · Esc exits Measure.
                </div>
                {measureModel.curAtoms.length > 0 && (
                  <div className="cif-measure-current">
                    <div className="cif-measure-names">
                      {measureModel.curAtoms.map((a, i) => (
                        <span key={i}>
                          {i > 0 && (
                            <span className={nonBonded[i - 1] ? 'cif-nb' : ''}>
                              {nonBonded[i - 1] ? ' ⋯ ' : ' – '}
                            </span>
                          )}
                          {measureModel.codes.name(a)}
                        </span>
                      ))}
                    </div>
                    {nonBonded.some(Boolean) && (
                      <div className="cif-nb-note">(non-bonded) — ⋯ marks picks that are not covalently bonded</div>
                    )}
                    {measureModel.current && (
                      <div className="cif-measure-value">
                        {measureModel.current.kind}
                        {nonBonded.some(Boolean) ? ' (non-bonded)' : ''}:{' '}
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
                    {pairLabels && (
                      <div className="cif-pair-labels">
                        <div>{pairLabels.a}</div>
                        <div>{pairLabels.b}</div>
                      </div>
                    )}
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
                        setTimeout(() => setCopied(false), 1500)
                      })
                    }}
                    aria-live="polite"
                  >
                    {copied ? 'Copied ✓' : 'Copy as text'}
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
      {sequenceSlot}

      {structure && (
        <details className="cif-kbd-atoms">
          <summary>Atom list (keyboard: pin / Measure pick)</summary>
          <ul aria-label="Asymmetric-unit atoms">
            {kbdAtoms.map(({ a, ai }) => (
              <li key={ai}>
                <button
                  type="button"
                  className={samePick(pinned, { ai, t: [0, 0, 0] }) || mPicks.some((p) => samePick(p, { ai, t: [0, 0, 0] })) ? 'active' : ''}
                  onClick={() => pickAtom({ ai, t: [0, 0, 0] })}
                  onFocus={() => setHover(null)}
                >
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <footer className="viewport-footer">
        <span className="viewport-footer-text">
          {macro
            ? macro.model.crystal
              ? 'Ops from the PDB space group'
              : 'Deposited model (no lattice)'
            : structure?.operatorSource === 'cif'
              ? 'Ops from CIF'
              : structure?.operatorSource === 'demo'
                ? 'Ops from ITA (no CIF symmetry loop)'
                : 'Lattice Lab'}
          {!macro && structure?.spaceGroupNumber != null ? ` · demo /sg/${structure.spaceGroupNumber}` : ''}
          {structure ? (placementMode === 'nearest' ? ' · Nearest images' : placementMode === 'whole' ? ' · Whole molecules, centres in cell' : ' · In cell [0,1)³') : ''}
          {symOn ? ` · ${elementCount} symmetry loci` : ''}
          <VisitCounter silent />
        </span>
      </footer>
      {hoverInfo && hover && (
        <div className="cif-atom-tooltip" role="tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
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
