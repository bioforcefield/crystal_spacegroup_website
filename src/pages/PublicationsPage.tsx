import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  COD_PUBS,
  COD_PUBS_NOTE,
  PUB_TAG_BLURBS,
  PUB_TAG_LABELS,
  PUB_TAG_ORDER,
} from '../data/pubs/codPubs'
import {
  CROSSREF_PRESETS,
  TOPIC_HINT_TAGS,
  type CrossrefPublisherPreset,
  type CrossrefWork,
  crossrefQueryForHintTags,
  fetchCrossrefPage,
  recentYearOptions,
} from '../data/pubs/crossref'
import {
  collectYears,
  countByTag,
  doiUrl,
  filterPubs,
  groupPubsByYear,
} from '../data/pubs/filterPubs'
import type { PubTag } from '../data/pubs/types'

type PubsMode = 'curated' | 'recent'

export default function PublicationsPage() {
  const [mode, setMode] = useState<PubsMode>('recent')

  return (
    <div className="pubs-page">
      <header className="pubs-hero">
        <p className="eyebrow">Literature · metadata only</p>
        <h1>Publications &amp; structures</h1>
        <p className="pubs-lead">
          Switch between a <strong>curated COD</strong> teaching set (historical
          + recent deposits) and <strong>Recent titles</strong> streamed live
          from Crossref — ACS, IUCr, RSC, Wiley crystallography journals.
          Titles and DOIs only; we never host PDFs or scrape publisher HTML.
        </p>
        <div
          className="pubs-mode-tabs"
          role="tablist"
          aria-label="Publications source"
        >
          <button
            type="button"
            role="tab"
            id="pubs-tab-recent"
            aria-selected={mode === 'recent'}
            aria-controls="pubs-panel-recent"
            className={`pubs-mode-tab${mode === 'recent' ? ' active' : ''}`}
            onClick={() => setMode('recent')}
          >
            Recent titles
          </button>
          <button
            type="button"
            role="tab"
            id="pubs-tab-curated"
            aria-selected={mode === 'curated'}
            aria-controls="pubs-panel-curated"
            className={`pubs-mode-tab${mode === 'curated' ? ' active' : ''}`}
            onClick={() => setMode('curated')}
          >
            Curated COD
          </button>
        </div>
      </header>

      {mode === 'recent' ? (
        <RecentTitlesPanel />
      ) : (
        <CuratedCodPanel />
      )}

      <footer className="pubs-footer">
        <p>
          Curated cards use the{' '}
          <a
            href="https://www.crystallography.net/cod/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Crystallography Open Database
          </a>{' '}
          (public domain). Recent titles use the{' '}
          <a
            href="https://www.crossref.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Crossref
          </a>{' '}
          REST API (metadata only). DOI links open the publisher landing page.
          No paywalled PDFs are hosted here. CSD literature is not scraped.
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

function CuratedCodPanel() {
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
    <div
      id="pubs-panel-curated"
      role="tabpanel"
      aria-labelledby="pubs-tab-curated"
    >
      <p className="pubs-note">{COD_PUBS_NOTE}</p>

      <section className="pubs-filters" aria-label="Filter curated publications">
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
            {PUB_TAG_ORDER.filter((t) => (tagCounts[t] ?? 0) > 0).map((t) => (
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
                {PUB_TAG_LABELS[t]}
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
                <strong>{PUB_TAG_LABELS[t]}</strong> — {PUB_TAG_BLURBS[t]}
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
          {tags.length ? ` · tags: ${tags.map((x) => PUB_TAG_LABELS[x]).join(', ')}` : ''}
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
                          {PUB_TAG_LABELS[t]}
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
    </div>
  )
}

function RecentTitlesPanel() {
  const [preset, setPreset] = useState<CrossrefPublisherPreset>('acs')
  const [year, setYear] = useState<number | null>(null)
  const [hintFilter, setHintFilter] = useState<PubTag[]>([])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [works, setWorks] = useState<CrossrefWork[]>([])
  const [total, setTotal] = useState(0)
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const nextOffsetRef = useRef<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const yearOpts = useMemo(() => recentYearOptions(new Date(), 3), [])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 350)
    return () => window.clearTimeout(t)
  }, [query])

  const load = useCallback(async (mode: 'replace' | 'append') => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    if (mode === 'replace') {
      setLoading(true)
      setError(null)
      nextOffsetRef.current = null
      setNextOffset(null)
    } else {
      if (nextOffsetRef.current == null) return
      setLoadingMore(true)
    }
    try {
      const topicQ = crossrefQueryForHintTags(hintFilter)
      const qParts = [debouncedQuery, topicQ].filter(
        (s): s is string => Boolean(s && s.trim()),
      )
      const page = await fetchCrossrefPage(
        {
          preset,
          year,
          query: qParts.length ? qParts.join(' ') : undefined,
          offset: mode === 'append' ? (nextOffsetRef.current ?? 0) : 0,
          recentYears: 3,
        },
        { signal: ac.signal },
      )
      if (ac.signal.aborted) return
      setTotal(page.total)
      nextOffsetRef.current = page.nextOffset
      setNextOffset(page.nextOffset)
      setWorks((prev) =>
        mode === 'append' ? [...prev, ...page.works] : page.works,
      )
    } catch (e) {
      if (ac.signal.aborted) return
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      if (mode === 'replace') {
        setWorks([])
        setTotal(0)
        nextOffsetRef.current = null
        setNextOffset(null)
      }
    } finally {
      if (!ac.signal.aborted) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [preset, year, debouncedQuery, hintFilter])

  // Initial + filter changes (not load-more)
  useEffect(() => {
    void load('replace')
  }, [load])

  const toggleHint = (t: PubTag) => {
    setHintFilter((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    )
  }

  // Topic chips all drive Crossref — never AND title heuristics on the result
  // set (that was the empty hydrate/CSP trap).
  const visible = works
  const topicOrQueryActive =
    hintFilter.length > 0 || Boolean(debouncedQuery.trim())
  const rankingNote = topicOrQueryActive
    ? 'relevance-ranked (not newest-first)'
    : 'newest-first'

  const presetInfo = CROSSREF_PRESETS.find((p) => p.id === preset)

  return (
    <div
      id="pubs-panel-recent"
      role="tabpanel"
      aria-labelledby="pubs-tab-recent"
    >
      <p className="pubs-note">
        Live Crossref metadata for crystallography journals (ISSN filters).
        Topic chips (hydrate, CSP, cocrystal, machine learning, …) run a Crossref search
        ranked by relevance — not a filter of the newest-first page. Card chips
        ending in “?” are still <em>title keyword hints</em>, not COD curation.
        Organic / inorganic live on the Curated COD tab. Open DOI goes to the
        publisher; no full text here.
      </p>

      <section className="pubs-filters" aria-label="Filter recent titles">
        <div className="pubs-filter-row">
          <span className="pubs-filter-label" id="pubs-pub-label">
            Publisher
          </span>
          <div
            className="pubs-year-chips"
            role="group"
            aria-labelledby="pubs-pub-label"
          >
            {CROSSREF_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`pubs-chip${preset === p.id ? ' active' : ''}`}
                aria-pressed={preset === p.id}
                title={p.blurb}
                onClick={() => setPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {presetInfo && (
            <p className="pubs-preset-blurb muted">{presetInfo.blurb}</p>
          )}
        </div>

        <div className="pubs-filter-row">
          <span className="pubs-filter-label" id="pubs-recent-year-label">
            Year
          </span>
          <div
            className="pubs-year-chips"
            role="group"
            aria-labelledby="pubs-recent-year-label"
          >
            {yearOpts.map((o) => (
              <button
                key={o.label}
                type="button"
                className={`pubs-chip${year === o.year ? ' active' : ''}`}
                aria-pressed={year === o.year}
                onClick={() => setYear(o.year)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pubs-filter-row">
          <label className="pubs-search-label" htmlFor="pubs-crossref-query">
            Search titles
          </label>
          <input
            id="pubs-crossref-query"
            type="search"
            className="pubs-search"
            placeholder="Optional Crossref query (debounced)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="pubs-filter-row">
          <span className="pubs-filter-label" id="pubs-hint-label">
            Topics
          </span>
          <div
            className="pubs-tag-chips"
            role="group"
            aria-labelledby="pubs-hint-label"
          >
            {TOPIC_HINT_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                className={`pubs-chip pubs-tag pubs-tag-${t}${
                  hintFilter.includes(t) ? ' active' : ''
                }`}
                aria-pressed={hintFilter.includes(t)}
                title={
                  PUB_TAG_BLURBS[t] +
                  ' · Crossref topic search (relevance ranked; not curated COD tags)'
                }
                onClick={() => toggleHint(t)}
              >
                {PUB_TAG_LABELS[t]}
              </button>
            ))}
          </div>
          {hintFilter.length > 0 && (
            <button
              type="button"
              className="pubs-clear"
              onClick={() => setHintFilter([])}
            >
              Clear topics
            </button>
          )}
        </div>

        <p className="pubs-count" role="status" aria-live="polite">
          {loading
            ? 'Loading Crossref titles…'
            : error
              ? `Error: ${error}`
              : topicOrQueryActive
                ? `Showing ${visible.length} top matches loaded · Crossref reports ~${total.toLocaleString()} bag-of-words hits · ${rankingNote}${
                    hintFilter.length
                      ? ` · topics: ${hintFilter.map((x) => PUB_TAG_LABELS[x]).join(', ')}`
                      : ''
                  }.`
                : `Showing ${visible.length} of ${works.length} loaded · ~${total.toLocaleString()} match filters · ${rankingNote}.`}
        </p>
      </section>

      <div className="pubs-timeline">
        {loading && works.length === 0 && (
          <p className="pubs-empty" role="status">
            Fetching recent titles from Crossref…
          </p>
        )}
        {!loading && !error && visible.length === 0 && (
          <p className="pubs-empty" role="status">
            No titles match. Try another publisher, year, or clear keyword
            hints.
          </p>
        )}
        {visible.length > 0 && (
          <ul className="pubs-cards pubs-cards-flat">
            {visible.map((w) => {
              const doi = doiUrl(w.doi)
              return (
                <li key={w.doi} className="pubs-card">
                  <div className="pubs-card-top">
                    <span className="pubs-card-year">{w.year ?? '—'}</span>
                    <span className="pubs-card-id">
                      {w.publisher ?? 'Publisher n/a'}
                    </span>
                  </div>
                  <h3 className="pubs-card-name">{w.title}</h3>
                  <p className="pubs-card-meta">
                    {w.journal ?? 'Journal n/a'}
                    {w.authorsShort ? ` · ${w.authorsShort}` : ''}
                  </p>
                  {w.hintTags.length > 0 && (
                    <div
                      className="pubs-card-tags"
                      aria-label="Title keyword hints"
                    >
                      {w.hintTags.map((t) => (
                        <span
                          key={t}
                          className={`pubs-mini-tag pubs-tag-${t}`}
                          title="Keyword hint from title — not curated"
                        >
                          {PUB_TAG_LABELS[t]}?
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="pubs-card-actions">
                    {doi ? (
                      <a
                        className="btn btn-primary pubs-btn"
                        href={doi}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open DOI ↗
                      </a>
                    ) : (
                      <span className="pubs-no-doi muted">No DOI</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {nextOffset != null && !error && (
          <div className="pubs-load-more">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={loadingMore || loading}
              onClick={() => void load('append')}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
