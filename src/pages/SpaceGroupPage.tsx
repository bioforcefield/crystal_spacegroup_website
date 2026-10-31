import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import OperatorPanel from '../components/OperatorPanel'
import SpaceGroupDiagram2D from '../components/SpaceGroupDiagram2D'
import UnitCellScene from '../components/UnitCellScene'
import { operatorClass } from '../data/math'
import type { PlacementMode } from '../data/nearestImages'
import type { SpaceGroupDemo } from '../data/types'
import { describeSpaceGroupCanvas } from '../data/a11y/structureSummary'
import {
  DEFAULT_MULTIPLES,
  SUPERCELL_MAX,
  clampMultiple,
  isDefaultMultiples,
  supercellEnabled,
  type CellMultiples,
} from '../data/supercell'
import VisitCounter from '../components/VisitCounter'

interface Props {
  demo: SpaceGroupDemo
}

export default function SpaceGroupPage({ demo }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(1)
  const [animateToken, setAnimateToken] = useState(0)
  const [resetToken, setResetToken] = useState(0)
  const [placementMode, setPlacementMode] = useState<PlacementMode>('nearest')
  // Dense packs (Z>48) default to BASE+IMAGE so the cell stays readable (S5).
  const [multState, setMultState] = useState<{
    sg: number
    value: CellMultiples
  }>({ sg: demo.meta.number, value: DEFAULT_MULTIPLES })
  const canSupercell = supercellEnabled(demo.meta.number)
  const multiples: CellMultiples =
    canSupercell && multState.sg === demo.meta.number
      ? multState.value
      : DEFAULT_MULTIPLES
  const setAxis = (axis: 0 | 1 | 2, n: number) => {
    const next = [...multiples] as CellMultiples
    next[axis] = clampMultiple(n)
    setMultState({ sg: demo.meta.number, value: next })
  }
  const [showAllSites, setShowAllSites] = useState(
    () => demo.meta.multiplicity <= 48,
  )
  /** On narrow screens: which pane is primary. Desktop ignores this. */
  const [mobilePane, setMobilePane] = useState<'3d' | '2d'>('3d')

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index)
    setAnimateToken((t) => t + 1)
  }, [])

  const nOps = demo.operators.length
  const focus = demo.operatorFocusIndices
  const [showAllChips, setShowAllChips] = useState(false)
  const chipOps = useMemo(() => {
    if (!focus || focus.length === 0 || showAllChips) return demo.operators
    const set = new Set(focus)
    set.add(selectedIndex)
    return demo.operators.filter((o) => set.has(o.index))
  }, [demo.operators, focus, showAllChips, selectedIndex])

  const chipListRef = useRef<HTMLDivElement>(null)

  const onChipKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const idxs = chipOps.map((o) => o.index)
    if (idxs.length === 0) return
    const cur = idxs.indexOf(selectedIndex)
    let next = cur
    if (e.key === 'ArrowRight') next = cur < 0 ? 0 : Math.min(idxs.length - 1, cur + 1)
    if (e.key === 'ArrowLeft') next = cur < 0 ? 0 : Math.max(0, cur - 1)
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = idxs.length - 1
    const idx = idxs[next]
    if (idx != null) handleSelect(idx)
  }

  const selectedOp = demo.operators.find((o) => o.index === selectedIndex)
  const liveStatus = selectedOp
    ? `Operator ${selectedOp.index}: ${selectedOp.label}. Placement ${
        placementMode === 'nearest' ? 'Near' : 'Wrap'
      }.${showAllSites ? '' : ' Showing BASE and IMAGE only.'}`
    : ''

  return (
    <div className={`app layout-demo mobile-pane-${mobilePane}`}>
      <OperatorPanel
        demo={demo}
        selectedIndex={selectedIndex}
        onSelect={handleSelect}
        placementMode={placementMode}
      />

      <main className="viewport">
        <div className="viewport-toolbar">
          <div className="legend-stack">
            <div className="legend class-legend">
              {demo.classLegendOrder.map((id) => {
                const c = demo.symmetryClasses[id]
                return (
                  <span key={id} className="legend-item">
                    <span className="swatch" style={{ background: c.color }} />
                    {c.label}
                  </span>
                )
              })}
            </div>
            <details className="legend-details">
              <summary className="legend-details-summary">Legend</summary>
              <div className="legend chirality">
                <span className="chip proper">●△■</span> tips: ball · triangle ·
                square
                <span className="sep">·</span>
                <span className="chip proper">solid</span> proper (same hand)
                <span className="sep">·</span>
                <span className="chip mirrored">mirrored</span> improper
                (opposite hand)
                <span className="sep">·</span>
                <span className="chip base">BASE</span>
                <span className="sep">→</span>
                <span className="chip image">IMAGE</span>
              </div>
              <div className="legend elements-legend">
                {demo.inversionCenters.length > 0 && (
                  <>
                    <span className="chip element">⊙</span> inversion
                    <span className="sep">·</span>
                  </>
                )}
                {demo.screwAxes.length > 0 && (
                  <>
                    <span className="chip element">‖</span> 2 / 2₁ / n-fold
                    <span className="sep">·</span>
                  </>
                )}
                {demo.glidePlanes.length > 0 && (
                  <>
                    <span className="chip element">▭</span> mirror / glide
                    <span className="sep">·</span>
                  </>
                )}
                {demo.geometryLimited
                  ? 'limited geometry overlays'
                  : 'selected element emphasized; others faint'}
              </div>
            </details>
          </div>
          <div className="toolbar-actions">
            <div
              className="segmented mobile-pane-toggle"
              role="group"
              aria-label="View pane"
            >
              <button
                type="button"
                className={mobilePane === '3d' ? 'seg active' : 'seg'}
                onClick={() => setMobilePane('3d')}
                aria-pressed={mobilePane === '3d'}
                title="Show 3D unit cell"
              >
                3D
              </button>
              <button
                type="button"
                className={mobilePane === '2d' ? 'seg active' : 'seg'}
                onClick={() => setMobilePane('2d')}
                aria-pressed={mobilePane === '2d'}
                title="Show 2D projection diagram"
              >
                2D
              </button>
            </div>
            <div
              className="segmented"
              role="group"
              aria-label="Motif placement"
            >
              <button
                type="button"
                className={
                  placementMode === 'nearest' ? 'seg active' : 'seg'
                }
                onClick={() => setPlacementMode('nearest')}
                aria-pressed={placementMode === 'nearest'}
                title="Place BASE/IMAGE near the selected element (may leave the cell)"
              >
                <span className="label-full">Nearest images</span>
                <span className="label-short">Near</span>
              </button>
              <button
                type="button"
                className={
                  placementMode === 'wrapped' ? 'seg active' : 'seg'
                }
                onClick={() => setPlacementMode('wrapped')}
                aria-pressed={placementMode === 'wrapped'}
                title="Wrap every motif into the unit cell [0,1)³"
              >
                <span className="label-full">In cell</span>
                <span className="label-short">Wrap</span>
              </button>
            </div>
            <div
              className="segmented"
              role="group"
              aria-label="Motif visibility"
            >
              <button
                type="button"
                className={showAllSites ? 'seg active' : 'seg'}
                onClick={() => setShowAllSites(true)}
                aria-pressed={showAllSites}
                title={`Show all ${nOps} general-position motifs`}
              >
                <span className="label-full">All sites</span>
                <span className="label-short">All</span>
              </button>
              <button
                type="button"
                className={!showAllSites ? 'seg active' : 'seg'}
                onClick={() => setShowAllSites(false)}
                aria-pressed={!showAllSites}
                title="Show only BASE and its IMAGE under the selected operator"
              >
                <span className="label-full">BASE + IMAGE</span>
                <span className="label-short">B+I</span>
              </button>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => setResetToken((t) => t + 1)}
            >
              <span className="label-full">Reset view</span>
              <span className="label-short">Reset</span>
            </button>
          </div>
        </div>
        {canSupercell && (
          <div
            className="supercell-control"
            role="group"
            aria-labelledby="supercell-label"
          >
            <span id="supercell-label" className="supercell-title">
              Supercell
            </span>
            {(['a', 'b', 'c'] as const).map((ax, i) => (
              <label key={ax} className="supercell-axis">
                <span className="supercell-axis-name">{ax}</span>
                <select
                  value={multiples[i]}
                  onChange={(e) => setAxis(i as 0 | 1 | 2, Number(e.target.value))}
                  aria-label={`Cells along ${ax}`}
                  title={`Number of unit cells along ${ax}`}
                >
                  {Array.from({ length: SUPERCELL_MAX }, (_, k) => k + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                {i < 2 && <span className="supercell-times" aria-hidden="true">×</span>}
              </label>
            ))}
            <button
              type="button"
              className="btn btn-small"
              onClick={() => {
                setMultState({ sg: demo.meta.number, value: DEFAULT_MULTIPLES })
                setResetToken((t) => t + 1)
              }}
              disabled={isDefaultMultiples(multiples)}
              title="Reset a, b, c to 1×1×1 and reframe the camera on the unit cell"
            >
              Reset to unit cell
            </button>
            <span className="supercell-help" aria-live="polite">
              {isDefaultMultiples(multiples)
                ? 'Repeat the cell along a, b, c'
                : `${multiples.join('×')} cells · ${demo.meta.multiplicity * multiples[0] * multiples[1] * multiples[2]} motifs`}
            </span>
          </div>
        )}
        {demo.geometryLimited && demo.geometryNote && (
          <p className="geometry-note" role="note">
            {demo.geometryNote}
          </p>
        )}
        {placementMode === 'nearest' && (
          <p className="placement-near-hint" role="note">
            Near may place BASE/IMAGE just outside the cell box (UCL-style).
          </p>
        )}
        <div
          className="mobile-op-strip"
          role="listbox"
          aria-label="General-position operators"
          tabIndex={0}
          ref={chipListRef}
          onKeyDown={onChipKeyDown}
        >
          {focus && focus.length > 0 && (
            <button
              type="button"
              className="op-chip op-chip-expand"
              onClick={() => setShowAllChips((v) => !v)}
              title={
                showAllChips
                  ? 'Show teaching shortlist'
                  : `Show all ${nOps} operators`
              }
            >
              <span className="op-chip-idx">{showAllChips ? '⊖' : '⊕'}</span>
              <span className="op-chip-triplet">
                {showAllChips ? 'focus' : `all ${nOps}`}
              </span>
            </button>
          )}
          {chipOps.map((op) => {
            const active = op.index === selectedIndex
            const cls = operatorClass(demo, op)
            return (
              <button
                key={op.index}
                type="button"
                role="option"
                aria-selected={active}
                className={`op-chip${active ? ' active' : ''}${op.index === 1 ? ' is-base' : ''}`}
                style={
                  {
                    ['--op-color' as string]: cls.color,
                  } as CSSProperties
                }
                onClick={() => handleSelect(op.index)}
                title={`${op.triplet} · ${op.label}`}
                aria-pressed={active}
                aria-label={`Operator ${op.index}: ${op.triplet}, ${op.label}`}
              >
                <span className="op-chip-idx">{op.index}</span>
                <span className="op-chip-triplet">{op.triplet}</span>
              </button>
            )
          })}
        </div>
        <div className="viewport-body">
          <div
            id="demo-main"
            className="canvas-wrap"
            role="img"
            aria-label={describeSpaceGroupCanvas(demo)}
            tabIndex={-1}
          >
            <UnitCellScene
              demo={demo}
              selectedIndex={selectedIndex}
              animateToken={animateToken}
              placementMode={placementMode}
              showAllSites={showAllSites}
              multiples={multiples}
              onSelectPoint={handleSelect}
              resetToken={resetToken}
            />
          </div>
          <SpaceGroupDiagram2D
            demo={demo}
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
            showAllSites={showAllSites}
            placementMode={placementMode}
          />
        </div>
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveStatus}
        </div>
        <footer className="viewport-footer">
          <span className="viewport-footer-text">
            {demo.meta.hm} ({demo.meta.number}) · BASE always marked · click an
            operator (or a 2D site) to highlight IMAGE, connector, and its geometric
            element (⊙ center · ‖ axis · ▭ glide)
            {placementMode === 'nearest'
              ? ' · Near (3D + 2D) may sit just outside the cell (UCL-style)'
              : ' · Wrap motifs into [0, 1)³ / [0, 1)²'}
            {demo.screwAxes.length > 0
              ? ' · Ghost flight is schematic, not the crystallographic screw path'
              : ''}
            {!showAllSites ? ' · Showing only BASE + IMAGE' : ''}
            {demo.cell.alphaDeg && demo.cell.alphaDeg !== 90
              ? ` · α = ${demo.cell.alphaDeg}°`
              : ''}
            {demo.cell.betaDeg && demo.cell.betaDeg !== 90
              ? ` · β = ${demo.cell.betaDeg}°`
              : ''}
            {demo.cell.gammaDeg && demo.cell.gammaDeg !== 90
              ? ` · γ = ${demo.cell.gammaDeg}°`
              : ''}
            {' ('}
            <VisitCounter className="visit-counter--footer" />
            {')'}
          </span>
        </footer>
      </main>
    </div>
  )
}
