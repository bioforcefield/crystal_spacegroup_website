import { useId, useSyncExternalStore } from 'react'
import {
  DEFAULT_MOTIF_STYLE,
  isMotifStyleId,
  MOTIF_STYLE_OPTIONS,
  MOTIF_STYLE_STORAGE_KEY,
  type MotifStyleId,
} from './motifStyles'

/**
 * Persistent motif-style preference. First visit → Tetra pebble; a valid
 * stored choice survives navigation and reloads; invalid values fall back.
 */
// One module store so every picker / viewer on the page shares the choice
// immediately; other tabs follow through the storage event. When storage
// cannot hold the choice (private mode, quota), the in-memory choice wins so
// the picker never snaps back.
const styleListeners = new Set<() => void>()
let memoryStyle: MotifStyleId | null = null
let styleStorageHooked = false

function getStyle(): MotifStyleId {
  if (memoryStyle !== null) return memoryStyle
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(MOTIF_STYLE_STORAGE_KEY) : null
    return isMotifStyleId(raw) ? raw : DEFAULT_MOTIF_STYLE
  } catch {
    return DEFAULT_MOTIF_STYLE
  }
}
function subscribeStyle(l: () => void): () => void {
  styleListeners.add(l)
  if (!styleStorageHooked && typeof window !== 'undefined') {
    styleStorageHooked = true
    window.addEventListener('storage', (e) => {
      if (e.key !== MOTIF_STYLE_STORAGE_KEY) return
      memoryStyle = null
      styleListeners.forEach((f) => f())
    })
  }
  return () => {
    styleListeners.delete(l)
  }
}
function persisted(s: MotifStyleId): boolean {
  try {
    localStorage.setItem(MOTIF_STYLE_STORAGE_KEY, s)
    return localStorage.getItem(MOTIF_STYLE_STORAGE_KEY) === s
  } catch {
    return false
  }
}
function setSharedStyle(s: MotifStyleId) {
  if (!isMotifStyleId(s)) return
  memoryStyle = persisted(s) ? null : s
  styleListeners.forEach((f) => f())
}

export function useMotifStyle(): [MotifStyleId, (s: MotifStyleId) => void] {
  const style = useSyncExternalStore(subscribeStyle, getStyle, () => DEFAULT_MOTIF_STYLE)
  return [style, setSharedStyle]
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
