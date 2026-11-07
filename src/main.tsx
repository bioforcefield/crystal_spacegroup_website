import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initMotionPrefs } from './hooks/motionPrefs'
import AppErrorBoundary from './components/AppErrorBoundary'
import { installChunkReload } from './lib/chunkReload'

initMotionPrefs()
installChunkReload()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
