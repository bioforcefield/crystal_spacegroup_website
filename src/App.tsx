import { useCallback, useState } from 'react'
import OperatorPanel from './components/OperatorPanel'
import SpaceGroupDiagram2D from './components/SpaceGroupDiagram2D'
import UnitCellScene from './components/UnitCellScene'
import { CLASS_LEGEND_ORDER, SYMMETRY_CLASSES } from './data/pbca'
import type { PlacementMode } from './data/nearestImages'

export default function App() {
  const [selectedIndex, setSelectedIndex] = useState(1)
  const [animateToken, setAnimateToken] = useState(0)
  const [resetToken, setResetToken] = useState(0)
  const [placementMode, setPlacementMode] = useState<PlacementMode>('nearest')

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index)
    setAnimateToken((t) => t + 1)
  }, [])

  return (
    <div className="app">
      <OperatorPanel selectedIndex={selectedIndex} onSelect={handleSelect} />

      <main className="viewport">
        <div className="viewport-toolbar">
          <div className="legend-stack">
            <div className="legend class-legend">
              {CLASS_LEGEND_ORDER.map((id) => {
                const c = SYMMETRY_CLASSES[id]
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
              <span className="chip element">‖</span> 2₁ screw
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
            <button
              type="button"
              className="btn"
              onClick={() => setResetToken((t) => t + 1)}
            >
              Reset view
            </button>
          </div>
        </div>
        <div className="viewport-body">
          <div className="canvas-wrap">
            <UnitCellScene
              selectedIndex={selectedIndex}
              animateToken={animateToken}
              placementMode={placementMode}
              onSelectPoint={handleSelect}
              resetToken={resetToken}
            />
          </div>
          <SpaceGroupDiagram2D
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
          />
        </div>
        <footer className="viewport-footer">
          Session 1 demo — Pbca only · BASE always marked · click an operator (or
          a 2D site) to highlight IMAGE, connector, and its geometric element (⊙
          center · ‖ screw · ▭ glide)
          {placementMode === 'nearest'
            ? ' · Nearest images may sit just outside the wireframe cell (UCL-style)'
            : ' · In cell wraps every motif into [0, 1)³'}
          {' · 2D diagram uses wrapped [0,1)² positions'}
        </footer>
      </main>
    </div>
  )
}
