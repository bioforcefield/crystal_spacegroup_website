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
  SG_MOTIF_CAP,
  setAxisCapped,
  supercellEnabled,
  type CellMultiples,
} from '../data/supercell'
import SupercellPicker from '../components/SupercellPicker'
import VisitCounter from '../components/VisitCounter'
import MotifStylePicker, { useMotifStyle } from '../components/motifs/MotifStylePicker'
import { opClass, selectionLabels } from '../data/opLabels'
import { legendClasses } from '../data/elementClasses'
import { fmtVec } from '../data/opClassify'
import { useAnimationsPaused, useMotionOff } from '../hooks/motionPrefs'
import AnimationPauseToggle from '../components/AnimationPauseToggle'
import { elementOverlay } from '../data/elementSelection'

interface Props {
  demo: SpaceGroupDemo
}

export default function SpaceGroupPage({ demo }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(1)
  const [motifStyle, setMotifStyle] = useMotifStyle()
  const [animateToken, setAnimateToken] = useState(0)
  const [replayStatus, setReplayStatus] = useState('')
  const motionOff = useMotionOff()
  const animPaused = useAnimationsPaused()
  // Clear the replay status when motion turns off (not re-announced later).
  const [prevMotionOff, setPrevMotionOff] = useState(motionOff)
  if (prevMotionOff !== motionOff) {
    setPrevMotionOff(motionOff)
    if (motionOff) setReplayStatus('')
  }
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
    setMultState({
      sg: demo.meta.number,
      value: setAxisCapped(multiples, axis, n, demo.operators.length, SG_MOTIF_CAP),
    })
  }
  const [showAllSites, setShowAllSites] = useState(
    () => demo.meta.multiplicity <= 48,
  )
  /** On narrow screens: which pane is primary. Desktop ignores this. */
  const [mobilePane, setMobilePane] = useState<'3d' | '2d'>('3d')

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index)
    setReplayStatus('')
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

  const selection = useMemo(
    () => selectionLabels(demo, selectedIndex, placementMode),
    [demo, selectedIndex, placementMode],
  )
  const overlay = useMemo(
    () => elementOverlay(demo, selectedIndex, placementMode),
    [demo, selectedIndex, placementMode],
  )
  const liveStatus = `${selection.caption} Placement ${
    placementMode === 'nearest' ? 'Near' : 'Wrap'
  }.${showAllSites ? '' : ' Showing BASE and IMAGE only.'}`

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
              {legendClasses(demo, [selection.shownClass.id]).map((c) => (
                <span key={c.id} className="legend-item">
                  <span className="swatch" style={{ background: c.color }} />
                  {c.label}
                </span>
              ))}
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
                <span className="chip element">⊙</span> centre
                <span className="sep">·</span>
                <span className="chip element">‖</span> axis
                <span className="sep">·</span>
                <span className="chip element">▭</span> mirror / glide
                <span className="sep">·</span>
                {overlay.limited
                  ? overlay.note
                  : 'selected element (the shown copy\'s) emphasized; others faint'}
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
            <MotifStylePicker value={motifStyle} onChange={setMotifStyle} />
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
          <SupercellPicker
            id="sg-supercell"
            multiples={multiples}
            onAxis={setAxis}
            onReset={() => {
              setMultState({ sg: demo.meta.number, value: DEFAULT_MULTIPLES })
              setResetToken((t) => t + 1)
            }}
            perCell={demo.operators.length}
            cap={SG_MOTIF_CAP}
          />
        )}
        {selectedIndex !== 1 && (
          <div className="op-motion" data-op-kind={selection.canonical.kind} data-shown-kind={selection.shown.kind}>
            <div className="op-motion-row">
              <p className="op-motion-lead">
                {selection.motion.plain}
                {motionOff && (
                  <span className="op-motion-still" id="op-motion-still-note">
                    {' '}
                    {animPaused ? 'Animations are paused' : 'Reduced motion is on'}: showing the end position.
                  </span>
                )}
              </p>
              {animPaused && <AnimationPauseToggle className="btn-ghost" />}
              <button
                type="button"
                className="btn op-replay"
                onClick={() => {
                  setAnimateToken((t) => t + 1)
                  // Alternate a trailing no-break space so a repeated Replay is announced again.
                  setReplayStatus((prev) => `Replaying op ${selectedIndex}.${prev.endsWith('\u00a0') ? '' : '\u00a0'}`)
                }}
                disabled={motionOff}
                aria-describedby={motionOff ? 'op-motion-still-note' : undefined}
                title={motionOff ? 'Animations are off; the end position is shown' : 'Replay the ghost path from BASE to IMAGE'}
              >
                <span aria-hidden="true">▶</span> Replay
              </button>
            </div>
            <details className="op-motion-details">
              <summary>Operation details</summary>
              <p>
                <strong>
                  Op {selection.op.index} <span className="mono nowrap">{selection.op.triplet}</span>
                </strong>
                {': '}
                <span className="op-motion-label">{selection.canonical.label}</span>
                {' · ITA '}
                <span className="mono nowrap op-motion-symbol">{selection.canonical.symbol}</span>
              </p>
              {selection.shifted && (
                <p className="op-motion-copy">
                  Shown copy adds lattice <span className="mono nowrap">{fmtVec(selection.shift)}</span>
                  {selection.kindDiffers ? (
                    <>
                      {': '}
                      {selection.shown.label} · <span className="mono nowrap">{selection.shown.symbol}</span>
                    </>
                  ) : (
                    <>
                      {' '}(<span className="mono nowrap">{selection.shown.symbol}</span>)
                    </>
                  )}
                  . Near and Wrap can draw different lattice copies of the same operation.
                </p>
              )}
              <p className="op-motion-path">{selection.motion.lead}</p>
              {selection.motion.notes.map((n) => (
                <p key={n} className="op-motion-note">
                  {n}
                </p>
              ))}
            </details>
          </div>
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
                title={`${op.triplet} · ${opClass(demo, op).label}`}
                aria-pressed={active}
                aria-label={`Operator ${op.index}: ${op.triplet}, ${opClass(demo, op).label}`}
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
              motifStyle={motifStyle}
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
            multiples={canSupercell ? multiples : undefined}
          />
        </div>
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveStatus}
        </div>
        <div className="sr-only" role="status" aria-live="polite">
          {replayStatus}
        </div>
        <footer className="viewport-footer">
          <span className="viewport-footer-text">
            {demo.meta.hm} ({demo.meta.number}) · BASE always marked · click an
            operator (or a 2D site) to highlight IMAGE, connector, and its geometric
            element (⊙ center · ‖ axis · ▭ glide)
            {placementMode === 'nearest'
              ? ' · Near (3D + 2D) may sit just outside the cell (UCL-style)'
              : ' · Wrap motifs into [0, 1)³ / [0, 1)²'}
            {' · Ghost path: turns about the real axis (screws also advance),'}
            {' reflects through the real plane (glides also slide), or shrinks'}
            {' through the inversion centre; in-between frames are not symmetry operations'}
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
            <VisitCounter silent />
          </span>
        </footer>
      </main>
    </div>
  )
}
