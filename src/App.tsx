import { Suspense, lazy, type ReactNode } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
  NavLink,
  useLocation,
  useParams,
} from 'react-router-dom'
import IndexPage from './pages/IndexPage'
import SiteCopyright from './components/SiteCopyright'
import { getDemo } from './data/registry'

const SpaceGroupPage = lazy(() => import('./pages/SpaceGroupPage'))
const CifExplorerPage = lazy(() => import('./pages/CifExplorerPage'))
const PublicationsPage = lazy(() => import('./pages/PublicationsPage'))
const MorphologyPage = lazy(() => import('./pages/MorphologyPage'))
const KineticsPage = lazy(() => import('./pages/KineticsPage'))

const SECTION_NAV = [
  { id: 'explore', label: 'Explore' },
  { id: 'index', label: 'Index' },
  { id: 'primer', label: 'Symmetry' },
  { id: 'guide', label: 'How to use' },
  { id: 'stats', label: 'Statistics' },
] as const

const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '')

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  const hashUrl = `${ROUTER_BASENAME}/#${id}`
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.replaceState(null, '', hashUrl)
    return
  }
  window.location.assign(hashUrl)
}

function RouteFallback() {
  return (
    <div className="route-fallback" role="status">
      Loading…
    </div>
  )
}

function SiteChrome({
  children,
  variant,
}: {
  children: ReactNode
  variant: 'index' | 'demo'
}) {
  const location = useLocation()
  const onIndex = location.pathname === '/'

  if (variant === 'demo') {
    return (
      <div className="demo-shell">
        <a className="skip-link" href="#demo-main">
          Skip to 3D view
        </a>
        <a className="skip-link" href="#demo-sidebar">
          Skip to operator list
        </a>
        <header className="demo-topbar" aria-label="Demo navigation">
          <Link to="/" className="site-brand demo-brand">
            <span className="brand-mark" aria-hidden />
            <span className="brand-text">Crystal Space Groups</span>
          </Link>
          <nav className="demo-nav" aria-label="Primary">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/cif" className="nav-demo">
              CIF map
            </NavLink>
            <NavLink to="/pubs" className="nav-demo">
              Pubs
            </NavLink>
            <NavLink to="/morphology" className="nav-demo">
              Morph
            </NavLink>
            <NavLink to="/kinetics" className="nav-demo">
              Kinetics
            </NavLink>
            <NavLink to="/sg/14" className="nav-demo nav-demo-hide-xs">
              P21/c
            </NavLink>
            <NavLink to="/sg/227" className="nav-demo nav-demo-hide-xs">
              Fd-3m
            </NavLink>
          </nav>
        </header>
        {children}
      </div>
    )
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#explore">
        Skip to content
      </a>
      <header className="site-topbar">
        <Link to="/" className="site-brand">
          <span className="brand-mark" aria-hidden />
          Crystal Space Groups
        </Link>
        <nav className="site-nav" aria-label="Primary">
          <NavLink to="/" end>
            Home
          </NavLink>
          {SECTION_NAV.map((s) =>
            onIndex ? (
              <button
                key={s.id}
                type="button"
                className="nav-jump"
                onClick={() => scrollToSection(s.id)}
              >
                {s.label}
              </button>
            ) : (
              <Link key={s.id} to={{ pathname: '/', hash: s.id }}>
                {s.label}
              </Link>
            ),
          )}
          <NavLink to="/sg/14" className="nav-demo">
            P21/c
          </NavLink>
          <NavLink to="/sg/2" className="nav-demo">
            P-1
          </NavLink>
          <NavLink to="/sg/15" className="nav-demo">
            C2/c
          </NavLink>
          <NavLink to="/sg/61" className="nav-demo">
            Pbca
          </NavLink>
          <NavLink to="/sg/19" className="nav-demo">
            P212121
          </NavLink>
          <NavLink to="/cif" className="nav-demo">
            CIF map
          </NavLink>
          <NavLink to="/pubs" className="nav-demo">
            Pubs
          </NavLink>
          <NavLink to="/morphology" className="nav-demo">
            Morph
          </NavLink>
          <NavLink to="/kinetics" className="nav-demo">
            Kinetics
          </NavLink>
        </nav>
      </header>
      {children}
      <SiteCopyright />
    </div>
  )
}

function IndexRoute() {
  return (
    <SiteChrome variant="index">
      <IndexPage />
    </SiteChrome>
  )
}

function DemoRoute() {
  const { id } = useParams<{ id: string }>()
  const demo = id ? getDemo(id) : undefined
  if (!demo) {
    return <Navigate to="/" replace />
  }
  return (
    <SiteChrome variant="demo">
      <Suspense fallback={<RouteFallback />}>
        <SpaceGroupPage demo={demo} />
      </Suspense>
    </SiteChrome>
  )
}

function CifRoute() {
  return (
    <SiteChrome variant="demo">
      <Suspense fallback={<RouteFallback />}>
        <CifExplorerPage />
      </Suspense>
    </SiteChrome>
  )
}

function PubsRoute() {
  return (
    <SiteChrome variant="index">
      <Suspense fallback={<RouteFallback />}>
        <PublicationsPage />
      </Suspense>
    </SiteChrome>
  )
}


function MorphologyRoute() {
  return (
    <SiteChrome variant="index">
      <Suspense fallback={<RouteFallback />}>
        <MorphologyPage />
      </Suspense>
    </SiteChrome>
  )
}

function KineticsRoute() {
  return (
    <SiteChrome variant="index">
      <Suspense fallback={<RouteFallback />}>
        <KineticsPage />
      </Suspense>
    </SiteChrome>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME || undefined}>
      <Routes>
        <Route path="/" element={<IndexRoute />} />
        <Route path="/sg/:id" element={<DemoRoute />} />
        <Route path="/cif" element={<CifRoute />} />
        <Route path="/pubs" element={<PubsRoute />} />
        <Route path="/morphology" element={<MorphologyRoute />} />
        <Route path="/morph" element={<Navigate to="/morphology" replace />} />
        <Route path="/kinetics" element={<KineticsRoute />} />
        <Route path="/pbca" element={<Navigate to="/sg/61" replace />} />
        <Route path="/c2c" element={<Navigate to="/sg/15" replace />} />
        <Route path="/p21c" element={<Navigate to="/sg/14" replace />} />
        <Route path="/pbar1" element={<Navigate to="/sg/2" replace />} />
        <Route path="/p-1" element={<Navigate to="/sg/2" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
