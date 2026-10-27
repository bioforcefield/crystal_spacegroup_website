import { Suspense, lazy, useEffect, useState } from 'react'
import CellParamsBadge from './CellParamsBadge'
import type {
  CifColorMode,
  CifPlacementMode,
  CifThermalMode,
  CifVisibility,
} from './cifViewTypes'
import { operatorColor } from '../../data/cif/operatorColors'
import type { ExpandedStructure } from '../../data/cif/types'
import { describeCifStructure } from '../../data/a11y/structureSummary'
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
  colorMode: CifColorMode
  onColorModeChange: (m: CifColorMode) => void
  thermalMode: CifThermalMode
  onThermalModeChange: (m: CifThermalMode) => void
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
  colorMode,
  onColorModeChange,
  thermalMode,
  onThermalModeChange,
}: CifViewportProps) {
  const [viewOpen, setViewOpen] = useState(false)

  useEffect(() => {
    if (!viewOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewOpen])

  const canvasLabel = structure
    ? describeCifStructure(structure)
    : 'Crystal structure 3D view. Upload a CIF to begin.'

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
                  aria-pressed={op.index === selectedOp}
                  aria-label={`Operator ${op.index}${op.index === 1 ? ' asymmetric unit' : ''}: ${op.triplet}`}
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
        <div className="toolbar-actions cif-toolbar-actions">
          {/* Always one-tap: Near/Cell + Molecules */}
          <div className="cif-toolbar-primary">
            <div className="segmented" role="group" aria-label="Motif placement">
              <button
                type="button"
                className={placementMode === 'nearest' ? 'seg active' : 'seg'}
                onClick={() => onPlacementModeChange('nearest')}
                aria-pressed={placementMode === 'nearest'}
                title="Place molecules near the selected element (may leave the cell)"
              >
                <span className="label-full">Nearest images</span>
                <span className="label-short">Near</span>
              </button>
              <button
                type="button"
                className={placementMode === 'wrapped' ? 'seg active' : 'seg'}
                onClick={() => onPlacementModeChange('wrapped')}
                aria-pressed={placementMode === 'wrapped'}
                title="Wrap every atom into the unit cell [0,1)³"
              >
                <span className="label-full">In cell</span>
                <span className="label-short">Cell</span>
              </button>
            </div>
            <div
              className="segmented cif-vis-primary"
              role="group"
              aria-label="Molecule visibility"
            >
              <button
                type="button"
                className={visibility === 'molecules' ? 'seg active' : 'seg'}
                onClick={() => onVisibilityChange('molecules')}
                aria-pressed={visibility === 'molecules'}
              >
                Molecules
              </button>
            </div>
            <button
              type="button"
              className={`btn cif-view-toggle${viewOpen ? ' btn-primary' : ''}`}
              onClick={() => setViewOpen((o) => !o)}
              aria-expanded={viewOpen}
              aria-controls="cif-view-sheet"
            >
              View{viewOpen ? ' · close' : ''}
            </button>
          </div>

          {/* Desktop secondary row (hidden on phone — lives in View sheet) */}
          <div className="cif-toolbar-secondary cif-toolbar-desktop-only">
            <div className="segmented" role="group" aria-label="Copy visibility">
              <button
                type="button"
                className={visibility === 'molecules' ? 'seg active' : 'seg'}
                onClick={() => onVisibilityChange('molecules')}
              aria-pressed={visibility === 'molecules'}
              >
                Molecules
              </button>
              <button
                type="button"
                className={visibility === 'all' ? 'seg active' : 'seg'}
                onClick={() => onVisibilityChange('all')}
              aria-pressed={visibility === 'all'}
              >
                All copies
              </button>
              <button
                type="button"
                className={visibility === 'selected' ? 'seg active' : 'seg'}
                onClick={() => onVisibilityChange('selected')}
              aria-pressed={visibility === 'selected'}
              >
                BASE + IMAGE
              </button>
              <button
                type="button"
                className={visibility === 'asymmetric' ? 'seg active' : 'seg'}
                onClick={() => onVisibilityChange('asymmetric')}
              aria-pressed={visibility === 'asymmetric'}
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
            <div className="segmented" role="group" aria-label="Atom coloring">
              <button
                type="button"
                className={colorMode === 'operator' ? 'seg active' : 'seg'}
                onClick={() => onColorModeChange('operator')}
                aria-pressed={colorMode === 'operator'}
                title="Tint by symmetry operator"
              >
                By op
              </button>
              <button
                type="button"
                className={colorMode === 'residue' ? 'seg active' : 'seg'}
                onClick={() => onColorModeChange('residue')}
                aria-pressed={colorMode === 'residue'}
                title="Color by residue / component id when present"
              >
                Residue
              </button>
            </div>
            <div className="segmented" role="group" aria-label="Thermal ellipsoids">
              <button
                type="button"
                className={thermalMode === 'off' ? 'seg active' : 'seg'}
                onClick={() => onThermalModeChange('off')}
              aria-pressed={thermalMode === 'off'}
              >
                No U
              </button>
              <button
                type="button"
                className={thermalMode === 'uiso' ? 'seg active' : 'seg'}
                onClick={() => onThermalModeChange('uiso')}
                aria-pressed={thermalMode === 'uiso'}
                title="Scale ball radius by Uiso when present"
              >
                Uiso
              </button>
              <button
                type="button"
                className={thermalMode === 'ellipsoid' ? 'seg active' : 'seg'}
                onClick={() => onThermalModeChange('ellipsoid')}
                aria-pressed={thermalMode === 'ellipsoid'}
                title="Draw anisotropic ellipsoids when Uij present; else Uiso balls"
              >
                Ellipsoid
              </button>
            </div>
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

        {/* Phone View sheet / drawer — does not cover the canvas (sits in toolbar flow) */}
        {viewOpen && (
          <div
            id="cif-view-sheet"
            className="cif-view-sheet"
            role="region"
            aria-label="View options"
            tabIndex={-1}
          >
            <div className="segmented" role="group" aria-label="Copy visibility">
              <button
                type="button"
                className={visibility === 'molecules' ? 'seg active' : 'seg'}
                onClick={() => onVisibilityChange('molecules')}
              aria-pressed={visibility === 'molecules'}
              >
                Molecules
              </button>
              <button
                type="button"
                className={visibility === 'all' ? 'seg active' : 'seg'}
                onClick={() => onVisibilityChange('all')}
              aria-pressed={visibility === 'all'}
              >
                All
              </button>
              <button
                type="button"
                className={visibility === 'selected' ? 'seg active' : 'seg'}
                onClick={() => onVisibilityChange('selected')}
              aria-pressed={visibility === 'selected'}
              >
                BASE+IMAGE
              </button>
              <button
                type="button"
                className={visibility === 'asymmetric' ? 'seg active' : 'seg'}
                onClick={() => onVisibilityChange('asymmetric')}
              aria-pressed={visibility === 'asymmetric'}
              >
                AU
              </button>
            </div>
            <div className="segmented" role="group" aria-label="Atom coloring">
              <button
                type="button"
                className={colorMode === 'operator' ? 'seg active' : 'seg'}
                onClick={() => onColorModeChange('operator')}
              aria-pressed={colorMode === 'operator'}
              >
                By op
              </button>
              <button
                type="button"
                className={colorMode === 'residue' ? 'seg active' : 'seg'}
                onClick={() => onColorModeChange('residue')}
              aria-pressed={colorMode === 'residue'}
              >
                Residue
              </button>
            </div>
            <div className="segmented" role="group" aria-label="Thermal ellipsoids">
              <button
                type="button"
                className={thermalMode === 'off' ? 'seg active' : 'seg'}
                onClick={() => onThermalModeChange('off')}
              aria-pressed={thermalMode === 'off'}
              >
                No U
              </button>
              <button
                type="button"
                className={thermalMode === 'uiso' ? 'seg active' : 'seg'}
                onClick={() => onThermalModeChange('uiso')}
              aria-pressed={thermalMode === 'uiso'}
              >
                Uiso
              </button>
              <button
                type="button"
                className={thermalMode === 'ellipsoid' ? 'seg active' : 'seg'}
                onClick={() => onThermalModeChange('ellipsoid')}
              aria-pressed={thermalMode === 'ellipsoid'}
              >
                Ellipsoid
              </button>
            </div>
            <div className="cif-view-sheet-actions">
              <button
                type="button"
                className={`btn${showSymmetryElements && canShowElements ? ' btn-primary' : ''}`}
                onClick={onToggleSymmetryElements}
                disabled={!structure || !canShowElements}
                aria-pressed={showSymmetryElements && canShowElements}
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
        )}
      </div>

      {structure && (
        <div className="cif-op-chips" role="toolbar" aria-label="Operators (touch)">
          {structure.operators.map((op) => (
            <button
              key={op.index}
              type="button"
              className={`op-chip${op.index === selectedOp ? ' active' : ''}${op.index === 1 ? ' is-base' : ''}`}
              style={{ ['--op-color' as string]: operatorColor(op.index) }}
              onClick={() => onSelectOp(op.index)}
              title={op.triplet}
              aria-pressed={op.index === selectedOp}
              aria-label={`Operator ${op.index}: ${op.triplet}`}
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
        <div
          className="canvas-wrap"
          role="img"
          aria-label={canvasLabel}
        >
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
                colorMode={colorMode}
                thermalMode={thermalMode}
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
