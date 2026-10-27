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
  const alpha = cell.alphaDeg ?? 90
  const beta = cell.betaDeg ?? 90
  const gamma = cell.gammaDeg ?? 90
  const orthorhombic =
    Math.abs(alpha - 90) < 1e-3 &&
    Math.abs(beta - 90) < 1e-3 &&
    Math.abs(gamma - 90) < 1e-3
  return (
    <div
      className={variant === 'strip' ? 'cif-cell-strip' : 'cif-cell-badge'}
      aria-label="Unit-cell parameters"
    >
      <span className="cif-cell-axis a">a {fmtLen(cell.a)} Å</span>
      <span className="cif-cell-axis b">b {fmtLen(cell.b)} Å</span>
      <span className="cif-cell-axis c">c {fmtLen(cell.c)} Å</span>
      {!orthorhombic && (
        <span className="cif-cell-angles">
          α {fmtAngle(alpha)}° · β {fmtAngle(beta)}° · γ {fmtAngle(gamma)}°
        </span>
      )}
      {orthorhombic && (
        <span className="cif-cell-angles">α = β = γ = 90°</span>
      )}
      <span className="cif-cell-origin">● O = origin (0,0,0)</span>
    </div>
  )
}
