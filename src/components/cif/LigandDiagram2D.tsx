import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import type { InteractionType, LigandSite } from '../../data/pdb/interactions'
import { diagramToSvg, fetchCcdBonds, layoutDiagram, type CcdBonds } from '../../data/pdb/ligand2d'

export interface LigandDiagram2DProps {
  site: LigandSite
  types: Set<InteractionType>
  highlight: string | null
  onHover: (resKey: string | null) => void
  onPick: (resKey: string) => void
  onClose: () => void
}

function download(name: string, blob: Blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/** LigPlot-style 2D interaction diagram for the focused ligand (floats over the 3D view). */
export default function LigandDiagram2D({ site, types, highlight, onHover, onPick, onClose }: LigandDiagram2DProps) {
  const [ccd, setCcd] = useState<CcdBonds | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    setCcd(undefined)
    void fetchCcdBonds(site.ligand.comp).then((b) => live && setCcd(b))
    return () => { live = false }
  }, [site.ligand.comp])
  const diagram = useMemo(() => layoutDiagram(site, ccd ?? null, types), [site, ccd, types])
  const svg = useMemo(() => diagramToSvg(diagram, { highlight }), [diagram, highlight])
  const base = `${site.ligand.id}_2d`
  const resOf = (e: MouseEvent) => (e.target as Element).closest?.('[data-res]')?.getAttribute('data-res') ?? null

  const exportPng = () => {
    const img = new Image()
    const scale = 2
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = Math.round(diagram.box.w * scale)
      c.height = Math.round(diagram.box.h * scale)
      const g = c.getContext('2d')!
      g.drawImage(img, 0, 0, c.width, c.height)
      c.toBlob((b) => b && download(`${base}.png`, b), 'image/png')
    }
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(diagramToSvg(diagram))}`
  }

  return (
    <div className="cif-lig2d" role="dialog" aria-label="2D interaction diagram" data-testid="lig2d-panel">
      <div className="cif-lig2d-head">
        <strong>2D diagram</strong>
        <span className="muted">
          {ccd === undefined ? 'loading bond orders…' : ccd ? 'bond orders: RCSB CCD' : 'bond orders unavailable (single bonds shown)'}
        </span>
        <span className="cif-lig2d-actions">
          <button type="button" className="btn btn-small" onClick={() => download(`${base}.svg`, new Blob([diagramToSvg(diagram)], { type: 'image/svg+xml' }))} data-testid="lig2d-svg-btn">
            SVG
          </button>
          <button type="button" className="btn btn-small" onClick={exportPng} data-testid="lig2d-png-btn">
            PNG
          </button>
          <button type="button" className="btn btn-small" onClick={onClose} aria-label="Close 2D diagram">
            ✕
          </button>
        </span>
      </div>
      {diagram.edges.length === 0 && <p className="muted cif-lig2d-empty">No interactions of the selected types.</p>}
      <div
        className="cif-lig2d-svg"
        onMouseOver={(e) => onHover(resOf(e))}
        onMouseLeave={() => onHover(null)}
        onClick={(e) => { const k = resOf(e); if (k) onPick(k) }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="muted cif-lig2d-foot">Hover a residue to highlight it; click to center the 3D view on it. Dashed boxes are symmetry mates.</p>
    </div>
  )
}
