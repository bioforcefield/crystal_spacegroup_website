import type { MacroModel } from '../../data/pdb/macro'
import { INTERACTION_TYPES, POCKET_CUTOFF, type InteractionType, type LigandSite } from '../../data/pdb/interactions'

export interface PdbLigandPanelProps {
  model: MacroModel
  focusId: string | null
  onFocus: (id: string | null) => void
  site: LigandSite | null
  types: Set<InteractionType>
  onToggleType: (t: InteractionType) => void
  highlightRes?: string | null
  onHighlightRes?: (key: string | null) => void
  onCenterRes?: (key: string) => void
  /** Focus a ligand and open its 2D interaction diagram. */
  onOpen2D?: (id: string) => void
}

/** Ligand picker + interaction table for PDB entries. */
export default function PdbLigandPanel({ model, focusId, onFocus, site, types, onToggleType, highlightRes = null, onHighlightRes, onCenterRes, onOpen2D }: PdbLigandPanelProps) {
  const ligs = model.ligands
  const typeInfo = new Map(INTERACTION_TYPES.map((t) => [t.v, t]))
  const shown = site ? site.interactions.filter((i) => types.has(i.type)) : []
  return (
    <section className="seed-box cif-pdb-ligands" aria-label="Ligands">
      <h2>Ligands {ligs.length > 0 && <span className="muted">({ligs.length})</span>}</h2>
      {ligs.length === 0 ? (
        <p className="muted">No non-polymer ligands in this entry (waters excluded).</p>
      ) : (
        <label className="cif-pdb-lig-select">
          <span className="sr-only">Focus ligand</span>
          <select
            value={focusId ?? ''}
            onChange={(e) => onFocus(e.target.value || null)}
            aria-label="Focus ligand"
            data-testid="pdb-ligand-select"
          >
            <option value="">— pick a ligand to focus —</option>
            {ligs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
                {l.additive ? ' · ion/buffer' : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      {ligs.length > 0 && onOpen2D && (
        <ul className="cif-pdb-lig-rows" data-testid="pdb-ligand-rows">
          {ligs.map((l) => (
            <li key={l.id} className={l.id === focusId ? 'active' : undefined}>
              <button type="button" className="cif-lig-name" onClick={() => onFocus(l.id)} title={`Focus ${l.label} in 3D`}>
                {l.label}{l.additive ? <span className="muted"> · ion/buffer</span> : null}
              </button>
              <button type="button" className="btn btn-sm cif-lig-2d" onClick={() => onOpen2D(l.id)}
                title={`Focus ${l.label} and open its 2D interaction diagram`} aria-label={`2D diagram for ${l.label}`} data-testid={`lig-2d-${l.id}`}>
                2D
              </button>
            </li>
          ))}
        </ul>
      )}
      {site && (
        <>
          <div className="cif-pdb-focus-head">
            <strong>{site.ligand.label}</strong>
            <button type="button" className="btn" onClick={() => onFocus(null)} data-testid="pdb-exit-focus">
              Exit focus
            </button>
          </div>
          <p className="muted">
            {site.pocket.length} residues within {POCKET_CUTOFF} Å
            {site.pocket.some((p) => p.symCode) ? ' (incl. symmetry mates, shown with their symmetry code)' : ''}.{' '}
            <span title="Heavy-atom geometry, PLIP default cutoffs: H-bond D···A ≤ 4.1 Å (weak > 3.5 Å) with heavy-atom angle ≥ 90°; salt bridge ≤ 5.5 Å between charge centres; metal ≤ 3.0 Å; π-stacking ≤ 5.5 Å, offset ≤ 2.0 Å; cation–π ≤ 6.0 Å; hydrophobic C···C ≤ 4.0 Å." style={{ textDecoration: 'underline dotted', cursor: 'help' }}>
              Criteria
            </span>
          </p>
          <div className="cif-pdb-inter-toggles" role="group" aria-label="Interaction types">
            {INTERACTION_TYPES.map((t) => {
              const n = site.interactions.filter((i) => i.type === t.v).length
              return (
                <label key={t.v} className="cif-pdb-inter-toggle">
                  <input type="checkbox" checked={types.has(t.v)} onChange={() => onToggleType(t.v)} />
                  <span className="cif-pdb-swatch" style={{ borderColor: t.color }} aria-hidden />
                  {t.label} ({n})
                </label>
              )
            })}
          </div>
          {shown.length === 0 ? (
            <p className="muted">No interactions of the selected types.</p>
          ) : (
            <div className="cif-pdb-inter-table-wrap">
              <table className="cif-pdb-inter-table" data-testid="pdb-interactions">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Ligand atom</th>
                    <th>Residue · atom</th>
                    <th>Å</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((i, k) => (
                    <tr
                      key={k}
                      className={highlightRes && i.resKey === highlightRes ? 'is-hl' : undefined}
                      onMouseEnter={() => onHighlightRes?.(i.resKey ?? null)}
                      onMouseLeave={() => onHighlightRes?.(null)}
                      onClick={() => i.resKey && onCenterRes?.(i.resKey)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ color: typeInfo.get(i.type)?.color }}>{typeInfo.get(i.type)?.label}{i.weak ? ' (weak)' : ''}</td>
                      <td>{i.ligAtom}</td>
                      <td>
                        {i.resLabel} · {i.resAtom}
                      </td>
                      <td>{i.dist.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}
