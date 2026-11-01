import type { MacroModel } from '../../data/pdb/macro'
import { INTERACTION_TYPES, POCKET_CUTOFF, type InteractionType, type LigandSite } from '../../data/pdb/interactions'

export interface PdbLigandPanelProps {
  model: MacroModel
  focusId: string | null
  onFocus: (id: string | null) => void
  site: LigandSite | null
  types: Set<InteractionType>
  onToggleType: (t: InteractionType) => void
}

/** Ligand picker + interaction table for PDB entries. */
export default function PdbLigandPanel({ model, focusId, onFocus, site, types, onToggleType }: PdbLigandPanelProps) {
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
            {site.pocket.some((p) => p.symCode) ? ' (incl. symmetry mates, shown with their symmetry code)' : ''}.
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
                    <tr key={k}>
                      <td style={{ color: typeInfo.get(i.type)?.color }}>{typeInfo.get(i.type)?.label}</td>
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
