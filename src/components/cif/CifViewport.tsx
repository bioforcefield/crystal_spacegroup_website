import { Suspense, lazy } from 'react'
import CellParamsBadge from './CellParamsBadge'
import type { CifPlacementMode, CifVisibility } from './cifViewTypes'
import { operatorColor } from '../../data/cif/operatorColors'
import type { ExpandedStructure } from '../../data/cif/types'
import type { SpaceGroupDemo } from '../../data/types'

const CifStructureScene = lazy(() => import('../CifStructureScene'))

export interface CifViewportProps {
  structure: ExpandedStructure | null
  selectedOp: number
  onSelectOp: (index: number) => void
  visibility: CifVisibility
  onVisibilityChange: (v: CifVisibility) => void
  placementMode: CifPlacementMode
  onPlacementModeChange: (m: CifPlacementMode) => void
  showSymmetryElements: boolean
  onToggleSymmetryElements: () => void
  canShowElements: boolean
  elementCount: number
  elementDemo: SpaceGroupDemo | null
  resetToken: number
  onResetView: () => void
}

export default function CifViewport({
  structure,
  selectedOp,
  onSelectOp,
  visibility,
  onVisibilityChange,
  placementMode,
  onPlacementModeChange,
  showSymmetryElements,
  onToggleSymmetryElements,
  canShowElements,
  elementCount,
  elementDemo,
  resetToken,
  onResetView,
}: CifViewportProps) {
  return (
    <main className="viewport">
      <div className="viewport-toolbar">
        <div className="legend-stack">
          <div className="legend class-legend">
            {structure ? (
              structure.operators.slice(0, 12).map((op) => (
                <button
                  key={op.index}
                  type="button"
                  className={`legend-item cif-legend-op${op.index === selectedOp ? ' active' : ''}`}
                  onClick={() => onSelectOp(op.index)}
                  title={op.triplet}
                >
                  <span
                    className="swatch"
                    style={{ background: operatorColor(op.index) }}
                  />
                  op {op.index}
                  {op.index === 1 ? ' (AU)' : ''}
                </button>
              ))
            ) : (
              <span className="legend-item muted">
                Upload a CIF to map intact molecules by symmetry operator
              </span>
            )}
            {structure && structure.operators.length > 12 && (
              <span className="legend-item muted">
                +{structure.operators.length - 12} more
              </span>
            )}
          </div>
          <div className="legend chirality">
            Ball ≈ element · tint ≈ operator · bonds keep each molecule intact
            (min-image unwrap)
            {canShowElements && showSymmetryElements
              ? ' · overlays: screws / glides / inversions / mirrors (loci on this cell)'
              : ''}
          </div>
          {elementDemo && showSymmetryElements && canShowElements && (
            <div
              className="legend elements-legend"
              aria-label="Symmetry element classes"
            >
              {elementDemo.classLegendOrder
                .filter((id) => id !== 'identity')
                .map((id) => {
                  const cls = elementDemo.symmetryClasses[id]
                  if (!cls) return null
                  return (
                    <span key={id} className="legend-item">
                      <span
                        className="swatch"
                        style={{ background: cls.color }}
                      />
                      {cls.label}
                    </span>
                  )
                })}
              {elementDemo.geometryLimited && (
                <span
                  className="legend-item muted"
                  title={elementDemo.geometryNote}
                >
                  limited geometry
                </span>
              )}
            </div>
          )}
        </div>
        <div className="toolbar-actions">
          <div className="segmented" role="group" aria-label="Motif placement">
            <button
              type="button"
              className={placementMode === 'nearest' ? 'seg active' : 'seg'}
              onClick={() => onPlacementModeChange('nearest')}
              title="Place molecules near the selected element (may leave the cell)"
            >
              <span className="label-full">Nearest images</span>
              <span className="label-short">Near</span>
            </button>
            <button
              type="button"
              className={placementMode === 'wrapped' ? 'seg active' : 'seg'}
              onClick={() => onPlacementModeChange('wrapped')}
              title="Wrap every atom into the unit cell [0,1)³"
            >
              <span className="label-full">In cell</span>
              <span className="label-short">Cell</span>
            </button>
          </div>
          <div className="segmented" role="group" aria-label="Copy visibility">
            <button
              type="button"
              className={visibility === 'molecules' ? 'seg active' : 'seg'}
              onClick={() => onVisibilityChange('molecules')}
            >
              Molecules
            </button>
            <button
              type="button"
              className={visibility === 'all' ? 'seg active' : 'seg'}
              onClick={() => onVisibilityChange('all')}
            >
              All copies
            </button>
            <button
              type="button"
              className={visibility === 'selected' ? 'seg active' : 'seg'}
              onClick={() => onVisibilityChange('selected')}
            >
              BASE + IMAGE
            </button>
            <button
              type="button"
              className={visibility === 'asymmetric' ? 'seg active' : 'seg'}
              onClick={() => onVisibilityChange('asymmetric')}
            >
              AU only
            </button>
          </div>
          <button
            type="button"
            className={`btn${showSymmetryElements && canShowElements ? ' btn-primary' : ''}`}
            onClick={onToggleSymmetryElements}
            disabled={!structure || !canShowElements}
            aria-pressed={showSymmetryElements && canShowElements}
            title={
              !structure
                ? 'Load a CIF first'
                : !elementDemo
                  ? 'Needs a resolvable space-group number (1–230)'
                  : elementCount === 0
                    ? 'No drawable loci for this group yet (operators still listed)'
                    : showSymmetryElements
                      ? 'Hide screw / glide / inversion overlays'
                      : 'Show screw / glide / inversion overlays'
            }
          >
            Symmetry elements
            {canShowElements
              ? showSymmetryElements
                ? ' · on'
                : ' · off'
              : ''}
          </button>
          <button
            type="button"
            className="btn"
            onClick={onResetView}
            disabled={!structure}
          >
            Reset view
          </button>
        </div>
      </div>

      {structure && (
        <div className="cif-op-chips" aria-label="Operators (touch)">
          {structure.operators.map((op) => (
            <button
              key={op.index}
              type="button"
              className={`op-chip${op.index === selectedOp ? ' active' : ''}${op.index === 1 ? ' is-base' : ''}`}
              style={{ ['--op-color' as string]: operatorColor(op.index) }}
              onClick={() => onSelectOp(op.index)}
              title={op.triplet}
            >
              <span className="op-chip-swatch" />
              <span className="op-chip-label">
                {op.index}. {op.triplet}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="viewport-body cif-viewport-body">
        <div className="canvas-wrap">
          {structure ? (
            <Suspense
              fallback={
                <div className="cif-empty">
                  <p>Loading 3D view…</p>
                </div>
              }
            >
              <CifStructureScene
                structure={structure}
                selectedOp={selectedOp}
                visibility={visibility}
                placementMode={placementMode}
                resetToken={resetToken}
                elementDemo={elementDemo}
                showSymmetryElements={
                  showSymmetryElements && canShowElements
                }
              />
            </Suspense>
          ) : (
            <div className="cif-empty">
              <p>
                Drop in a <code>.cif</code> from CSD or COD, or load the
                teaching sample, to see intact molecules colored by symmetry
                operator.
              </p>
            </div>
          )}
        </div>
      </div>

      {structure && <CellParamsBadge cell={structure.cell} variant="strip" />}

      <footer className="viewport-footer">
        CIF explorer · intact molecules (covalent + min-image unwrap) ·
        {structure?.operatorSource === 'cif'
          ? 'operators from the CIF symmetry loop'
          : structure?.operatorSource === 'demo'
            ? 'operators from ITA (CIF had no symmetry loop)'
            : 'operators'}
        {structure?.spaceGroupNumber != null
          ? ` · teaching demo: /sg/${structure.spaceGroupNumber}`
          : ''}
        {placementMode === 'nearest'
          ? ' · Nearest images may sit just outside the cell'
          : ' · In cell wraps atoms into [0, 1)³'}
        {canShowElements && showSymmetryElements
          ? ` · ${elementCount} symmetry loci on CIF cell`
          : ''}
      </footer>
    </main>
  )
}
