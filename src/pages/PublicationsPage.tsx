import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  COD_PUBS,
  COD_PUBS_NOTE,
  PUB_TAG_BLURBS,
  PUB_TAG_ORDER,
} from '../data/pubs/codPubs'
import {
  collectYears,
  countByTag,
  doiUrl,
  filterPubs,
  groupPubsByYear,
} from '../data/pubs/filterPubs'
import type { PubTag } from '../data/pubs/types'

export default function PublicationsPage() {
  const [tags, setTags] = useState<PubTag[]>([])
  const [year, setYear] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const years = useMemo(() => collectYears(COD_PUBS), [])
  const tagCounts = useMemo(
    () => countByTag(COD_PUBS, PUB_TAG_ORDER),
    [],
  )

  const filtered = useMemo(
    () => filterPubs(COD_PUBS, { tags, year, query }),
    [tags, year, query],
  )
  const groups = useMemo(() => groupPubsByYear(filtered), [filtered])

  const toggleTag = (t: PubTag) => {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    )
  }

  return (
    <div className="pubs-page">
      <header className="pubs-hero">
        <p className="eyebrow">COD literature · curated</p>
        <h1>Publications &amp; structures</h1>
        <p className="pubs-lead">
          Browse a teaching set of Crystallography Open Database entries by{' '}
          <strong>year</strong> and <strong>topic tags</strong>. Open the DOI
          for the paper, or jump into the CIF symmetry map for the structure.
          This is not a live stream of every paper — see the note below.
        </p>
        <p className="pubs-note">{COD_PUBS_NOTE}</p>
      </header>

      <section className="pubs-filters" aria-label="Filter publications">
        <div className="pubs-filter-row">
          <label className="pubs-search-label" htmlFor="pubs-query">
            Search
          </label>
          <input
            id="pubs-query"
            type="search"
            className="pubs-search"
            placeholder="Name, journal, COD id, formula…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="pubs-filter-row">
          <span className="pubs-filter-label" id="pubs-year-label">
            Year
          </span>
          <div
            className="pubs-year-chips"
            role="group"
            aria-labelledby="pubs-year-label"
          >
            <button
              type="button"
              className={`pubs-chip${year == null ? ' active' : ''}`}
              aria-pressed={year == null}
              onClick={() => setYear(null)}
            >
              All years
            </button>
            {years.map((y) => (
              <button
                key={y}
                type="button"
                className={`pubs-chip${year === y ? ' active' : ''}`}
                aria-pressed={year === y}
                onClick={() => setYear((cur) => (cur === y ? null : y))}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="pubs-filter-row">
          <span className="pubs-filter-label" id="pubs-tags-label">
            Tags
          </span>
          <div
            className="pubs-tag-chips"
            role="group"
            aria-labelledby="pubs-tags-label"
          >
            {PUB_TAG_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                className={`pubs-chip pubs-tag pubs-tag-${t}${
                  tags.includes(t) ? ' active' : ''
                }`}
                aria-pressed={tags.includes(t)}
                title={PUB_TAG_BLURBS[t]}
                onClick={() => toggleTag(t)}
              >
                {t}
                <span className="pubs-chip-count">{tagCounts[t]}</span>
              </button>
            ))}
          </div>
          {tags.length > 0 && (
            <button
              type="button"
              className="pubs-clear"
              onClick={() => setTags([])}
            >
              Clear tags
            </button>
          )}
        </div>

        <details className="pubs-tag-help">
          <summary>What do the tags mean?</summary>
          <ul>
            {PUB_TAG_ORDER.map((t) => (
              <li key={t}>
                <strong>{t}</strong> — {PUB_TAG_BLURBS[t]}
              </li>
            ))}
          </ul>
          <p className="muted">
            Tags combine manual curation with light formula/name heuristics.
            They are teaching labels, not authoritative ontology.
          </p>
        </details>

        <p className="pubs-count" role="status" aria-live="polite">
          Showing <strong>{filtered.length}</strong> of {COD_PUBS.length}{' '}
          curated entries
          {year != null ? ` · year ${year}` : ''}
          {tags.length ? ` · tags: ${tags.join(', ')}` : ''}
          {query.trim() ? ` · “${query.trim()}”` : ''}.
        </p>
      </section>

      <div className="pubs-timeline">
        {groups.length === 0 && (
          <p className="pubs-empty" role="status">
            No entries match these filters. Clear tags or try another year.
          </p>
        )}
        {groups.map((g) => (
          <section
            key={g.year ?? 'unknown'}
            className="pubs-year-section"
            aria-labelledby={`pubs-year-${g.year ?? 'unknown'}`}
          >
            <h2 id={`pubs-year-${g.year ?? 'unknown'}`}>
              {g.year ?? 'Year unknown'}
              <span className="pubs-year-count">{g.entries.length}</span>
            </h2>
            <ul className="pubs-cards">
              {g.entries.map((e) => {
                const doi = doiUrl(e.doi)
                return (
                  <li key={e.id} className="pubs-card">
                    <div className="pubs-card-top">
                      <span className="pubs-card-year">
                        {e.year ?? '—'}
                      </span>
                      <span className="pubs-card-id">COD {e.id}</span>
                    </div>
                    <h3 className="pubs-card-name">{e.name}</h3>
                    {e.title && e.title !== e.name && (
                      <p className="pubs-card-title">{e.title}</p>
                    )}
                    <p className="pubs-card-meta">
                      {e.journal ?? 'Journal n/a'}
                      {e.sg ? ` · ${e.sg}` : ''}
                      {e.sgNumber != null ? ` (${e.sgNumber})` : ''}
                      {e.formula ? ` · ${e.formula}` : ''}
                    </p>
                    <div className="pubs-card-tags" aria-label="Tags">
                      {e.tags.map((t) => (
                        <span key={t} className={`pubs-mini-tag pubs-tag-${t}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="pubs-card-actions">
                      {doi ? (
                        <a
                          className="btn btn-ghost pubs-btn"
                          href={doi}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          DOI ↗
                        </a>
                      ) : (
                        <span className="pubs-no-doi muted">No DOI</span>
                      )}
                      <Link
                        className="btn btn-primary pubs-btn"
                        to={`/cif?cod=${e.id}`}
                      >
                        Open in CIF map
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <footer className="pubs-footer">
        <p>
          Data from the{' '}
          <a
            href="https://www.crystallography.net/cod/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Crystallography Open Database
          </a>{' '}
          (public domain). No paywalled PDFs are hosted here. CSD literature is
          not scraped.
        </p>
        <p>
          <Link to="/cif">CIF symmetry map</Link>
          {' · '}
          <Link to="/">Home</Link>
        </p>
      </footer>
    </div>
  )
}
