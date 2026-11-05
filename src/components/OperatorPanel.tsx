import type { CSSProperties, KeyboardEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
import ItaDiagramGuide from './ItaDiagramGuide'

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
  const listRef = useRef<HTMLUListElement>(null)
  const [itaOpen, setItaOpen] = useState(false)
  const itaBtnRef = useRef<HTMLButtonElement>(null)
  const itaModalRef = useRef<HTMLDivElement>(null)
  const itaRestoreFocusTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!itaOpen) return
    if (itaRestoreFocusTimer.current != null) {
      window.clearTimeout(itaRestoreFocusTimer.current)
      itaRestoreFocusTimer.current = null
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setItaOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Focus the close control so Esc / screen readers land inside the dialog.
    itaModalRef.current
      ?.querySelector<HTMLButtonElement>('.ita-close')
      ?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      const btn = itaBtnRef.current
      // Defer past native mouseup/click after backdrop mousedown-unmount, which
      // otherwise moves focus to <body> after a synchronous focus() in cleanup.
      itaRestoreFocusTimer.current = window.setTimeout(() => {
        itaRestoreFocusTimer.current = null
        btn?.focus()
      }, 0)
    }
  }, [itaOpen])

  const onListKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const idxs = listedOps.map((o) => o.index)
    if (idxs.length === 0) return
    const cur = idxs.indexOf(selectedIndex)
    let next = cur
    if (e.key === 'ArrowDown') next = cur < 0 ? 0 : Math.min(idxs.length - 1, cur + 1)
    if (e.key === 'ArrowUp') next = cur < 0 ? 0 : Math.max(0, cur - 1)
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = idxs.length - 1
    const idx = idxs[next]
    if (idx != null) onSelect(idx)
  }

  return (
    <aside className="panel" id="demo-sidebar">
      <header className="panel-header">
        <div className="panel-nav-row">
          <Link to="/" className="back-link">
            ← All space groups
          </Link>
          <Link to="/cif" className="back-link cif-jump">
            Lattice Lab
          </Link>
        </div>
        <p className="eyebrow">Space group</p>
        <h1>
          {meta.number} · {meta.hm}
          {demo.demoSource === 'generated' ? (
            <span
              className="demo-source-badge"
              title="Built automatically from ITA general positions — not a hand-tuned teaching pack"
            >
              Generated
            </span>
          ) : demo.demoSource === 'hand' ? (
            <span
              className="demo-source-badge hand"
              title="Hand-polished teaching demo"
            >
              Hand-tuned
            </span>
          ) : null}
        </h1>
        <p className="blurb">{meta.blurb}</p>
        {demo.geometryLimited && demo.geometryNote ? (
          <p className="geometry-note panel-geometry-note" role="note">
            {demo.geometryNote}
          </p>
        ) : null}
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
            <div className="ita-diagram-actions">
              <button
                ref={itaBtnRef}
                type="button"
                className="btn btn-small ita-enlarge"
                data-testid="ita-enlarge"
                onClick={() => setItaOpen(true)}
                aria-label={`Enlarge ITA Vol. A diagram for space group ${meta.number}`}
                title="Enlarge"
              >
                ⤢ Enlarge
              </button>
              <ItaDiagramGuide spaceGroupNumber={meta.number} hm={meta.hm} />
            </div>
            {itaOpen &&
              createPortal(
                <div
                  className="ita-modal-backdrop"
                  data-testid="ita-modal-backdrop"
                  onMouseDown={(e) => {
                    if (e.target !== e.currentTarget) return
                    // Avoid the backdrop taking focus before unmount + restore.
                    e.preventDefault()
                    setItaOpen(false)
                  }}
                >
                  <div
                    ref={itaModalRef}
                    className="ita-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Enlarged ITA Vol. A diagram for space group ${meta.number} (${meta.hm})`}
                    data-testid="ita-modal"
                  >
                    <div className="ita-modal-bar">
                      <strong>
                        ITA Vol. A · {meta.number} · {meta.hm}
                      </strong>
                      <span className="ita-modal-actions">
                        <button
                          type="button"
                          className="btn btn-small ita-close"
                          data-testid="ita-close"
                          onClick={() => setItaOpen(false)}
                          aria-label="Close (Esc)"
                        >
                          ✕
                        </button>
                      </span>
                    </div>
                    <div className="ita-modal-plate">
                      <img
                        src={itaUrl}
                        alt={`International Tables Vol. A diagram for space group ${meta.number} (${meta.hm}), enlarged`}
                        decoding="async"
                      />
                    </div>
                    <p className="ita-modal-credit" title={ITA_DIAGRAM_CREDIT}>
                      {ITA_DIAGRAM_CAPTION} · © IUCr · Vol. A · Esc or backdrop to
                      close
                    </p>
                  </div>
                </div>,
                document.body,
              )}
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
          3D and 2D both follow Near / Wrap.
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
        <ul
          className="op-list"
          role="listbox"
          aria-label="General-position operators"
          tabIndex={0}
          ref={listRef}
          onKeyDown={onListKeyDown}
        >
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
                  role="option"
                  aria-selected={active}
                  aria-pressed={active}
                  aria-label={`Operator ${op.index}: ${op.triplet}, ${op.label}${op.index === 1 ? ', BASE' : active ? ', IMAGE' : ''}`}
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
