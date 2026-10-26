import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import {
  OPERATORS,
  META,
  SEED,
  isImproper,
  operatorClass,
  CLASS_LEGEND_ORDER,
  SYMMETRY_CLASSES,
  type Operator,
} from '../data/pbca'
import { elementLocusForOp } from '../data/symmetryElements'
import {
  placedPositions,
  type PlacementMode,
} from '../data/nearestImages'

interface Props {
  selectedIndex: number
  onSelect: (index: number) => void
  placementMode: PlacementMode
}

function formatFrac(v: number): string {
  return v
    .toFixed(3)
    .replace(/\.?0+$/, (m) =>
      m.includes('.') ? m.replace(/0+$/, '').replace(/\.$/, '') : m,
    )
}

function formatVec(v: [number, number, number]): string {
  return `(${v.map(formatFrac).join(', ')})`
}

function MatrixBlock({ op }: { op: Operator }) {
  const rows = op.R.map(
    (row, i) =>
      `[ ${row.map((n) => (n === 0 ? ' 0' : n > 0 ? ` ${n}` : `${n}`)).join('  ')} | ${op.t[i] === 0 ? '0' : op.t[i] === 0.5 ? '½' : String(op.t[i])} ]`,
  )
  return (
    <pre className="matrix-block" aria-label="Seitz matrix">
      {rows.join('\n')}
    </pre>
  )
}

export default function OperatorPanel({
  selectedIndex,
  onSelect,
  placementMode,
}: Props) {
  const selected = OPERATORS.find((o) => o.index === selectedIndex) ?? OPERATORS[0]
  const selectedClass = operatorClass(selected)
  const placement = useMemo(
    () => placedPositions(selectedIndex, placementMode),
    [selectedIndex, placementMode],
  )
  const basePoint =
    placement.points.find((p) => p.index === 1) ?? placement.points[0]
  const imagePoint =
    placement.points.find((p) => p.index === selectedIndex) ?? basePoint
  const imageLabel =
    placementMode === 'nearest' ? 'IMAGE (nearest)' : 'IMAGE (in cell)'
  const baseLabel =
    placementMode === 'nearest' ? 'BASE (nearest)' : 'BASE (in cell)'

  return (
    <aside className="panel">
      <header className="panel-header">
        <p className="eyebrow">Space group</p>
        <h1>
          {META.number} · {META.hm}
        </h1>
        <p className="blurb">{META.blurb}</p>
        <dl className="meta-grid">
          <div>
            <dt>System</dt>
            <dd>{META.system}</dd>
          </div>
          <div>
            <dt>Point group</dt>
            <dd>{META.pointGroup}</dd>
          </div>
          <div>
            <dt>Lattice</dt>
            <dd>{META.lattice}</dd>
          </div>
          <div>
            <dt>Multiplicity</dt>
            <dd>{META.multiplicity}</dd>
          </div>
        </dl>
      </header>

      <section className="seed-box">
        <h2>Asymmetric seed · BASE</h2>
        <p>
          Seed (x, y, z) = {formatVec(SEED)}
        </p>
        <p>
          {baseLabel}: {formatVec(basePoint.fractional)}
        </p>
        <p className="muted">
          {imageLabel} under op {selected.index} ({selectedClass.label}):{' '}
          {formatVec(imagePoint.fractional)}
        </p>
        <p className="hint seed-note">
          3D and 2D both follow Nearest images / In cell.
        </p>
      </section>

      <section className="class-legend-panel">
        <h2>Symmetry classes</h2>
        <ul className="class-legend-list">
          {CLASS_LEGEND_ORDER.map((id) => {
            const c = SYMMETRY_CLASSES[id]
            return (
              <li key={id}>
                <span className="swatch" style={{ background: c.color }} />
                {c.label}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="ops">
        <h2>General-position operators</h2>
        <p className="hint">
          Click a row — BASE stays marked; IMAGE and the dashed connector update.
        </p>
        <ul className="op-list">
          {OPERATORS.map((op) => {
            const active = op.index === selectedIndex
            const cls = operatorClass(op)
            return (
              <li key={op.index}>
                <button
                  type="button"
                  className={`op-row${active ? ' active' : ''}${op.index === 1 ? ' is-base' : ''}`}
                  style={
                    {
                      ['--op-color' as string]: cls.color,
                    } as CSSProperties
                  }
                  onClick={() => onSelect(op.index)}
                  aria-pressed={active}
                >
                  <span className="op-index">{op.index}</span>
                  <span className="op-swatch" title={cls.label} />
                  <span className="op-body">
                    <span className="op-triplet">{op.triplet}</span>
                    <span className="op-label">
                      {op.label}
                      {op.index === 1 ? ' · BASE' : ''}
                      {active && op.index !== 1 ? ' · IMAGE' : ''}
                      {' · '}
                      {isImproper(op.R) ? 'opposite hand' : 'same hand'}
                    </span>
                    <span className="op-seitz">
                      {cls.label} · {op.seitz}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="matrix-section">
        <h2>Selected operator matrix</h2>
        <p className="hint">
          x′ = R x + t &nbsp;·&nbsp; {selected.seitz}
        </p>
        <MatrixBlock op={selected} />
        {elementLocusForOp(selected.index) && (
          <p className="element-locus">
            Element · {elementLocusForOp(selected.index)}
          </p>
        )}
      </section>
    </aside>
  )
}
