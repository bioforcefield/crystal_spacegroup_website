import { useEffect, useState } from 'react'
import {
  fetchVisitCount,
  visitCounterLabel,
} from '../data/visits/visitsApi'

type Props = {
  /** Extra class on the chip (e.g. visit-counter--footer). */
  className?: string
  /** Render " (N)" with its own parentheses, and nothing at all until a count is known (no "(—)"). */
  parens?: boolean
}

/**
 * Compact privacy-light visit chip. Shows just the count "N" (or "—" on failure) inside the footer parentheses.
 * Increments once per browser tab session via the COD Cloudflare worker /visits.
 */
export default function VisitCounter({ className, parens = false }: Props) {
  const [text, setText] = useState(() => visitCounterLabel(null))
  const [known, setKnown] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const count = await fetchVisitCount()
      if (!cancelled) {
        setText(visitCounterLabel(count))
        setKnown(count != null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (parens && !known) return null
  if (parens)
    return (
      <span className={['visit-counter', className].filter(Boolean).join(' ')} aria-label={`${text} visits`}>
        {` · Visits ${text}`}
      </span>
    )
  return (
    <span
      className={['visit-counter', className].filter(Boolean).join(' ')}
      aria-label={text}
    >
      {text}
    </span>
  )
}
