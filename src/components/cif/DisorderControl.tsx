import type { DisorderInfo } from '../../data/cif/types'

const gLabel = (id: string) => (/^-?\d+$/.test(id) ? `PART ${id}` : id)

/** Small-molecule disorder: one choice per assembly + "show all (translucent)". Shown only when disorder exists. */
export function SmallMolDisorderControl({ info, onPick, onShowAll }: {
  info: DisorderInfo
  onPick: (asm: string, grp: string) => void
  onShowAll: (v: boolean) => void
}) {
  const multi = info.assemblies.filter((a) => a.groups.length > 1)
  return (
    <section className="seed-box cif-disorder" data-testid="disorder-control" aria-labelledby="cif-disorder-h">
      <h2 id="cif-disorder-h">Disorder</h2>
      {multi.map((a) => (
        <fieldset key={a.id} className="cif-disorder-asm">
          <legend>{a.id ? `Assembly ${a.id}` : 'Disorder groups'}</legend>
          <div className="seg-row" role="radiogroup">
            {a.groups.map((g) => (
              <label key={g.id} className={`seg${a.selected === g.id ? ' is-on' : ''}`} data-testid={`dis-${a.id || '_'}-${g.id}`}>
                <input type="radio" name={`dis-${a.id}`} checked={a.selected === g.id} onChange={() => onPick(a.id, g.id)} />
                {gLabel(g.id)} ({g.occ.toFixed(2)}){g.id === a.defaultGroup ? ' ★' : ''}
                <span className="muted"> · {g.n} atoms</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {multi.length > 0 && (
        <label className="cif-xray-check">
          <input type="checkbox" checked={info.showAll} onChange={(e) => onShowAll(e.target.checked)} data-testid="dis-show-all" />
          Show all states (others translucent)
        </label>
      )}
      <p className="muted ana-note">
        ★ = highest occupancy (default). Occupancy = mean site occupancy of the group. Analysis and exports use the selected
        state{info.showAll ? '; the PXRD pattern uses all states at their refined occupancies (the average structure)' : ''}.
        {info.hasNegative ? ' Negative PART: the group is the special-position disorder of a molecule on a symmetry element — its symmetry image is the other orientation, so a full-cell view always shows both.' : ''}
      </p>
    </section>
  )
}

/** PDB alternate locations: per-residue highest occupancy (default) or one altloc letter everywhere it exists. */
export function AltlocControl({ ids, residues, selected, onPick }: { ids: string[]; residues: number; selected: string; onPick: (v: string) => void }) {
  return (
    <section className="seed-box cif-disorder" data-testid="altloc-control" aria-labelledby="cif-alt-h">
      <h2 id="cif-alt-h">Alternate conformations</h2>
      <label>
        Altloc{' '}
        <select value={selected} onChange={(e) => onPick(e.target.value)} data-testid="altloc-select">
          <option value="auto">Highest occupancy per residue</option>
          {ids.map((i) => <option key={i} value={i}>{i} (where present)</option>)}
        </select>
      </label>
      <p className="muted ana-note">
        {residues} residue(s) have alternate locations. A letter selects that conformer wherever a residue has it; residues without it
        keep their highest-occupancy conformer, so mixed states can contain contacts the depositor never modelled together. Atoms with
        altloc “.” are shared by all conformers. Analysis, exports and PXRD follow this choice.
      </p>
    </section>
  )
}
