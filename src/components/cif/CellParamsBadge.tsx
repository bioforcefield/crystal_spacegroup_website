import { useState } from 'react'
import type { CellParams } from '../../data/types'

function fmtLen(v: number): string {
  return v >= 10 ? v.toFixed(2) : v.toFixed(3)
}

function fmtAngle(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/** Compact HTML readout of lattice parameters (overlay on canvas or phone strip). */
export default function CellParamsBadge({
  cell,
  variant = 'overlay',
}: {
  cell: CellParams
  variant?: 'overlay' | 'strip'
}) {
  const [cellOpen, setCellOpen] = useState(false)
  const alpha = cell.alphaDeg ?? 90
  const beta = cell.betaDeg ?? 90
  const gamma = cell.gammaDeg ?? 90
  const orthorhombic =
    Math.abs(alpha - 90) < 1e-3 &&
    Math.abs(beta - 90) < 1e-3 &&
    Math.abs(gamma - 90) < 1e-3
  const anglesText = orthorhombic
    ? 'α = β = γ = 90°'
    : `α ${fmtAngle(alpha)}° · β ${fmtAngle(beta)}° · γ ${fmtAngle(gamma)}°`

  return (
    <div
      className={
        variant === 'strip'
          ? `cif-cell-strip${cellOpen ? ' is-expanded' : ''}`
          : `cif-cell-badge${cellOpen ? ' is-expanded' : ''}`
      }
      aria-label="Unit-cell parameters"
    >
      <span className="cif-cell-axis a">a {fmtLen(cell.a)} Å</span>
      <span className="cif-cell-axis b">b {fmtLen(cell.b)} Å</span>
      <span className="cif-cell-axis c">c {fmtLen(cell.c)} Å</span>
      <button
        type="button"
        className="cif-cell-more"
        aria-expanded={cellOpen}
        aria-controls={`cif-cell-details-${variant}`}
        onClick={() => setCellOpen((o) => !o)}
        title={cellOpen ? 'Hide angles and origin' : 'Show angles and origin'}
      >
        Cell{cellOpen ? ' · hide' : ''}
      </button>
      {cellOpen && (
        <div id={`cif-cell-details-${variant}`} className="cif-cell-details">
          <span className="cif-cell-angles">{anglesText}</span>
          <span className="cif-cell-origin">● O = origin (0,0,0)</span>
        </div>
      )}
    </div>
  )
}
