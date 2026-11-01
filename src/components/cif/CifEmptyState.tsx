/** Empty / loading state of the Lattice Lab viewport (split out of CifViewport). */
export type CifExample = 'pdb:4hhb' | 'pdb:1bna' | 'sample'

export const CIF_EXAMPLES: { id: CifExample; label: string }[] = [
  { id: 'pdb:4hhb', label: '4HHB · haemoglobin' },
  { id: 'pdb:1bna', label: '1BNA · B-DNA' },
  { id: 'sample', label: 'Acetic acid · P2₁/c' },
]

export default function CifEmptyState({ busy, onOpenExample }: { busy?: boolean; onOpenExample?: (ex: CifExample) => void }) {
  return (
    <div className="cif-empty">
      {busy ? (
        <div className="cif-loading" role="status">
          <span className="cif-spinner" aria-hidden="true" />
          <p>Loading structure…</p>
        </div>
      ) : (
        <div className="cif-welcome" data-testid="cif-welcome">
          <p className="cif-welcome-title">Explore a crystal structure</p>
          <p>
            Load a PDB ID, a COD id or a file (<code>.cif</code> <code>.mmcif</code> <code>.pdb</code>{' '}
            <code>.mae</code>) from the panel, or drop a file here. Every copy is coloured by the symmetry
            operator that generated it.
          </p>
          {onOpenExample && (
            <div className="cif-welcome-examples" role="group" aria-label="Examples">
              {CIF_EXAMPLES.map((ex) => (
                <button key={ex.id} type="button" className="btn" onClick={() => onOpenExample(ex.id)}>
                  {ex.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
