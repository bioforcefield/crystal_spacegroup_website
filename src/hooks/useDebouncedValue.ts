import { useEffect, useState } from 'react'

/** Debounce a rapidly changing value (e.g. powder λ / 2θ / FWHM sliders). */
export function useDebouncedValue<T>(value: T, ms = 80): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(id)
  }, [value, ms])
  return debounced
}
