import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  lazy,
  Suspense,
} from 'react'
import { LatticeLabLogo } from '../components/brand/LatticeLabLogo'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  breadcrumbLabel,
  cifPath,
  loadStoredFile,
  parseCifPath,
  parseViewQuery,
  SAMPLES,
  serializeViewQuery,
  storeFile,
  targetKey,
  VIEW_DEFAULTS,
  type CifTarget,
  type CifViewQuery,
} from '../data/cif/cifRoute'
import CifLoadPanel from '../components/cif/CifLoadPanel'
import CifStructurePanel from '../components/cif/CifStructurePanel'
import CifViewport from '../components/cif/CifViewport'
import type {
  CifColorMode,
  CifHBondMode,
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
  sourceBadgeLabel,
} from '../data/cif/fetchRemoteCif'
import { parseCif } from '../data/cif/parseCif'
import {
  csdAccessStructuresUrl,
  parseStructureCode,
} from '../data/cif/structureCode'
import type { ExpandedStructure } from '../data/cif/types'
import { looksLikeMmcif, parseMmcif } from '../data/pdb/mmcif'
import { pastedName, readStructureFile, toMmcifIfNeeded } from '../data/pdb/formats'
import SequenceStrip, { type StripEntry } from '../components/cif/SequenceStrip'
import type { Vec3 } from '../data/types'
import { buildMacroModel, expandMacro, type MacroModel, type PdbRepresentation } from '../data/pdb/macro'
import { analyzeLigand, INTERACTION_TYPES, type InteractionType } from '../data/pdb/interactions'
import { fetchPdbCif, rcsbEntryUrl } from '../data/pdb/fetchPdb'
import PdbLigandPanel from '../components/cif/PdbLigandPanel'
import CifXrayPanel from '../components/cif/CifXrayPanel'
import type { AnalysisTab } from '../data/cif/cifRoute'
import type { AnalysisFocus } from '../components/cif/analysis/types'
const StructureAnalysisPanel = lazy(() => import('../components/cif/analysis/StructureAnalysisPanel'))

const SAMPLE_BASE = `${import.meta.env.BASE_URL}samples/`
const safeSession = () => {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : undefined
  } catch {
    return undefined
  }
}

export default function CifExplorerPage() {
  const [structure, setStructure] = useState<ExpandedStructure | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [sourceText, setSourceText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedOp, setSelectedOp] = useState(1)
  const [visibility, setVisibility] = useState<CifVisibility>('molecules')
  const [placementMode, setPlacementMode] =
    useState<CifPlacementMode>('nearest')
  const [showSymmetryElements, setShowSymmetryElements] = useState(true)
  const [colorMode, setColorMode] = useState<CifColorMode>('operator')
  const [thermalMode, setThermalMode] = useState<CifThermalMode>('off')
  const [hbondMode, setHBondMode] = useState<CifHBondMode>('off')
  const [resetToken, setResetToken] = useState(0)
  const [busy, setBusy] = useState(false)
  const [codeInput, setCodeInput] = useState('1100303')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [remoteHint, setRemoteHint] = useState<string | null>(null)
  const [remoteLink, setRemoteLink] = useState<string | null>(null)
  // —— PDB (macromolecule) state ——
  const [macroModel, setMacroModel] = useState<MacroModel | null>(null)
  const [pdbRep, setPdbRep] = useState<PdbRepresentation>('cartoon')
  const [showWaters, setShowWaters] = useState(false)
  const [focusLig, setFocusLigRaw] = useState<string | null>(null)
  const [diagramOpen, setDiagramOpen] = useState(false)
  const [highlightRes, setHighlightRes] = useState<string | null>(null)
  const [centerRes, setCenterRes] = useState<string | null>(null)
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab | null>(null)
  const [analysisFocus, setAnalysisFocus] = useState<AnalysisFocus | null>(null)
  const setFocusLig = useCallback((id: string | null) => {
    setFocusLigRaw(id)
    setCenterRes(null)
    setHighlightRes(null)
    if (!id) setDiagramOpen(false)
  }, [])
  const [interTypes, setInterTypes] = useState<Set<InteractionType>>(() => new Set(INTERACTION_TYPES.map((t) => t.v)))
  const [pdbInput, setPdbInput] = useState('1crn')
  // —— comparison set for the sequence strip ——
  const [pinnedRes, setPinnedRes] = useState<string | null>(null)
  const [compareSet, setCompareSet] = useState<StripEntry[]>([])
  const [compareBusy, setCompareBusy] = useState(false)
  const [compareError, setCompareError] = useState<string | null>(null)
  const [overlayTraces, setOverlayTraces] = useState<{ points: Vec3[][]; color: string }[] | null>(null)
  const addCompareText = useCallback((key: string, label: string, text: string) => {
    const conv = toMmcifIfNeeded(text, label)
    if (!looksLikeMmcif(conv.text)) throw new Error(`${label}: not a macromolecule file (mmCIF, PDB or Maestro)`)
    const model = buildMacroModel(parseMmcif(conv.text))
    setCompareSet((s) => [...s.filter((e) => e.key !== key), { key, label, model }])
  }, [])
  const addComparePdb = useCallback(async (id: string) => {
    setCompareBusy(true)
    setCompareError(null)
    try {
      const text = await fetchPdbCif(id.trim().toLowerCase())
      addCompareText(`pdb:${id.toLowerCase()}`, id.toUpperCase(), text)
    } catch (e) {
      setCompareError(e instanceof Error ? e.message : String(e))
    } finally {
      setCompareBusy(false)
    }
  }, [addCompareText])
  const addCompareFile = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCompareBusy(true)
    setCompareError(null)
    try {
      const { name, text } = await readStructureFile(file)
      addCompareText(`file:${name}`, name, text)
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : String(err))
    } finally {
      setCompareBusy(false)
    }
  }, [addCompareText])
  const expandKeyRef = useRef('')
  const phone = usePhone()
  const location = useLocation()
  const navigate = useNavigate()
  const target = useMemo(() => parseCifPath(location.pathname), [location.pathname])
  const tKey = targetKey(target)
  /** Route key of the structure currently shown (null while nothing / failed). */
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [routeNote, setRouteNote] = useState<string | null>(null)

  const loadText = useCallback((
    text: string,
    name: string,
    remote?: { hint?: string | null; link?: string | null },
    route?: { key: string; view: CifViewQuery },
  ) => {
    setBusy(true)
    setError(null)
    setRemoteHint(remote?.hint ?? null)
    setRemoteLink(remote?.link ?? null)
    try {
      const view0 = route?.view ?? VIEW_DEFAULTS
      let expanded: ExpandedStructure
      const conv = toMmcifIfNeeded(text, name)
      if (looksLikeMmcif(conv.text)) {
        const model = buildMacroModel(parseMmcif(conv.text))
        if (conv.note) model.warnings.push(conv.note)
        const r = view0.rep ?? 'cartoon'
        expanded = expandMacro(model, r, false)
        expandKeyRef.current = `${r}|false`
        setMacroModel(model)
        setPdbRep(r)
        setShowWaters(false)
        const lig0 = view0.lig && model.ligands.some((l) => l.id === view0.lig) ? view0.lig : null
        setFocusLig(lig0)
        setDiagramOpen(!!lig0 && !!view0.diagram)
        setAnalysisTab(view0.analysis ?? null)
        setAnalysisFocus(null)
      } else {
        expanded = expandStructure(parseCif(text))
        setMacroModel(null)
        setFocusLig(null)
        setAnalysisTab(null)
        setAnalysisFocus(null)
      }
      setStructure(expanded)
      setFileName(name)
      setSourceText(text)
      const view = route?.view ?? VIEW_DEFAULTS
      setSelectedOp(
        expanded.operators.some((o) => o.index === view.op) ? view.op : 1,
      )
      setVisibility(view.show)
      if (route) {
        setPlacementMode(view.view)
        setColorMode(view.color)
      }
      setLoadedKey(route?.key ?? null)
      setResetToken((t) => t + 1)
      if (!expanded.atoms.length) {
        setError('Parsed CIF but found no atoms to display.')
      }
    } catch (e) {
      setStructure(null)
      setMacroModel(null)
      setLoadedKey(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [])

  // PDB: representation / waters → re-expand the same model.
  useEffect(() => {
    if (!macroModel) return
    const k = `${pdbRep}|${showWaters}`
    if (expandKeyRef.current === k) return
    expandKeyRef.current = k
    setStructure(expandMacro(macroModel, pdbRep, showWaters))
  }, [macroModel, pdbRep, showWaters])

  const ligandSite = useMemo(() => {
    if (!macroModel || !focusLig) return null
    const L = macroModel.ligands.find((l) => l.id === focusLig)
    return L ? analyzeLigand(macroModel, L) : null
  }, [macroModel, focusLig])


  /** Current view carried into a newly opened structure (op/show reset as before). */
  const carryView = useCallback(
    () => serializeViewQuery({ ...VIEW_DEFAULTS, view: placementMode, color: colorMode }),
    [placementMode, colorMode],
  )

  /** Navigate (push) to a structure route; the route effect performs the load. */
  const openTarget = useCallback(
    (t: CifTarget, state?: unknown) => {
      setRouteNote(null)
      navigate({ pathname: cifPath(t), search: carryView() }, { state })
    },
    [navigate, carryView],
  )

  const openFile = useCallback(
    (name: string, text: string) => {
      const clean = name.replace(/[\/]/g, '_') || 'upload.cif'
      storeFile(safeSession(), clean, text)
      const t: CifTarget = { kind: 'file', name: clean }
      if (targetKey(t) === tKey) {
        loadText(text, clean, undefined, { key: tKey, view: { ...VIEW_DEFAULTS, view: placementMode, color: colorMode } })
        navigate({ pathname: cifPath(t), search: carryView() }, { replace: true, state: { cifText: text } })
        return
      }
      openTarget(t, { cifText: text })
    },
    [openTarget, tKey, loadText, navigate, carryView, placementMode, colorMode],
  )

  const onFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      e.target.value = ''
      try {
        const { name, text } = await readStructureFile(file)
        openFile(name, text)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [openFile],
  )

  const fetchSample = useCallback(async (name: string, route: { key: string; view: CifViewQuery }) => {
    const sample = SAMPLES[name]
    setBusy(true)
    setError(null)
    try {
      if (!sample) throw new Error(`Unknown sample "${name}".`)
      const res = await fetch(SAMPLE_BASE + sample.file)
      if (!res.ok) throw new Error(`Could not load sample (${res.status})`)
      const text = await res.text()
      loadText(text, sample.label, undefined, route)
    } catch (e) {
      setStructure(null)
      setLoadedKey(null)
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }, [loadText])

  const loadSample = useCallback(() => {
    openTarget({ kind: 'sample', name: 'acetic_p21c' })
  }, [openTarget])

  const loadByCode = useCallback(async (override?: string, route?: { key: string; view: CifViewQuery }) => {
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
      if (!route) {
        // user action → give the structure its own URL; route effect loads it
        const t: CifTarget = { kind: 'cod', id: parsed.code.id }
        if (targetKey(t) !== tKey) {
          openTarget(t)
          return
        }
        route = { key: targetKey(t), view: parseViewQuery(location.search) }
      }
      const remote = await fetchRemoteCif(parsed.code.id)
      loadText(
        remote.text,
        `${remote.label} · ${sourceBadgeLabel(remote.source)}`,
        {
          hint: `${remote.sourceNote} Source: ${sourceBadgeLabel(remote.source)}.`,
          link: `https://www.crystallography.net/cod/${parsed.code.id}.cif`,
        },
        route,
      )
    } catch (e) {
      if (route) {
        setStructure(null)
        setLoadedKey(null)
      }
      if (e instanceof CsdManualError) {
        setRemoteLink(e.accessUrl)
        setRemoteHint(e.message)
        setPasteOpen(true)
        setError(e.message)
      } else if (e instanceof CorsBlockedError) {
        setRemoteLink(e.codUrl)
        setRemoteHint(
          `Fail · COD ${e.id}: browser blocked crystallography.net (no CORS). Use a cached teaching chip, paste/upload the CIF, or deploy the included Cloudflare Worker (scripts/cod-cors-worker.js) and rebuild with VITE_COD_PROXY.`,
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
  }, [codeInput, loadText, tKey, openTarget, location.search])

  const loadByPdb = useCallback(async (id: string, route?: { key: string; view: CifViewQuery }) => {
    const t: CifTarget = { kind: 'pdb', id: id.trim().toLowerCase() }
    if (!route) {
      if (!/^[0-9][a-z0-9]{3}$/i.test(id.trim())) {
        setError(`“${id}” is not a PDB ID — use 4 characters, e.g. 1CRN.`)
        return
      }
      if (targetKey(t) !== tKey) {
        openTarget(t)
        return
      }
      route = { key: targetKey(t), view: parseViewQuery(location.search) }
    }
    setBusy(true)
    setError(null)
    try {
      const text = await fetchPdbCif(t.id)
      loadText(text, `PDB ${t.id.toUpperCase()} · RCSB`, {
        hint: `PDB ${t.id.toUpperCase()} mmCIF from RCSB (files.rcsb.org).`,
        link: rcsbEntryUrl(t.id),
      }, route)
    } catch (e) {
      setStructure(null)
      setMacroModel(null)
      setLoadedKey(null)
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }, [loadText, tKey, openTarget, location.search])

  // Legacy deep link: /cif?cod=1100303 → /cif/cod/1100303
  useEffect(() => {
    if (target.kind !== 'none') return
    const q = new URLSearchParams(location.search)
    const id = (q.get('cod') ?? q.get('id') ?? '').replace(/\D/g, '')
    if (!/^\d{5,10}$/.test(id)) return
    navigate(cifPath({ kind: 'cod', id }), { replace: true })
  }, [target.kind, location.search, navigate])

  // Route → structure: load on direct visit / refresh / Back / Forward.
  const loadedKeyRef = useRef(loadedKey)
  loadedKeyRef.current = loadedKey
  const routeState = location.state as { cifText?: string } | null
  useEffect(() => {
    if (loadedKeyRef.current === tKey) return
    const view = parseViewQuery(location.search)
    const route = { key: tKey, view }
    if (target.kind === 'none') {
      if (new URLSearchParams(location.search).get('cod')) return
      setStructure(null)
      setFileName(null)
      setSourceText(null)
      setError(null)
      setRemoteHint(null)
      setRemoteLink(null)
      setLoadedKey('none')
      return
    }
    if (target.kind === 'invalid') {
      setStructure(null)
      setLoadedKey(null)
      setError(`Unrecognised Lattice Lab address “/cif/${target.raw}”.`)
      return
    }
    if (target.kind === 'pdb') {
      setPdbInput(target.id.toUpperCase())
      void loadByPdb(target.id, route)
    } else if (target.kind === 'cod') {
      setCodeInput(target.id)
      void loadByCode(target.id, route)
    } else if (target.kind === 'sample') {
      void fetchSample(target.name, route)
    } else {
      const text = routeState?.cifText ?? loadStoredFile(safeSession(), target.name)
      if (text == null) {
        setRouteNote(
          `“${target.name}” was a local upload and is no longer available in this tab — please upload it again.`,
        )
        setLoadedKey(null)
        navigate('/cif', { replace: true })
        return
      }
      loadText(text, target.name, undefined, route)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tKey])

  // View state → query string (replace; defaults omitted).
  useEffect(() => {
    if (!structure || loadedKey !== tKey || target.kind === 'none') return
    const search = serializeViewQuery({
      op: selectedOp,
      view: placementMode,
      show: visibility,
      color: colorMode,
      rep: macroModel ? pdbRep : undefined,
      lig: macroModel ? focusLig : null,
      diagram: diagramOpen,
      analysis: macroModel ? analysisTab : null,
    })
    if (search !== location.search) {
      navigate({ pathname: location.pathname, search }, { replace: true, state: location.state })
    }
  }, [structure, loadedKey, tKey, target.kind, selectedOp, placementMode, visibility, colorMode, macroModel, pdbRep, focusLig, diagramOpen, analysisTab, location.search, location.pathname, location.state, navigate])

  const loadPaste = useCallback(() => {
    if (!pasteText.trim()) {
      setError('Paste CIF text first.')
      return
    }
    const guess = parseStructureCode(codeInput)
    const name = guess.ok ? `${guess.code.display}-pasted.cif` : 'pasted.cif'
    openFile(pastedName(pasteText, name), pasteText)
  }, [pasteText, codeInput, openFile])

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
    <div className={`app layout-demo cif-explorer${structure ? ' has-structure' : ''}`}>
      <aside className="panel" id="demo-sidebar">
        <header className="panel-header">
          <div className="panel-nav-row">
            <Link to="/" className="back-link">
              ← All space groups
            </Link>
            <Link to="/sg/14" className="back-link cif-jump">
              Try P21/c
            </Link>
          </div>
          {breadcrumbLabel(target) ? (
            <nav className="cif-breadcrumb" aria-label="Breadcrumb">
              <Link to="/cif">Lattice Lab</Link>
              <span aria-hidden="true"> › </span>
              <span aria-current="page">{breadcrumbLabel(target)}</span>
            </nav>
          ) : (
            <p className="eyebrow">Application</p>
          )}
          <h1 className="lattice-lab-title">
            <LatticeLabLogo size={30} className="lattice-lab-logo" />
            Lattice Lab
          </h1>
          {routeNote && (
            <p className="cif-route-note" role="status">
              {routeNote}
            </p>
          )}
          {error && target.kind !== 'none' && !structure && !busy && (
            <p className="cif-route-error" role="alert">
              Could not open {breadcrumbLabel(target) ?? 'this address'}.{' '}
              <Link to="/cif">← Back to Lattice Lab start</Link>
            </p>
          )}
          <p className="sr-only" id="cif-status-live" aria-live="polite" aria-atomic="true">
            {error
              ? `Error: ${error}`
              : structure
                ? `Loaded ${fileName ?? 'structure'}: space group ${
                    structure.spaceGroupNumber ??
                    structure.spaceGroupName ??
                    'unknown'
                  }, ${structure.moleculeCount} molecules, ${
                    structure.operators.length
                  } operators.`
                : 'No structure loaded yet.'}
          </p>
          <p className="blurb">
            Load a COD code or PDB ID, paste/upload a CSD or COD CIF (or PDB mmCIF), and explore intact
            molecules colored by the symmetry operator that generated each
            copy. Lattice a/b/c (and angles) label the unit-cell box.
          </p>
        </header>

        {structure && macroModel && !macroModel.crystal && (
          <div className="cif-pdb-noncrystal" role="status" data-testid="pdb-noncrystal">
            <strong>No crystal lattice.</strong> {macroModel.pdbId ? `${macroModel.pdbId.toUpperCase()}: ` : ''}
            {macroModel.nonCrystalReason ?? 'non-crystallographic entry'}. There is no unit cell or space group, so the
            Lattice Lab shows the deposited model (model 1) only. Try an X-ray entry such as 1CRN or 4HHB.
          </div>
        )}

        {structure && (
          <PhoneSection phone={phone} title="Structure & operators">
          <CifStructurePanel
            structure={structure}
            selectedOp={selectedOp}
            onSelectOp={setSelectedOp}
            moleculesForOp={moleculesForOp}
            atomCountForOp={atomCountForOp}
            onOpKeyDown={onOpKeyDown}
            elementDemo={elementDemo}
            selected={selected}
            onLoadCodId={(id) => {
              setCodeInput(id)
              openTarget({ kind: 'cod', id })
            }}
            showXray={false}
          />
          </PhoneSection>
        )}

        {structure && macroModel && (
          <PhoneSection phone={phone} title="Ligands & interactions">
            <PdbLigandPanel
              model={macroModel}
              focusId={focusLig}
              onFocus={setFocusLig}
              site={ligandSite}
              types={interTypes}
              highlightRes={highlightRes}
              onHighlightRes={setHighlightRes}
              onCenterRes={setCenterRes}
              onToggleType={(t) =>
                setInterTypes((s) => {
                  const n = new Set(s)
                  if (n.has(t)) n.delete(t)
                  else n.add(t)
                  return n
                })
              }
            />
          </PhoneSection>
        )}

        {structure && macroModel && (
          <section className="seed-box cif-analysis-launch" aria-label="Structure analysis">
            <h2>Structure analysis</h2>
            <p className="muted">Ramachandran, side-chain χ, nucleic-acid torsions, sugar pucker and 3DNA-style base-pair / step parameters, with plots and CSV export.</p>
            <button type="button" className="btn" data-testid="analysis-open" aria-pressed={analysisTab != null}
              onClick={() => setAnalysisTab((t) => (t ? null : macroModel.extras.some((e) => e.ca) ? 'rama' : 'na'))}>
              {analysisTab ? 'Close structure analysis' : 'Open structure analysis'}
            </button>
          </section>
        )}

        {structure && (
          <PhoneSection phone={phone} title="X-ray · powder (PXRD)">
            <CifXrayPanel
              structure={structure}
              onLoadCodId={(id) => {
                setCodeInput(id)
                openTarget({ kind: 'cod', id })
              }}
            />
          </PhoneSection>
        )}

        <PhoneSection phone={phone && structure != null} title="Load another CIF (COD / CSD / upload)">
        <CifLoadPanel
          busy={busy}
          codeInput={codeInput}
          onCodeInputChange={setCodeInput}
          onLoadByCode={() => void loadByCode()}
          onLoadCodId={(id) => {
            setCodeInput(id)
            openTarget({ kind: 'cod', id })
          }}
          pdbInput={pdbInput}
          onPdbInputChange={setPdbInput}
          onLoadPdb={(id) => {
            setPdbInput(id.toUpperCase())
            void loadByPdb(id)
          }}
          onFile={onFile}
          onLoadSample={loadSample}
          pasteOpen={pasteOpen}
          onTogglePaste={() => setPasteOpen((o) => !o)}
          pasteText={pasteText}
          onPasteTextChange={setPasteText}
          onLoadPaste={loadPaste}
          remoteHint={remoteHint}
          remoteLink={remoteLink}
          fileName={fileName}
          error={error}
          structureLoaded={structure != null}
        />
        </PhoneSection>
      </aside>

      <CifViewport
        structure={structure}
        sourceText={sourceText}
        sourceName={fileName}
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
        hbondMode={hbondMode}
        onHBondModeChange={setHBondMode}
        busy={busy}
        pdbRep={pdbRep}
        onPdbRepChange={setPdbRep}
        showWaters={showWaters}
        onShowWatersChange={setShowWaters}
        ligandSite={ligandSite}
        interactionTypes={interTypes}
        onExitFocus={() => setFocusLig(null)}
        diagramOpen={diagramOpen}
        onDiagramOpenChange={setDiagramOpen}
        highlightRes={highlightRes}
        onHighlightRes={setHighlightRes}
        centerRes={centerRes}
        onCenterRes={setCenterRes}
        analysisFocus={analysisFocus}
        overlayTraces={macroModel ? overlayTraces : null}
        onPinnedResidue={setPinnedRes}
        sequenceSlot={structure && macroModel ? (
          <SequenceStrip
            entries={[{ key: 'active', label: macroModel.pdbId?.toUpperCase() ?? fileName ?? 'structure', model: macroModel }, ...compareSet]}
            focusKey={analysisFocus?.key ?? pinnedRes}
            onFocus={setAnalysisFocus}
            onAddPdb={(id) => void addComparePdb(id)}
            onAddFile={(e) => void addCompareFile(e)}
            onRemove={(k) => setCompareSet((s) => s.filter((e) => e.key !== k))}
            onOverlay={setOverlayTraces}
            busy={compareBusy}
            error={compareError}
          />
        ) : null}
      />
      {structure && macroModel && analysisTab && (
        <Suspense fallback={<aside className="cif-analysis-drawer" role="status"><p>Loading analysis…</p></aside>}>
          <StructureAnalysisPanel
            model={macroModel}
            tab={analysisTab}
            onTab={setAnalysisTab}
            onClose={() => { setAnalysisTab(null); setAnalysisFocus(null) }}
            focus={analysisFocus}
            onFocus={setAnalysisFocus}
            pocketKeys={ligandSite ? ligandSite.pocket.filter((p) => !p.symCode).map((p) => `${p.chain}|${p.seq}|${p.comp}`) : null}
            pocketLabel={ligandSite ? ligandSite.ligand.label : null}
          />
        </Suspense>
      )}
    </div>
  )
}

/** ≤ 640 px: phone layout (viewer first, side content collapsed into accordions). */
function usePhone(): boolean {
  const q = '(max-width: 640px)'
  const [m, setM] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(q)
    if (!mq) return
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return m
}

/** On phones wrap a sidebar section in a collapsed accordion; elsewhere render as-is. */
function PhoneSection({ phone, title, children }: { phone: boolean; title: string; children: ReactNode }) {
  if (!phone) return <>{children}</>
  return (
    <details className="cif-phone-acc">
      <summary>{title}</summary>
      {children}
    </details>
  )
}
