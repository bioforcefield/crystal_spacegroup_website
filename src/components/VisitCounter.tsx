import { useEffect, useState } from 'react'
import {
  fetchVisitCount,
  visitCounterLabel,
} from '../data/visits/visitsApi'

type Props = {
  /** Extra class on the chip (e.g. visit-counter--footer). */
  className?: string
}

/**
 * Compact privacy-light visit chip. Shows just the count "N" (or "—" on failure) inside the footer parentheses.
 * Increments once per browser tab session via the COD Cloudflare worker /visits.
 */
export default function VisitCounter({ className }: Props) {
  const [text, setText] = useState(() => visitCounterLabel(null))

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const count = await fetchVisitCount()
      if (!cancelled) setText(visitCounterLabel(count))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <span
      className={['visit-counter', className].filter(Boolean).join(' ')}
      aria-label={text}
    >
      {text}
    </span>
  )
}
