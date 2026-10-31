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
      if (e.key === 'Escape') {
        setPin(null)
        setHl(null)
        setHover(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const toggleHighlight = (el: string) =>
    structure && setHl(highlightElement === el ? null : { s: structure, el })
  const showPanel = !!structure && (!!pinnedInfo || !!highlightElement)

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
                onAtomPick={(pick) => {
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
                }}
                aria-label="Close atom details (Esc)"
                title="Close (Esc)"
              >
                ×
              </button>
            </div>
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
