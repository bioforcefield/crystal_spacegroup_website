/** Collapsible “Definitions & equations” block; KaTeX is loaded only when opened. */
import { lazy, Suspense, useState } from 'react'

export type NaEqKind = 'pucker' | 'bp' | 'step'
const Body = lazy(() => import('./NaEquations'))
const TITLE: Record<NaEqKind, string> = { pucker: 'sugar pucker (pseudorotation)', bp: 'base-pair parameters', step: 'base-pair step parameters' }

export default function NaEquationsLazy({ kind }: { kind: NaEqKind }) {
  const [open, setOpen] = useState(false)
  return (
    <details className="ana-eq" data-testid={`ana-eq-${kind}`} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>Definitions &amp; equations — {TITLE[kind]}</summary>
      {open && <Suspense fallback={<p className="muted">Loading equations…</p>}><Body kind={kind} /></Suspense>}
    </details>
  )
}
