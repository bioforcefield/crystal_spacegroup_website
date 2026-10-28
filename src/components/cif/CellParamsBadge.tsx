import type { CellParams } from '../../data/types'
import { cellBadgeModel } from '../../data/cif/cellBadgeModel'

/** Compact HTML readout of lattice parameters (toolbar strip above canvas; overlay variant unused in explorer). */
export default function CellParamsBadge({
  cell,
  variant = 'overlay',
}: {
  cell: CellParams
  variant?: 'overlay' | 'strip'
}) {
  const model = cellBadgeModel(cell)
  const rootClass = variant === 'strip' ? 'cif-cell-strip' : 'cif-cell-badge'

  return (
    <div className={rootClass} aria-label="Unit-cell parameters">
      <div className="cif-cell-badge-row">
        <span className="cif-cell-axis a">{model.aText}</span>
        <span className="cif-cell-axis b">{model.bText}</span>
        <span className="cif-cell-axis c">{model.cText}</span>
      </div>
      <div className="cif-cell-badge-row cif-cell-badge-meta">
        <span className="cif-cell-angles">{model.anglesText}</span>
        <span className="cif-cell-origin" title="Crystallographic origin">
          ● {model.originText}
        </span>
      </div>
    </div>
  )
}
