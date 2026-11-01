import VisitCounter from './VisitCounter'

/** Shared bottom copyright line for index-shell pages (visits in parentheses at end). */
/** Visits are displayed only on the front page; other pages count silently. */
export default function SiteCopyright({ showVisits = false }: { showVisits?: boolean }) {
  return (
    <div className="site-copyright">
      <p className="site-copyright-line">
        Copyright © 2026–2027, all rights reserved. Contact:{' '}
        <a href="mailto:contact@crystalspacegroups.com">contact@crystalspacegroups.com</a>. Powered by Grok Bot.
        {showVisits ? <VisitCounter parens /> : <VisitCounter silent />}
      </p>
    </div>
  )
}
