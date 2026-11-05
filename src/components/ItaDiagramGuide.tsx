import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ITA_GUIDE_BLURB,
  ITA_GUIDE_CAVEATS,
  ITA_GUIDE_CITATIONS,
  ITA_GUIDE_TITLE,
  ITA_PLANE_LINE_STYLES,
  P21C_ITA_WALKTHROUGH,
} from '../data/itaGuide'

type Props = {
  /** Current space-group number (highlights the P21/c walk-through when 14). */
  spaceGroupNumber?: number
  hm?: string
}

function SvgFrame({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <figure className="ita-sym">
      <svg
        viewBox="0 0 64 40"
        width="64"
        height="40"
        role="img"
        aria-label={label}
        className="ita-sym-svg"
      >
        {children}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  )
}

/** Schematic marks only — not IUCr artwork. */
function SymbolSamples() {
  return (
    <div className="ita-sym-grid" data-testid="ita-guide-symbols">
      <SvgFrame label="2-fold ⊥ page (lens)">
        <ellipse cx="32" cy="20" rx="10" ry="5" fill="#0f172a" />
        <ellipse cx="32" cy="20" rx="5" ry="10" fill="#0f172a" />
      </SvgFrame>
      <SvgFrame label="2₁ ⊥ page (lens + arms)">
        <ellipse cx="32" cy="20" rx="9" ry="4.5" fill="#0f172a" />
        <ellipse cx="32" cy="20" rx="4.5" ry="9" fill="#0f172a" />
        <path d="M22 12 L14 6 M42 28 L50 34" stroke="#0f172a" strokeWidth="2" fill="none" />
      </SvgFrame>
      <SvgFrame label="2 ‖ page (full arrow)">
        <path d="M10 20 H50" stroke="#0f172a" strokeWidth="2" />
        <path d="M46 16 L54 20 L46 24 Z" fill="#0f172a" />
        <path d="M18 16 L10 20 L18 24 Z" fill="#0f172a" />
      </SvgFrame>
      <SvgFrame label="2₁ ‖ page (half arrow)">
        <path d="M12 20 H48" stroke="#0f172a" strokeWidth="2" />
        <path d="M44 16 L52 20 L44 24 Z" fill="#0f172a" />
      </SvgFrame>
      <SvgFrame label="Inversion centre">
        <circle cx="32" cy="20" r="5" fill="none" stroke="#0f172a" strokeWidth="2" />
      </SvgFrame>
      <SvgFrame label="Mirror ⊥ page (solid)">
        <path d="M32 6 V34" stroke="#0f172a" strokeWidth="3" />
      </SvgFrame>
      <SvgFrame label="Glide, in-page (dashed)">
        <path
          d="M32 6 V34"
          stroke="#0f172a"
          strokeWidth="3"
          strokeDasharray="5 4"
        />
      </SvgFrame>
      <SvgFrame label="Glide, ⊥ page (dotted)">
        <path
          d="M32 6 V34"
          stroke="#0f172a"
          strokeWidth="3"
          strokeDasharray="1.5 3.5"
          strokeLinecap="round"
        />
      </SvgFrame>
      <SvgFrame label="General site (same hand)">
        <circle cx="32" cy="20" r="9" fill="none" stroke="#0f172a" strokeWidth="2" />
        <text x="32" y="24" textAnchor="middle" fontSize="12" fill="#0f172a">
          +
        </text>
      </SvgFrame>
      <SvgFrame label="General site (opposite hand)">
        <circle cx="32" cy="20" r="9" fill="none" stroke="#0f172a" strokeWidth="2" />
        <text x="32" y="25" textAnchor="middle" fontSize="14" fill="#0f172a">
          ,
        </text>
      </SvgFrame>
    </div>
  )
}

export default function ItaDiagramGuide({ spaceGroupNumber, hm }: Props) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const restoreTimer = useRef<number | null>(null)
  const highlightP21c = spaceGroupNumber === P21C_ITA_WALKTHROUGH.number

  useEffect(() => {
    if (!open) return
    if (restoreTimer.current != null) {
      window.clearTimeout(restoreTimer.current)
      restoreTimer.current = null
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    modalRef.current?.querySelector<HTMLButtonElement>('.ita-guide-close')?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      const btn = btnRef.current
      restoreTimer.current = window.setTimeout(() => {
        restoreTimer.current = null
        btn?.focus()
      }, 0)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="btn btn-small ita-guide-open"
        data-testid="ita-guide-open"
        onClick={() => setOpen(true)}
        aria-label={ITA_GUIDE_TITLE}
        title={ITA_GUIDE_TITLE}
      >
        How to read
      </button>
      {open &&
        createPortal(
          <div
            className="ita-guide-backdrop"
            data-testid="ita-guide-backdrop"
            onMouseDown={(e) => {
              if (e.target !== e.currentTarget) return
              e.preventDefault()
              setOpen(false)
            }}
          >
            <div
              ref={modalRef}
              className="ita-guide-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ita-guide-title"
              data-testid="ita-guide-modal"
            >
              <div className="ita-guide-bar">
                <div>
                  <h2 id="ita-guide-title">{ITA_GUIDE_TITLE}</h2>
                  <p className="muted ita-guide-sub">
                    {hm != null && spaceGroupNumber != null
                      ? `Open beside space group ${spaceGroupNumber} · ${hm}. `
                      : null}
                    {ITA_GUIDE_BLURB}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-small ita-guide-close"
                  data-testid="ita-guide-close"
                  onClick={() => setOpen(false)}
                  aria-label="Close (Esc)"
                >
                  ✕
                </button>
              </div>

              <div className="ita-guide-body">
                <section>
                  <h3>Two diagram types</h3>
                  <p>
                    Each ITA space-group plate pairs{' '}
                    <strong>symmetry-element projections</strong> (where axes,
                    planes and inversion centres sit) with a{' '}
                    <strong>general-position diagram</strong> (circles for one
                    orbit of equivalent points). They are different drawings of
                    the same group — elements on one side, point images on the
                    other (ITA explanation of the space-group data; Dauter &amp;
                    Jaskolski, 2010).
                  </p>
                </section>

                <section>
                  <h3>Projection direction and page axes</h3>
                  <p>
                    Diagrams are orthogonal projections of the unit cell. Many
                    higher-symmetry groups use a view along <em>c</em> with{' '}
                    <em>a</em> down the page and <em>b</em> to the right; triclinic,
                    monoclinic and orthorhombic entries show several projections
                    (Dauter &amp; Jaskolski, 2010). Always read the axis letters
                    printed on the plate — monoclinic unique-axis settings rotate
                    which direction is “up” on the page.
                  </p>
                </section>

                <section>
                  <h3>Common graphical marks</h3>
                  <p className="muted">
                    Schematic SVG samples for orientation only. Official exhaustive
                    tables: ITA 2.1.2.2–2.1.2.7.
                  </p>
                  <SymbolSamples />
                  <ul className="ita-guide-list">
                    <li>
                      Filled lenses / triangles / squares / hexagons: 2-, 3-, 4-
                      or 6-fold axes <em>perpendicular</em> to the page; extra
                      arms mark screws (Dauter &amp; Jaskolski, 2010).
                    </li>
                    <li>
                      Full arrow = 2-fold <em>in</em> the page; half-arrow = 2₁ in
                      the page.
                    </li>
                    <li>Small open circle = inversion centre (−1).</li>
                    <li>
                      Planes perpendicular to the page use line style to encode the
                      glide component relative to <em>that</em> projection:
                    </li>
                  </ul>
                  <table className="ita-guide-table">
                    <thead>
                      <tr>
                        <th>Element</th>
                        <th>Line style</th>
                        <th>Meaning in that projection</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ITA_PLANE_LINE_STYLES.map((row) => (
                        <tr key={row.id}>
                          <td>{row.label}</td>
                          <td>{row.style}</td>
                          <td>{row.meaning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <section>
                  <h3>Heights, + / − and commas</h3>
                  <ul className="ita-guide-list">
                    <li>
                      A fraction beside an element parallel to the page is its
                      height as a fraction of the cell edge along the projection
                      direction. Matching elements half a cell higher are often
                      implied (Dauter &amp; Jaskolski, 2010).
                    </li>
                    <li>
                      On general-position diagrams, <strong>+</strong> /{' '}
                      <strong>−</strong> mark the sign of the height coordinate;{' '}
                      <strong>½+</strong> means ½ plus that height,{' '}
                      <strong>½−</strong> means ½ minus that height.
                    </li>
                    <li>
                      A comma inside a circle marks the opposite enantiomorph
                      (improper image) of an open circle without a comma.
                    </li>
                  </ul>
                </section>

                <section
                  className={highlightP21c ? 'ita-guide-example is-current' : 'ita-guide-example'}
                  data-testid="ita-guide-p21c"
                >
                  <h3>
                    Worked example · {P21C_ITA_WALKTHROUGH.hm} (No.{' '}
                    {P21C_ITA_WALKTHROUGH.number})
                  </h3>
                  <p>
                    <strong>{P21C_ITA_WALKTHROUGH.setting}.</strong>{' '}
                    {P21C_ITA_WALKTHROUGH.plateLayout}{' '}
                    {P21C_ITA_WALKTHROUGH.note}
                  </p>
                  <ol className="ita-guide-steps">
                    {P21C_ITA_WALKTHROUGH.panels.map((p) => (
                      <li key={p.id}>
                        <strong>{p.title}.</strong> {p.whatToSee}
                      </li>
                    ))}
                  </ol>
                  <p>General-position triplets for this setting (multiplicity 4):</p>
                  <table className="ita-guide-table" data-testid="ita-guide-p21c-ops">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Triplet</th>
                        <th>Operation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {P21C_ITA_WALKTHROUGH.operators.map((op) => (
                        <tr key={op.index}>
                          <td>{op.index}</td>
                          <td>
                            <code>{op.triplet}</code>
                          </td>
                          <td>{op.label}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="muted">
                    These triplets match the operators used on this site for
                    /sg/14 and the standard ITA general position for cell choice
                    1, unique axis b. Compare them with the circled sites on the
                    plate (Enlarge the diagram beside this guide).
                  </p>
                </section>

                <section>
                  <h3>Limits of this guide</h3>
                  <ul className="ita-guide-list">
                    {ITA_GUIDE_CAVEATS.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3>Sources</h3>
                  <ul className="ita-guide-cites" data-testid="ita-guide-citations">
                    {ITA_GUIDE_CITATIONS.map((c) => (
                      <li key={c.id}>
                        <a href={c.url} target="_blank" rel="noopener noreferrer">
                          {c.label}
                        </a>
                        <span className="muted"> — {c.note}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="muted">
                    Space-group plates on this site are reproduced from
                    International Tables for Crystallography Vol. A with
                    acknowledgment (© IUCr). This guide’s SVG marks are original
                    schematics for learning, not copies of IUCr figures.
                  </p>
                </section>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
