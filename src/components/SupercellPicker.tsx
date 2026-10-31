import {
  SUPERCELL_MAX,
  cellCount,
  fitsCap,
  isDefaultMultiples,
  type CellMultiples,
} from '../data/supercell'
import { axisOptionState } from '../data/cif/viewportUi'

export default function SupercellPicker({
  id,
  multiples,
  onAxis,
  onReset,
  perCell,
  cap,
  unit = 'motifs',
  disabled = false,
  strictCap = false,
  compact = false,
}: {
  id: string
  multiples: CellMultiples
  onAxis: (axis: 0 | 1 | 2, n: number) => void
  onReset: () => void
  perCell: number
  cap: number
  unit?: string
  disabled?: boolean
  /** Disable options that would exceed the cap given the other axes (with reason). */
  strictCap?: boolean
  /** Compact (CIF lattice strip): hide Reset at 1×1×1 and the default hint. */
  compact?: boolean
}) {
  const isDefault = isDefaultMultiples(multiples)
  const total = perCell * cellCount(multiples)
  const heavy = !fitsCap([1, 1, 2], perCell, cap)
  return (
    <div className={`supercell-control${compact ? ' supercell-compact' : ''}`} role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="supercell-title">
        Supercell
      </span>
      {(['a', 'b', 'c'] as const).map((ax, i) => (
        <label key={ax} className="supercell-axis">
          <span className="supercell-axis-name">{ax}</span>
          <select
            value={multiples[i]}
            disabled={disabled}
            onChange={(e) => onAxis(i as 0 | 1 | 2, Number(e.target.value))}
            aria-label={`Cells along ${ax}`}
            title={`Number of unit cells along ${ax}`}
          >
            {Array.from({ length: SUPERCELL_MAX }, (_, k) => k + 1).map((n) => {
              // Options stay selectable; other axes shrink to fit. Only mark ones that can never fit.
              const solo: CellMultiples = [1, 1, 1]
              solo[i] = n
              if (strictCap) {
                const st = axisOptionState(multiples, i as 0 | 1 | 2, n, perCell, cap)
                return (
                  <option key={n} value={n} disabled={st.disabled} title={st.reason ?? undefined}>
                    {st.disabled ? `${n} (over cap)` : n}
                  </option>
                )
              }
              return (
                <option key={n} value={n} disabled={!fitsCap(solo, perCell, cap)}>
                  {n}
                </option>
              )
            })}
          </select>
          {i < 2 && (
            <span className="supercell-times" aria-hidden="true">
              ×
            </span>
          )}
        </label>
      ))}
      {!(compact && isDefault) && (
      <button
        type="button"
        className="btn btn-small"
        onClick={onReset}
        disabled={disabled || isDefault}
        title="Reset a, b, c to 1×1×1 and reframe the camera on the unit cell"
      >
        Reset to unit cell
      </button>
      )}
      <span className="supercell-help" aria-live="polite">
        {heavy
          ? `Large structure (${perCell} ${unit}/cell): supercell disabled to keep the view responsive`
          : isDefault
            ? compact
              ? ''
              : 'Repeat the cell along a, b, c'
            : `${multiples.join('×')} cells · ${total.toLocaleString()} ${unit} (max ${cap.toLocaleString()})`}
      </span>
    </div>
  )
}
