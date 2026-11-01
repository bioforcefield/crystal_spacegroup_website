import type { ReactNode } from 'react'
import type { Ref } from '../../data/literature/refs'

export type KSection = { id: string; title: string; body: ReactNode }

/** Table of contents + collapsible sections; first section open. */
export function KnowledgeSections({ id, title, intro, sections }: { id: string; title: string; intro: ReactNode; sections: KSection[] }) {
  return (
    <section className="know" id={id} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      <div className="know-intro">{intro}</div>
      <nav className="know-toc" aria-label={`${title} contents`}>
        <ol>
          {sections.map((s) => (
            <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>
          ))}
        </ol>
      </nav>
      {sections.map((s, i) => (
        <details key={s.id} id={s.id} className="know-sec" open={i === 0}>
          <summary><h3>{s.title}</h3></summary>
          <div className="know-body">{s.body}</div>
        </details>
      ))}
    </section>
  )
}

export function makeCite(refs: Ref[]) {
  const idx = new Map(refs.map((r, i) => [r.id, i + 1]))
  return function Cite({ ids }: { ids: string }) {
    const list = ids.split(/[ ,]+/).filter(Boolean)
    return (
      <sup className="know-cite">
        [
        {list.map((k, j) => {
          const n = idx.get(k)
          if (!n) throw new Error(`Unknown ref ${k}`)
          return (
            <span key={k}>
              {j > 0 && ','}
              <a href={`#ref-${k}`}>{n}</a>
            </span>
          )
        })}
        ]
      </sup>
    )
  }
}

export function RefList({ refs }: { refs: Ref[] }) {
  return (
    <ol className="know-refs">
      {refs.map((r) => (
        <li key={r.id} id={`ref-${r.id}`}>
          {r.authors} ({r.year}). {r.title}. <em>{r.journal}</em>
          {r.volume && ` ${r.volume}`}
          {r.pages && `, ${r.pages}`}.{' '}
          <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">doi:{r.doi}</a>
        </li>
      ))}
    </ol>
  )
}

export function Eq({ children }: { children: ReactNode }) {
  return <div className="know-eq" role="math">{children}</div>
}

export function Figure({ id, title, children, source }: { id: string; title: string; children: ReactNode; source: ReactNode }) {
  return (
    <figure className="know-fig" id={id} data-plot={id}>
      <figcaption><strong>{title}</strong></figcaption>
      {children}
      <p className="know-src">{source}</p>
    </figure>
  )
}
