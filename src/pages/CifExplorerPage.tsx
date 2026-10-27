import {
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { Link } from 'react-router-dom'
import CifLoadPanel from '../components/cif/CifLoadPanel'
import CifStructurePanel from '../components/cif/CifStructurePanel'
import CifViewport from '../components/cif/CifViewport'
import type {
  CifColorMode,
  CifPlacementMode,
  CifThermalMode,
  CifVisibility,
} from '../components/cif/cifViewTypes'
import {
  countDemoElements,
  elementsDemoForStructure,
} from '../data/cif/demoWithCifCell'
import { expandStructure } from '../data/cif/expandStructure'
import {
  CorsBlockedError,
  CsdManualError,
  fetchRemoteCif,
  NotFoundError,
} from '../data/cif/fetchRemoteCif'
import { parseCif } from '../data/cif/parseCif'
import {
  csdAccessStructuresUrl,
  parseStructureCode,
} from '../data/cif/structureCode'
import type { ExpandedStructure } from '../data/cif/types'

const SAMPLE_URL = `${import.meta.env.BASE_URL}samples/acetic_p21c.cif`

export default function CifExplorerPage() {
  const [structure, setStructure] = useState<ExpandedStructure | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedOp, setSelectedOp] = useState(1)
  const [visibility, setVisibility] = useState<CifVisibility>('molecules')
  const [placementMode, setPlacementMode] =
    useState<CifPlacementMode>('nearest')
  const [showSymmetryElements, setShowSymmetryElements] = useState(true)
  const [colorMode, setColorMode] = useState<CifColorMode>('operator')
  const [thermalMode, setThermalMode] = useState<CifThermalMode>('off')
  const [resetToken, setResetToken] = useState(0)
  const [busy, setBusy] = useState(false)
  const [codeInput, setCodeInput] = useState('1100303')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [remoteHint, setRemoteHint] = useState<string | null>(null)
  const [remoteLink, setRemoteLink] = useState<string | null>(null)

  const loadText = useCallback((text: string, name: string) => {
    setBusy(true)
    setError(null)
    setRemoteHint(null)
    setRemoteLink(null)
    try {
      const parsed = parseCif(text)
      const expanded = expandStructure(parsed)
      setStructure(expanded)
      setFileName(name)
      setSelectedOp(1)
      setVisibility('molecules')
      setResetToken((t) => t + 1)
      if (!expanded.atoms.length) {
        setError('Parsed CIF but found no atoms to display.')
      }
    } catch (e) {
      setStructure(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [])

  const onFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const text = await file.text()
      loadText(text, file.name)
      e.target.value = ''
    },
    [loadText],
  )

  const loadSample = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(SAMPLE_URL)
      if (!res.ok) throw new Error(`Could not load sample (${res.status})`)
      const text = await res.text()
      loadText(text, 'acetic_p21c.cif (sample)')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }, [loadText])

  const loadByCode = useCallback(async (override?: string) => {
    const parsed = parseStructureCode(override ?? codeInput)
    if (!parsed.ok) {
      setError(parsed.error)
      setRemoteHint(null)
      setRemoteLink(null)
      return
    }
    setBusy(true)
    setError(null)
    setRemoteHint(null)
    setRemoteLink(null)
    try {
      if (parsed.code.kind === 'csd') {
        const url = csdAccessStructuresUrl(parsed.code.refcode)
        setRemoteLink(url)
        setRemoteHint(
          `CSD ${parsed.code.refcode}: CCDC has no free anonymous CIF stream. Open Access Structures, accept terms, download the CIF, then upload or paste it here.`,
        )
        setPasteOpen(true)
        setError(
          `CSD ${parsed.code.refcode} cannot be streamed from this static site (CCDC license). Use Access Structures → download → upload/paste.`,
        )
        return
      }
      const remote = await fetchRemoteCif(parsed.code.id)
      loadText(remote.text, remote.label)
    } catch (e) {
      if (e instanceof CsdManualError) {
        setRemoteLink(e.accessUrl)
        setRemoteHint(e.message)
        setPasteOpen(true)
        setError(e.message)
      } else if (e instanceof CorsBlockedError) {
        setRemoteLink(e.codUrl)
        setRemoteHint(
          `COD ${e.id} is public, but the browser blocked a direct fetch (no CORS on crystallography.net). Use a cached teaching COD chip, paste/upload the CIF, configure VITE_COD_PROXY for arbitrary ids, or use local vite /cod-proxy.`,
        )
        setPasteOpen(true)
        setError(e.message)
      } else if (e instanceof NotFoundError) {
        setError(e.message)
      } else {
        setError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setBusy(false)
    }
  }, [codeInput, loadText])

  const loadPaste = useCallback(() => {
    if (!pasteText.trim()) {
      setError('Paste CIF text first.')
      return
    }
    const guess = parseStructureCode(codeInput)
    const name = guess.ok ? `${guess.code.display} (pasted)` : 'pasted.cif'
    loadText(pasteText, name)
  }, [pasteText, codeInput, loadText])

  const selected = useMemo(() => {
    if (!structure) return null
    return (
      structure.operators.find((o) => o.index === selectedOp) ??
      structure.operators[0] ??
      null
    )
  }, [structure, selectedOp])

  const moleculesForOp = useMemo(() => {
    if (!structure) return new Map<number, number>()
    const m = new Map<number, number>()
    for (let id = 0; id < structure.moleculeCount; id++) {
      const op = structure.moleculeOpIndex[id]!
      m.set(op, (m.get(op) ?? 0) + 1)
    }
    return m
  }, [structure])

  const elementDemo = useMemo(() => {
    if (!structure) return null
    return elementsDemoForStructure(structure) ?? null
  }, [structure])

  const elementCount = elementDemo ? countDemoElements(elementDemo) : 0
  const canShowElements = elementDemo != null && elementCount > 0

  const atomCountForOp = useCallback(
    (opIndex: number) =>
      structure ? structure.atoms.filter((a) => a.opIndex === opIndex).length : 0,
    [structure],
  )

  const onOpKeyDown = useCallback(
    (e: KeyboardEvent<HTMLUListElement>) => {
      if (!structure?.operators.length) return
      const ops = structure.operators
      const idx = ops.findIndex((o) => o.index === selectedOp)
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        const next = ops[(idx + 1) % ops.length]!
        setSelectedOp(next.index)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const next = ops[(idx - 1 + ops.length) % ops.length]!
        setSelectedOp(next.index)
      } else if (e.key === 'Home') {
        e.preventDefault()
        setSelectedOp(ops[0]!.index)
      } else if (e.key === 'End') {
        e.preventDefault()
        setSelectedOp(ops[ops.length - 1]!.index)
      }
    },
    [structure, selectedOp],
  )

  return (
    <div className="app layout-demo cif-explorer">
      <aside className="panel">
        <header className="panel-header">
          <div className="panel-nav-row">
            <Link to="/" className="back-link">
              ← All space groups
            </Link>
            <Link to="/sg/14" className="back-link cif-jump">
              Try P21/c
            </Link>
          </div>
          <p className="eyebrow">Application</p>
          <h1>CIF symmetry map</h1>
          <p className="blurb">
            Load a COD code, paste/upload a CSD or COD CIF, and explore intact
            molecules colored by the symmetry operator that generated each
            copy. Lattice a/b/c (and angles) label the unit-cell box.
          </p>
        </header>

        <CifLoadPanel
          busy={busy}
          codeInput={codeInput}
          onCodeInputChange={setCodeInput}
          onLoadByCode={() => void loadByCode()}
          onLoadCodId={(id) => {
            setCodeInput(id)
            void loadByCode(id)
          }}
          onFile={onFile}
          onLoadSample={() => void loadSample()}
          pasteOpen={pasteOpen}
          onTogglePaste={() => setPasteOpen((o) => !o)}
          pasteText={pasteText}
          onPasteTextChange={setPasteText}
          onLoadPaste={loadPaste}
          remoteHint={remoteHint}
          remoteLink={remoteLink}
          fileName={fileName}
          error={error}
        />

        {structure && (
          <CifStructurePanel
            structure={structure}
            selectedOp={selectedOp}
            onSelectOp={setSelectedOp}
            moleculesForOp={moleculesForOp}
            atomCountForOp={atomCountForOp}
            onOpKeyDown={onOpKeyDown}
            elementDemo={elementDemo}
            selected={selected}
          />
        )}
      </aside>

      <CifViewport
        structure={structure}
        selectedOp={selectedOp}
        onSelectOp={setSelectedOp}
        visibility={visibility}
        onVisibilityChange={setVisibility}
        placementMode={placementMode}
        onPlacementModeChange={setPlacementMode}
        showSymmetryElements={showSymmetryElements}
        onToggleSymmetryElements={() => setShowSymmetryElements((v) => !v)}
        canShowElements={canShowElements}
        elementCount={elementCount}
        elementDemo={elementDemo}
        resetToken={resetToken}
        onResetView={() => setResetToken((t) => t + 1)}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        thermalMode={thermalMode}
        onThermalModeChange={setThermalMode}
      />
    </div>
  )
}
