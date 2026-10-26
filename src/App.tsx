import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, Link, NavLink } from 'react-router-dom'
import IndexPage from './pages/IndexPage'
import PbcaPage from './pages/PbcaPage'

function SiteChrome({ children, variant }: { children: ReactNode; variant: 'index' | 'demo' }) {
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
          <a href="/#explore">Explore</a>
          <a href="/#guide">Guide</a>
          <NavLink to="/sg/61">Pbca</NavLink>
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
  return (
    <SiteChrome variant="demo">
      <PbcaPage />
    </SiteChrome>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexRoute />} />
        <Route path="/sg/61" element={<DemoRoute />} />
        <Route path="/sg/pbca" element={<DemoRoute />} />
        <Route path="/pbca" element={<Navigate to="/sg/61" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
