import type { CSSProperties } from 'react'
import {
  OPERATORS,
  META,
  SEED,
  applyOperator,
  isImproper,
  operatorClass,
  CLASS_LEGEND_ORDER,
  SYMMETRY_CLASSES,
  type Operator,
} from '../data/pbca'

interface Props {
  selectedIndex: number
  onSelect: (index: number) => void
}

function formatFrac(v: number): string {
  return v
    .toFixed(3)
    .replace(/\.?0+$/, (m) =>
      m.includes('.') ? m.replace(/0+$/, '').replace(/\.$/, '') : m,
    )
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

export default function OperatorPanel({ selectedIndex, onSelect }: Props) {
  const selected = OPERATORS.find((o) => o.index === selectedIndex) ?? OPERATORS[0]
  const image = applyOperator(selected, SEED)
  const selectedClass = operatorClass(selected)

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
          (x, y, z) = ({SEED.map(formatFrac).join(', ')})
        </p>
        <p className="muted">
          IMAGE under op {selected.index} ({selectedClass.label}): (
          {image.map(formatFrac).join(', ')})
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
      </section>
    </aside>
  )
}
