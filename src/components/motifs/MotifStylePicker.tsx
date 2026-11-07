import { useCallback, useEffect, useId, useState } from 'react'
import {
  isMotifStyleId,
  MOTIF_STYLE_OPTIONS,
  MOTIF_STYLE_STORAGE_KEY,
  readMotifStyle,
  writeMotifStyle,
  type MotifStyleId,
} from './motifStyles'

/**
 * Persistent motif-style preference. First visit → Tetra pebble; a valid
 * stored choice survives navigation and reloads; invalid values fall back.
 */
export function useMotifStyle(): [MotifStyleId, (s: MotifStyleId) => void] {
  const [style, setStyle] = useState<MotifStyleId>(() => readMotifStyle())
  const update = useCallback((s: MotifStyleId) => {
    if (!isMotifStyleId(s)) return
    setStyle(s)
    writeMotifStyle(s)
  }, [])
  // Keep other open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === MOTIF_STYLE_STORAGE_KEY) setStyle(readMotifStyle())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return [style, update]
}

export default function MotifStylePicker({
  value,
  onChange,
}: {
  value: MotifStyleId
  onChange: (s: MotifStyleId) => void
}) {
  const id = useId()
  const current = MOTIF_STYLE_OPTIONS.find((o) => o.id === value)
  return (
    <div className="motif-style-picker">
      <label htmlFor={id}>
        <span className="label-full">Motif style</span>
        <span className="label-short">Motif</span>
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const v = e.target.value
          if (isMotifStyleId(v)) onChange(v)
        }}
        title={current?.description}
        aria-describedby={`${id}-desc`}
      >
        {MOTIF_STYLE_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <span id={`${id}-desc`} className="sr-only">
        {current?.description}. Visual only: positions, operations and handedness
        are identical in every style.
      </span>
    </div>
  )
}
