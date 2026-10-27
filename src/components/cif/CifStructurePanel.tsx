import type { KeyboardEvent } from 'react'
import AsuDiagram from './AsuDiagram'
import { Link } from 'react-router-dom'
import { operatorColor } from '../../data/cif/operatorColors'
import type { ExpandedStructure } from '../../data/cif/types'
import { isImproper } from '../../data/math'
import { describeCifStructure } from '../../data/a11y/structureSummary'
import type { Operator, SpaceGroupDemo } from '../../data/types'

export interface CifStructurePanelProps {
  structure: ExpandedStructure
  selectedOp: number
  onSelectOp: (index: number) => void
  moleculesForOp: Map<number, number>
  atomCountForOp: (opIndex: number) => number
  onOpKeyDown: (e: KeyboardEvent<HTMLUListElement>) => void
  elementDemo: SpaceGroupDemo | null
  selected: Operator | null
}

export default function CifStructurePanel({
  structure,
  selectedOp,
  onSelectOp,
  moleculesForOp,
  atomCountForOp,
  onOpKeyDown,
  elementDemo,
  selected,
}: CifStructurePanelProps) {
  const summary = describeCifStructure(structure)

  return (
    <>
      <section className="seed-box" aria-labelledby="cif-structure-heading">
        <h2 id="cif-structure-heading">Structure</h2>
        <p className="sr-only" aria-live="polite">
          {summary}
        </p>
        {(structure.metadata?.name || structure.metadata?.formula) && (
          <p
            className="cif-struct-name"
            title={structure.metadata.name ?? structure.metadata.formula}
          >
            {structure.metadata.name ?? structure.metadata.formula}
            {structure.metadata.name && structure.metadata.formula && (
              <span className="cif-formula">
                {' '}
                · {structure.metadata.formula}
              </span>
            )}
          </p>
        )}
        <AsuDiagram structure={structure} />
        <dl className="meta-grid">
          <div>
            <dt>Space group</dt>
            <dd>
              {structure.spaceGroupNumber != null ? (
                <Link to={`/sg/${structure.spaceGroupNumber}`}>
                  {structure.spaceGroupNumber}
                  {structure.spaceGroupName
                    ? ` · ${structure.spaceGroupName}`
                    : ''}{' '}
                  ↗
                </Link>
              ) : (
                structure.spaceGroupName ?? 'unknown'
              )}
            </dd>
          </div>
          <div>
            <dt>Cell</dt>
            <dd>
              {structure.cell.a.toFixed(2)} × {structure.cell.b.toFixed(2)} ×{' '}
              {structure.cell.c.toFixed(2)} Å
              {structure.cell.betaDeg && structure.cell.betaDeg !== 90
                ? ` · β ${structure.cell.betaDeg}°`
                : ''}
            </dd>
          </div>
          {structure.metadata?.zPrime != null && (
            <div className="cif-zprime">
              <dt title={structure.metadata.zPrimeNote}>
                Z′
                <span className="cif-zprime-hint" title={structure.metadata.zPrimeNote}>
                  <span aria-hidden>?</span>
                  <span className="sr-only">
                    {structure.metadata.zPrimeNote ?? 'Z prime note'}
                  </span>
                </span>
              </dt>
              <dd>
                <span title={structure.metadata.zPrimeNote}>
                  {structure.metadata.zPrime}
                  {structure.metadata.z != null
                    ? ` (Z = ${structure.metadata.z})`
                    : ''}
                  {structure.metadata.zPrimeSource === 'cif'
                    ? ' · CIF'
                    : structure.metadata.zPrimeSource === 'computed'
                      ? ' · Z/N_ops'
                      : ''}
                </span>
                {structure.metadata.zPrimeNote && (
                  <span className="cif-zprime-note hint">
                    {structure.metadata.zPrimeSource === 'cif'
                      ? 'From CIF tag'
                      : 'Z′ = Z / N_ops (general positions)'}
                  </span>
                )}
                {structure.metadata.zPrimeWarning && (
                  <span className="cif-zprime-warn" role="status">
                    {structure.metadata.zPrimeWarning}
                  </span>
                )}
              </dd>
            </div>
          )}
          {structure.metadata?.resolutionA != null && (
            <div>
              <dt>Resolution</dt>
              <dd>
                {structure.metadata.resolutionA.toFixed(2)} Å
                {structure.metadata.resolutionSource === 'theta'
                  ? ' · from θmax'
                  : ''}
              </dd>
            </div>
          )}
          <div>
            <dt>AU atoms</dt>
            <dd>{structure.asymmetric.length}</dd>
          </div>
          <div>
            <dt>Molecules</dt>
            <dd>
              {structure.moleculeCount} intact · {structure.operators.length}{' '}
              operators · {structure.atoms.length} sites
            </dd>
          </div>
        </dl>
        {structure.metadata?.literature && (
          <div className="cif-literature">
            <h3>Literature</h3>
            {structure.metadata.literature.title && (
              <p className="cif-lit-title">
                {structure.metadata.literature.title}
              </p>
            )}
            {structure.metadata.literature.citation && (
              <p className="hint">{structure.metadata.literature.citation}</p>
            )}
            {structure.metadata.literature.doi && (
              <p className="hint">
                <a
                  href={`https://doi.org/${structure.metadata.literature.doi}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  doi:{structure.metadata.literature.doi} ↗
                </a>
              </p>
            )}
          </div>
        )}
        {elementDemo?.geometryLimited && elementDemo.geometryNote && (
          <p className="hint cif-geometry-note">
            Symmetry overlays: {elementDemo.geometryNote}
          </p>
        )}
        {structure.warnings.length > 0 && (
          <ul className="cif-warnings">
            {structure.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="ops cif-ops">
        <h2>Symmetry operators</h2>
        <p className="hint">
          Each row is one symmetry operator (xyz
          {structure.operatorSource === 'cif'
            ? ', from the CIF'
            : structure.operatorSource === 'demo'
              ? ', ITA standard setting'
              : ''}
          ). The swatch matches the 3D molecule copy. Select a row to highlight
          that image; Op 1 is the asymmetric unit (BASE).
        </p>
        <ul
          className="op-list"
          role="listbox"
          aria-label="Symmetry operators"
          tabIndex={0}
          onKeyDown={onOpKeyDown}
        >
          {structure.operators.map((op) => {
            const active = op.index === selectedOp
            const color = operatorColor(op.index)
            const mols = moleculesForOp.get(op.index) ?? 0
            const sites = atomCountForOp(op.index)
            return (
              <li key={op.index} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`op-row${active ? ' active' : ''}${op.index === 1 ? ' is-base' : ''}`}
                  style={{ ['--op-color' as string]: color }}
                  onClick={() => onSelectOp(op.index)}
                  aria-pressed={active}
                >
                  <span className="op-index">{op.index}</span>
                  <span className="op-swatch" title={op.label} />
                  <span className="op-body">
                    <span className="op-triplet">{op.triplet}</span>
                    <span className="op-label">
                      {op.label}
                      {op.index === 1 ? ' · BASE' : ' · IMAGE'}
                      {' · '}
                      {isImproper(op.R) ? 'opposite hand' : 'same hand'}
                      {' · '}
                      {mols} mol · {sites} atoms
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {selected && (
        <section className="matrix-section cif-op-detail">
          <h2>
            Selected · op {selected.index}
            <span
              className="cif-op-dot"
              style={{ background: operatorColor(selected.index) }}
              aria-hidden
            />
          </h2>
          <dl className="meta-grid">
            <div>
              <dt>xyz (ITA)</dt>
              <dd className="mono">{selected.triplet}</dd>
            </div>
            <div>
              <dt>Seitz</dt>
              <dd className="mono">{selected.seitz}</dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>
                {selected.label} · {selected.classId}
              </dd>
            </div>
            <div>
              <dt>Chirality</dt>
              <dd>
                {isImproper(selected.R)
                  ? 'Improper — opposite hand'
                  : 'Proper — same hand'}
              </dd>
            </div>
          </dl>
        </section>
      )}
    </>
  )
}
