import { useCallback, useState, type CSSProperties } from 'react'
import { Navigate } from 'react-router-dom'
import OperatorPanel from '../components/OperatorPanel'
import SpaceGroupDiagram2D from '../components/SpaceGroupDiagram2D'
import UnitCellScene from '../components/UnitCellScene'
import { operatorClass } from '../data/math'
import type { PlacementMode } from '../data/nearestImages'
import type { SpaceGroupDemo } from '../data/types'

interface Props {
  demo: SpaceGroupDemo
}

export default function SpaceGroupPage({ demo }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(1)
  const [animateToken, setAnimateToken] = useState(0)
  const [resetToken, setResetToken] = useState(0)
  const [placementMode, setPlacementMode] = useState<PlacementMode>('nearest')
  const [showAllSites, setShowAllSites] = useState(true)

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index)
    setAnimateToken((t) => t + 1)
  }, [])

  const nOps = demo.operators.length

  return (
    <div className="app layout-demo">
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
              <span className="chip element">⊙</span> inversion
              <span className="sep">·</span>
              <span className="chip element">‖</span> 2 / 2₁
              <span className="sep">·</span>
              <span className="chip element">▭</span> glide plane
              <span className="sep">·</span>
              selected element emphasized; others faint
            </div>
          </div>
          <div className="toolbar-actions">
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
                title="Place BASE/IMAGE near the selected element (may leave the cell)"
              >
                Nearest images
              </button>
              <button
                type="button"
                className={
                  placementMode === 'wrapped' ? 'seg active' : 'seg'
                }
                onClick={() => setPlacementMode('wrapped')}
                title="Wrap every motif into the unit cell [0,1)³"
              >
                In cell
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
                title={`Show all ${nOps} general-position motifs`}
              >
                All sites
              </button>
              <button
                type="button"
                className={!showAllSites ? 'seg active' : 'seg'}
                onClick={() => setShowAllSites(false)}
                title="Show only BASE and its IMAGE under the selected operator"
              >
                BASE + IMAGE
              </button>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => setResetToken((t) => t + 1)}
            >
              Reset view
            </button>
          </div>
        </div>
        <div
          className="mobile-op-strip"
          role="listbox"
          aria-label="General-position operators"
        >
          {demo.operators.map((op) => {
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
              >
                <span className="op-chip-idx">{op.index}</span>
                <span className="op-chip-triplet">{op.triplet}</span>
              </button>
            )
          })}
        </div>
        <div className="viewport-body">
          <div className="canvas-wrap">
            <UnitCellScene
              demo={demo}
              selectedIndex={selectedIndex}
              animateToken={animateToken}
              placementMode={placementMode}
              showAllSites={showAllSites}
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
        <footer className="viewport-footer">
          {demo.meta.hm} ({demo.meta.number}) · BASE always marked · click an
          operator (or a 2D site) to highlight IMAGE, connector, and its geometric
          element (⊙ center · ‖ axis · ▭ glide)
          {placementMode === 'nearest'
            ? ' · Nearest images (3D + 2D) may sit just outside the cell (UCL-style)'
            : ' · In cell wraps motifs into [0, 1)³ / [0, 1)²'}
          {!showAllSites ? ' · Showing only BASE + IMAGE' : ''}
          {demo.cell.betaDeg && demo.cell.betaDeg !== 90
            ? ` · Monoclinic β = ${demo.cell.betaDeg}°`
            : ''}
          {demo.cell.gammaDeg && demo.cell.gammaDeg !== 90
            ? ` · Hexagonal γ = ${demo.cell.gammaDeg}°`
            : ''}
        </footer>
      </main>
    </div>
  )
}

/** Route helper: resolve demo or redirect home. */
export function DemoById({ id }: { id: string }) {
  // lazy import avoided — parent passes resolved demo
  void id
  return <Navigate to="/" replace />
}
