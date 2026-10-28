import VisitCounter from './VisitCounter'

/** Shared bottom copyright line for index-shell pages (visits in parentheses at end). */
export default function SiteCopyright() {
  return (
    <div className="site-copyright">
      <p className="site-copyright-line">
        Copyright © bioforcefield 2026–2027, all rights reserved. Powered by Grok
        Bot. Contact:{' '}
        <a href="mailto:bioforcefield@gmail.com">bioforcefield@gmail.com</a> (
        <VisitCounter />)
      </p>
    </div>
  )
}
