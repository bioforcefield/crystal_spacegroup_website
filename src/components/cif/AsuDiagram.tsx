import { useMemo } from 'react'
import {
  buildAsuDiagram,
  type AsuDiagramModel,
} from '../../data/cif/asuDiagram'
import type { ExpandedStructure } from '../../data/cif/types'

export interface AsuDiagramProps {
  structure: ExpandedStructure
}

function atomRadius(el: string): number {
  if (el === 'H' || el === 'D' || el === 'T') return 0.14
  if (el === 'C') return 0.22
  return 0.26
}

function DiagramSvg({ model }: { model: AsuDiagramModel }) {
  const { viewBox: vb } = model
  const stroke = Math.max(vb.width, vb.height) * 0.018
  const fontSize = Math.max(vb.width, vb.height) * 0.07

  return (
    <svg
      className="cif-asu-svg"
      viewBox={`${vb.minX} ${vb.minY} ${vb.width} ${vb.height}`}
      role="img"
      aria-label={model.altText}
    >
      <title>{model.altText}</title>
      {model.bonds.map((b) => {
        const a = model.atoms[b.a]!
        const c = model.atoms[b.b]!
        return (
          <line
            key={`b-${b.a}-${b.b}`}
            x1={a.x}
            y1={a.y}
            x2={c.x}
            y2={c.y}
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            className="cif-asu-bond"
          />
        )
      })}
      {model.atoms.map((a) => {
        const r = atomRadius(a.element)
        const showLabel = a.element !== 'H' && a.element !== 'D' && a.element !== 'T'
        return (
          <g key={`a-${a.id}`} className="cif-asu-atom">
            <circle
              cx={a.x}
              cy={a.y}
              r={r}
              fill={a.color}
              stroke="rgba(15, 23, 42, 0.55)"
              strokeWidth={stroke * 0.45}
            />
            {showLabel && (
              <text
                x={a.x}
                y={a.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                className="cif-asu-label"
              >
                {a.element}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** ASU / formula 2D sketch card for the CIF structure panel. */
export default function AsuDiagram({ structure }: AsuDiagramProps) {
  const model = useMemo(() => buildAsuDiagram(structure), [structure])

  return (
    <figure className="cif-asu-diagram" aria-labelledby="cif-asu-diagram-caption">
      <figcaption id="cif-asu-diagram-caption" className="cif-asu-caption">
        ASU · 2D
        {model.kind === 'molecule' && model.moleculeCount > 1
          ? ` · ${model.moleculeCount} molecules`
          : ''}
      </figcaption>

      {model.kind === 'molecule' ? (
        <div className="cif-asu-plot">
          <DiagramSvg model={model} />
        </div>
      ) : (
        <p className="cif-asu-fallback hint" role="status">
          {model.reason ?? 'No discrete-molecule 2D diagram for this ASU.'}
          {model.formula ? (
            <>
              {' '}
              <span className="cif-asu-fallback-formula">{model.formula}</span>
            </>
          ) : null}
        </p>
      )}

      {model.smiles && (
        <p className="cif-asu-smiles hint" title="SMILES from CIF">
          <span className="cif-asu-smiles-label">SMILES</span>{' '}
          <code>{model.smiles}</code>
        </p>
      )}
    </figure>
  )
}
