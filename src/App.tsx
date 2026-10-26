import { useCallback, useState } from 'react'
import OperatorPanel from './components/OperatorPanel'
import UnitCellScene from './components/UnitCellScene'
import { CLASS_LEGEND_ORDER, SYMMETRY_CLASSES } from './data/pbca'

export default function App() {
  const [selectedIndex, setSelectedIndex] = useState(1)
  const [animateToken, setAnimateToken] = useState(0)
  const [resetToken, setResetToken] = useState(0)

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
              <span className="chip proper">solid</span> proper (same hand)
              <span className="sep">·</span>
              <span className="chip mirrored">mirrored</span> improper
              (opposite hand)
              <span className="sep">·</span>
              <span className="chip base">BASE</span>
              <span className="sep">→</span>
              <span className="chip image">IMAGE</span>
            </div>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => setResetToken((t) => t + 1)}
          >
            Reset view
          </button>
        </div>
        <div className="canvas-wrap">
          <UnitCellScene
            selectedIndex={selectedIndex}
            animateToken={animateToken}
            onSelectPoint={handleSelect}
            resetToken={resetToken}
          />
        </div>
        <footer className="viewport-footer">
          Session 1 demo — Pbca only · BASE always marked · click an operator to
          highlight IMAGE + dashed connector
        </footer>
      </main>
    </div>
  )
}
