import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { isImproper, operatorClass } from '../data/math'
import type { Operator, SpaceGroupDemo } from '../data/types'
import {
  placedPositions,
  type PlacementMode,
} from '../data/nearestImages'
import {
  UCL_DIAGRAM_CREDIT,
  UCL_DIAGRAM_LINK_LABEL,
  uclSpaceGroupDiagramUrl,
} from '../data/uclDiagram'
import {
  ITA_DIAGRAM_CAPTION,
  ITA_DIAGRAM_CREDIT,
  itaDiagramUrl,
} from '../data/itaDiagram'

interface Props {
  demo: SpaceGroupDemo
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
  demo,
  selectedIndex,
  onSelect,
  placementMode,
}: Props) {
  const selected =
    demo.operators.find((o) => o.index === selectedIndex) ?? demo.operators[0]
  const selectedClass = operatorClass(demo, selected)
  const focus = demo.operatorFocusIndices
  const [showAllOps, setShowAllOps] = useState(false)
  const listedOps = useMemo(() => {
    if (!focus || focus.length === 0 || showAllOps) return demo.operators
    const set = new Set(focus)
    // Always include the selected op so it stays visible
    set.add(selectedIndex)
    return demo.operators.filter((o) => set.has(o.index))
  }, [demo.operators, focus, showAllOps, selectedIndex])
  const placement = useMemo(
    () => placedPositions(demo, selectedIndex, placementMode),
    [demo, selectedIndex, placementMode],
  )
  const basePoint =
    placement.points.find((p) => p.index === 1) ?? placement.points[0]
  const imagePoint =
    placement.points.find((p) => p.index === selectedIndex) ?? basePoint
  const imageLabel =
    placementMode === 'nearest' ? 'IMAGE (nearest)' : 'IMAGE (in cell)'
  const baseLabel =
    placementMode === 'nearest' ? 'BASE (nearest)' : 'BASE (in cell)'
  const { meta } = demo
  const uclUrl = uclSpaceGroupDiagramUrl(meta.number)
  const itaUrl = itaDiagramUrl(meta.number)
  const alpha = demo.cell.alphaDeg
  const beta = demo.cell.betaDeg
  const gamma = demo.cell.gammaDeg

  return (
    <aside className="panel">
      <header className="panel-header">
        <Link to="/" className="back-link">
          ← All space groups
        </Link>
        <p className="eyebrow">Space group</p>
        <h1>
          {meta.number} · {meta.hm}
        </h1>
        <p className="blurb">{meta.blurb}</p>
        <div className="ref-links">
          <a
            className="ucl-diagram-link"
            href={uclUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={UCL_DIAGRAM_CREDIT}
          >
            {UCL_DIAGRAM_LINK_LABEL} ↗
          </a>
          <span className="ref-sep" aria-hidden>
            ·
          </span>
          <span className="ref-credit" title={UCL_DIAGRAM_CREDIT}>
            Birkbeck / UCL
          </span>
        </div>
        {itaUrl && (
          <figure className="ita-diagram">
            <img
              src={itaUrl}
              alt={`International Tables Vol. A diagram for space group ${meta.number} (${meta.hm})`}
              loading="lazy"
              decoding="async"
              width={280}
              height={280}
            />
            <figcaption>
              <span className="ita-caption">{ITA_DIAGRAM_CAPTION}</span>
              <span className="ita-credit" title={ITA_DIAGRAM_CREDIT}>
                © IUCr · Vol. A
              </span>
            </figcaption>
          </figure>
        )}
        <dl className="meta-grid">
          <div>
            <dt>System</dt>
            <dd>{meta.system}</dd>
          </div>
          <div>
            <dt>Point group</dt>
            <dd>{meta.pointGroup}</dd>
          </div>
          <div>
            <dt>Lattice</dt>
            <dd>{meta.lattice}</dd>
          </div>
          <div>
            <dt>Multiplicity</dt>
            <dd>{meta.multiplicity}</dd>
          </div>
          {alpha != null && alpha !== 90 && (
            <div>
              <dt>α (teaching)</dt>
              <dd>{alpha}°</dd>
            </div>
          )}
          {beta != null && beta !== 90 && (
            <div>
              <dt>β (teaching)</dt>
              <dd>{beta}°</dd>
            </div>
          )}
          {gamma != null && gamma !== 90 && (
            <div>
              <dt>γ (teaching)</dt>
              <dd>{gamma}°</dd>
            </div>
          )}
        </dl>
      </header>

      <section className="seed-box">
        <h2>Asymmetric seed · BASE</h2>
        <p>Seed (x, y, z) = {formatVec(demo.seed)}</p>
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
          {demo.classLegendOrder.map((id) => {
            const c = demo.symmetryClasses[id]
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
          {focus && focus.length > 0 && !showAllOps
            ? ` Showing ${listedOps.length} teaching ops of ${demo.operators.length}.`
            : ''}
        </p>
        {focus && focus.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost op-expand"
            onClick={() => setShowAllOps((v) => !v)}
          >
            {showAllOps
              ? `Show teaching shortlist (${focus.length})`
              : `Show all ${demo.operators.length} operators`}
          </button>
        )}
        <ul className="op-list">
          {listedOps.map((op) => {
            const active = op.index === selectedIndex
            const cls = operatorClass(demo, op)
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
        {demo.elementLocusForOp(selected.index) && (
          <p className="element-locus">
            Element · {demo.elementLocusForOp(selected.index)}
          </p>
        )}
      </section>
    </aside>
  )
}
