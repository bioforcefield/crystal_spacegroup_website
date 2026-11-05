import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ITA_GUIDE_BLURB,
  ITA_GUIDE_CAVEATS,
  ITA_GUIDE_CITATIONS,
  ITA_GUIDE_TITLE,
  ITA_PLANE_NORMAL_STYLES,
  ITA_PLANE_PARALLEL_STYLES,
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

/** Schematic marks only — not IUCr artwork. Shapes follow ITA/Dauter descriptions. */
function SymbolSamples() {
  return (
    <div className="ita-sym-grid" data-testid="ita-guide-symbols">
      <SvgFrame label="2-fold ⊥ page (lens)">
        {/* Single pointed filled lens (vesica), not crossed ellipses */}
        <path
          data-testid="glyph-twofold-perp"
          d="M32 7 C41 12 41 28 32 33 C23 28 23 12 32 7 Z"
          fill="#0f172a"
        />
      </SvgFrame>
      <SvgFrame label="2₁ ⊥ page (lens + S-tails)">
        <path
          data-testid="glyph-screw21-perp"
          d="M32 10 C39 14 39 26 32 30 C25 26 25 14 32 10 Z"
          fill="#0f172a"
        />
        {/* Curved S-tails characteristic of 2₁ ⊥ page */}
        <path
          d="M32 10 C38 6 44 5 48 8 M32 30 C26 34 20 35 16 32"
          stroke="#0f172a"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </SvgFrame>
      <SvgFrame label="2 ‖ page (full arrow)">
        <path d="M12 20 H52" stroke="#0f172a" strokeWidth="2" />
        <path d="M48 15 L56 20 L48 25 Z" fill="#0f172a" />
        <path d="M16 15 L8 20 L16 25 Z" fill="#0f172a" />
      </SvgFrame>
      <SvgFrame label="2₁ ‖ page (single-barb)">
        {/* Single-barb half-arrow (upper barb only), not a full triangular head */}
        <path data-testid="glyph-screw21-parallel" d="M10 20 H50" stroke="#0f172a" strokeWidth="2" />
        <path d="M50 20 L42 13" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      </SvgFrame>
      <SvgFrame label="Inversion centre">
        <circle cx="32" cy="20" r="5" fill="none" stroke="#0f172a" strokeWidth="2" />
      </SvgFrame>
      <SvgFrame label="Mirror ⊥ page (solid)">
        <path d="M32 6 V34" stroke="#0f172a" strokeWidth="3" />
      </SvgFrame>
      <SvgFrame label="Glide, in-page (dashed)">
        <path d="M32 6 V34" stroke="#0f172a" strokeWidth="3" strokeDasharray="5 4" />
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
      <SvgFrame label="Glide ∥ page (corner + arrow)">
        {/* Angular corner with in-page glide arrow; fraction = plane height */}
        <path d="M18 10 H40 V30" stroke="#0f172a" strokeWidth="2.5" fill="none" />
        <path d="M40 18 V32" stroke="#0f172a" strokeWidth="2" />
        <path d="M40 32 L36 26 M40 32 L44 26" stroke="#0f172a" strokeWidth="2" fill="none" />
        <text x="46" y="14" fontSize="10" fill="#0f172a">
          1/4
        </text>
      </SvgFrame>
      <SvgFrame label="General site +y (label beside)">
        <circle cx="26" cy="20" r="9" fill="none" stroke="#0f172a" strokeWidth="2" />
        <text x="42" y="24" fontSize="14" fill="#0f172a">
          +
        </text>
      </SvgFrame>
      <SvgFrame label="General site opposite hand">
        <circle cx="32" cy="20" r="9" fill="none" stroke="#0f172a" strokeWidth="2" />
        <text x="28" y="26" fontSize="16" fill="#0f172a">
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
                      A single pointed filled lens (not a four-pointed star) marks a
                      2-fold axis perpendicular to the page; triangles / squares /
                      hexagons mark 3-, 4- and 6-fold axes. Curved screw tails on a
                      lens mark 2₁ ⊥ page (Dauter &amp; Jaskolski, 2010; plate
                      014.png).
                    </li>
                    <li>
                      Full double-headed arrow = 2-fold <em>in</em> the page;
                      single-barb half-arrow = 2₁ in the page.
                    </li>
                    <li>Small open circle = inversion centre (−1).</li>
                    <li>
                      Planes <em>perpendicular</em> to the page use line style to
                      encode the glide component relative to that projection:
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
                      {ITA_PLANE_NORMAL_STYLES.map((row) => (
                        <tr key={row.id}>
                          <td>{row.label}</td>
                          <td>{row.style}</td>
                          <td>{row.meaning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p>
                    Planes <em>parallel</em> to the page use angular corners (ITA
                    §1.4.2), with an arrow when the plane is a glide:
                  </p>
                  <table className="ita-guide-table" data-testid="ita-guide-parallel-planes">
                    <thead>
                      <tr>
                        <th>Element</th>
                        <th>Symbol</th>
                        <th>Meaning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ITA_PLANE_PARALLEL_STYLES.map((row) => (
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
                      A fraction next to a mark is a height along the projection
                      direction (fraction of that cell edge). For{' '}
                      <em>planes parallel to the page</em>, ITA §1.4.2 states that
                      a printed fraction <em>h</em> denotes planes at <em>h</em> and{' '}
                      <em>h</em>+½ (no fraction ⇒ 0 and ½). That paired-height rule
                      is for those parallel-plane symbols — do not universalize it
                      to every fractional label.
                    </li>
                    <li>
                      On general-position diagrams the height labels sit{' '}
                      <em>beside</em> the circles: <strong>+</strong> /{' '}
                      <strong>−</strong> mean +height / −height of the representative
                      coordinate (e.g. +y / −y when projecting along <em>b</em>), and{' '}
                      <strong>½+</strong> / <strong>½−</strong> mean ½+height /
                      ½−height — not a fixed numeric elevation of the point.
                    </li>
                    <li>
                      A comma <em>inside</em> a circle marks the opposite
                      enantiomorph (improper image) of an open circle without a
                      comma.
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
