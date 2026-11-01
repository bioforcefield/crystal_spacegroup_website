/**
 * Sequence strip under the 3D panel (macromolecules only): per-chain one-letter
 * sequence with numbering ticks, secondary-structure colouring and gaps for
 * unobserved SEQRES residues. With comparison structures loaded it shows a
 * (progressive) alignment with identity %, conservation and mismatches, and can
 * overlay comparison Cα traces superposed by Kabsch on aligned pairs.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { MacroModel } from '../../data/pdb/macro'
import { chainSequences, type ChainSequence, type SeqResidue } from '../../data/pdb/sequence'
import { alignChains, superposeRow } from '../../data/pdb/compare'
import type { AnalysisFocus } from './analysis/types'
import type { Vec3 } from '../../data/types'

export interface StripEntry { key: string; label: string; model: MacroModel }
export const OVERLAY_COLORS = ['#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#38bdf8']

const SS_LABEL = { H: 'helix', E: 'strand', C: 'coil' } as const
const resLabel = (r: SeqResidue, chain: string) => `${r.comp} ${r.num ?? '?'} · chain ${chain}${r.observed ? ` · ${SS_LABEL[r.ss]}` : ' · not modelled'}`

export interface SequenceStripProps {
  entries: StripEntry[]
  focusKey: string | null
  onFocus: (f: AnalysisFocus | null) => void
  onAddPdb: (id: string) => void
  onAddFile: (e: ChangeEvent<HTMLInputElement>) => void
  onRemove: (key: string) => void
  onOverlay: (traces: { points: Vec3[][]; color: string }[] | null) => void
  busy?: boolean
  error?: string | null
}

export default function SequenceStrip({ entries, focusKey, onFocus, onAddPdb, onAddFile, onRemove, onOverlay, busy, error }: SequenceStripProps) {
  const [open, setOpen] = useState(true)
  const [hover, setHover] = useState<string | null>(null)
  const [chainSel, setChainSel] = useState<Record<string, string>>({})
  const [overlay, setOverlay] = useState<Record<string, boolean>>({})
  const [addId, setAddId] = useState('')
  const rootRef = useRef<HTMLElement>(null)
  useEffect(() => {
    // selection from 3D / analysis → bring the residue into view in the strip
    const el = rootRef.current?.querySelector<HTMLElement>('.seq-on')
    const sc = el?.closest<HTMLElement>('.seq-scroll')
    if (el && sc) {
      const x = el.offsetLeft - sc.clientWidth / 2
      sc.scrollTo({ left: Math.max(0, x), behavior: 'smooth' })
    }
  }, [focusKey])
  const seqs = useMemo(() => entries.map((e) => chainSequences(e.model)), [entries])
  const active = entries[0]
  const activeSeqs = seqs[0] ?? []
  const comparing = entries.length > 1
  const pick = (e: StripEntry, i: number): ChainSequence | undefined => {
    const list = seqs[i] ?? []
    const want = chainSel[e.key]
    if (want && want !== '*') return list.find((c) => c.chain === want) ?? list[0]
    if (i > 0) {
      const kind = pick(entries[0]!, 0)?.kind
      return list.find((c) => c.kind === kind) ?? list[0]
    }
    return list[0]
  }
  const chosen = entries.map((e, i) => pick(e, i))
  const alignment = useMemo(() => {
    if (!comparing) return null
    const ch = chosen.filter(Boolean) as ChainSequence[]
    if (ch.length !== entries.length || ch.length < 2) return null
    return alignChains(ch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparing, entries, seqs, chainSel])
  const overlays = useMemo(() => {
    if (!alignment) return []
    return entries.slice(1).map((e, k) => (overlay[e.key] ? { key: e.key, res: superposeRow(alignment, k + 1), color: OVERLAY_COLORS[k % OVERLAY_COLORS.length]! } : { key: e.key, res: null, color: '' }))
  }, [alignment, overlay, entries])
  useEffect(() => {
    const t = overlays.filter((o) => o.res).map((o) => ({ points: o.res!.segments, color: o.color }))
    onOverlay(t.length ? t : null)
  }, [overlays, onOverlay])
  // rmsd regardless of overlay toggle (cheap)
  const rmsds = useMemo(() => (alignment ? entries.slice(1).map((_, k) => superposeRow(alignment, k + 1)) : []), [alignment, entries])

  if (!active || !activeSeqs.length) return null
  const total = activeSeqs.reduce((s, c) => s + c.residues.length, 0)
  const allowAll = total <= 2500
  const selActive = chainSel[active.key] ?? (allowAll ? '*' : activeSeqs[0]!.chain)
  const singleChains = selActive === '*' ? activeSeqs : activeSeqs.filter((c) => c.chain === selActive)
  const hoverText = hover

  const cell = (r: SeqResidue | null, chain: string, opts: { cls?: string; clickable: boolean; k: number }) => {
    if (!r) return <span key={opts.k} className="seq-res seq-gap" aria-hidden="true">-</span>
    const on = r.key != null && r.key === focusKey
    const cls = `seq-res ss-${r.observed ? r.ss : 'x'}${r.observed ? '' : ' seq-unobs'}${on ? ' seq-on' : ''}${opts.cls ? ' ' + opts.cls : ''}`
    const tip = resLabel(r, chain)
    const n = r.num != null ? parseInt(r.num, 10) : NaN
    const tick = Number.isFinite(n) && n % 10 === 0 ? String(n) : null
    return (
      <span key={opts.k} className={cls} title={tip} data-tick={tick ?? undefined}
        onMouseEnter={() => setHover(tip)} onMouseLeave={() => setHover(null)}
        onClick={opts.clickable && r.observed && r.key && r.center ? () => onFocus(on ? null : { key: r.key!, label: `${r.comp} ${r.num} ${chain}`, center: r.center! }) : undefined}
        role={opts.clickable && r.observed ? 'button' : undefined}
      >{r.observed ? r.code : r.code.toLowerCase()}</span>
    )
  }

  return (
    <section ref={rootRef} className={`cif-seq-strip${open ? '' : ' collapsed'}`} aria-label="Sequence" data-testid="seq-strip">
      <div className="seq-head">
        <button type="button" className="btn btn-small" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? '▾' : '▸'} Sequence</button>
        <label className="seq-chain">
          <span className="muted">{active.label}</span>
          <select value={selActive} onChange={(e) => setChainSel((s) => ({ ...s, [active.key]: e.target.value }))} aria-label="Chain">
            {allowAll && !comparing && <option value="*">All chains</option>}
            {activeSeqs.map((c) => <option key={c.chain} value={c.chain}>Chain {c.chain} ({c.residues.length})</option>)}
          </select>
        </label>
        <span className="seq-legend muted"><i className="ss-H" />helix <i className="ss-E" />strand <i className="seq-unobs-k">x</i> not modelled</span>
        <span className="seq-hover mono" aria-live="polite">{hoverText ?? (focusKey ? `Selected: ${focusKey.split('|').reverse().join(' ')}` : 'Click a residue to centre it')}</span>
        <form className="seq-add" onSubmit={(e) => { e.preventDefault(); if (addId.trim()) onAddPdb(addId.trim()); setAddId('') }}>
          <input value={addId} onChange={(e) => setAddId(e.target.value)} placeholder="Compare PDB id" aria-label="Add PDB id to compare" size={10} disabled={busy} />
          <button type="submit" className="btn btn-small" disabled={busy || !addId.trim()}>+ Compare</button>
          <label className="btn btn-small seq-file">
            + File
            <input type="file" accept=".cif,.mcif,.pdb,.ent,.mae,.maegz,.gz,text/plain" onChange={onAddFile} disabled={busy} />
          </label>
        </form>
      </div>
      {error && <p className="cif-error seq-err" role="alert">{error}</p>}
      {open && !alignment && (
        <div className="seq-scroll">
          {singleChains.map((c) => (
            <div key={c.chain} className="seq-row">
              <span className="seq-label">{c.chain}</span>
              <span className="seq-letters">{c.residues.map((r, k) => cell(r, c.chain, { clickable: true, k }))}</span>
            </div>
          ))}
        </div>
      )}
      {open && alignment && (
        <div className="seq-scroll seq-aln" data-testid="seq-alignment">
          {entries.map((e, i) => {
            const ch = chosen[i]!
            const row = alignment.rows[i]!
            const ov = i > 0 ? rmsds[i - 1] : null
            return (
              <div key={e.key} className="seq-row">
                <span className="seq-label seq-label-wide">
                  <b style={i > 0 && overlay[e.key] ? { color: OVERLAY_COLORS[(i - 1) % OVERLAY_COLORS.length] } : undefined}>{e.label}</b>
                  <select value={ch.chain} onChange={(ev) => setChainSel((s) => ({ ...s, [e.key]: ev.target.value }))} aria-label={`Chain for ${e.label}`}>
                    {(seqs[i] ?? []).map((c) => <option key={c.chain} value={c.chain}>{c.chain}</option>)}
                  </select>
                  {i === 0 ? <span className="muted">ref</span> : (
                    <>
                      <span className="seq-id" title="Identity vs reference over the shorter sequence">{Math.round(alignment.identity[i]! * 100)}%</span>
                      {ov && <label className="seq-ov" title={`Kabsch superposition on ${ov.n} aligned Cα/C1′ pairs`}><input type="checkbox" checked={!!overlay[e.key]} onChange={(ev) => setOverlay((o) => ({ ...o, [e.key]: ev.target.checked }))} />3D · {ov.rmsd.toFixed(2)} Å</label>}
                      <button type="button" className="btn btn-small" onClick={() => onRemove(e.key)} aria-label={`Remove ${e.label}`}>×</button>
                    </>
                  )}
                </span>
                <span className="seq-letters">
                  {row.map((r, k) => {
                    const ref = alignment.rows[0]![k]
                    const mism = i > 0 && r && ref && r.code !== ref.code
                    const cons = alignment.conservation[k]!
                    const cls = mism ? 'seq-mis' : cons === 1 && r ? 'seq-cons' : cons >= 0.5 && r ? 'seq-cons-half' : undefined
                    return cell(r, ch.chain, { clickable: i === 0, k, cls })
                  })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
