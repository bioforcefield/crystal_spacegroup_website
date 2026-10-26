import type { ReactNode } from 'react'
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
import SpaceGroupPage from './pages/SpaceGroupPage'
import { getDemo } from './data/registry'

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
    return <>{children}</>
  }

  return (
    <div className="site-shell">
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
          <NavLink to="/sg/15" className="nav-demo">
            C2/c
          </NavLink>
          <NavLink to="/sg/61" className="nav-demo">
            Pbca
          </NavLink>
        </nav>
      </header>
      {children}
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
      <SpaceGroupPage demo={demo} />
    </SiteChrome>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME || undefined}>
      <Routes>
        <Route path="/" element={<IndexRoute />} />
        <Route path="/sg/:id" element={<DemoRoute />} />
        <Route path="/pbca" element={<Navigate to="/sg/61" replace />} />
        <Route path="/c2c" element={<Navigate to="/sg/15" replace />} />
        <Route path="/p21c" element={<Navigate to="/sg/14" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
