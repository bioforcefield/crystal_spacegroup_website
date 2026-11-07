import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; onReload?: () => void }
type State = { error: Error | null }

/** Last-resort boundary: an uncaught render error shows a plain message with a Reload
 *  control instead of React unmounting the whole page to blank. */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Page failed to render', error, info.componentStack)
  }

  private reload = () => {
    if (this.props.onReload) this.props.onReload()
    else window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="route-fallback app-error" role="alert">
        <p>Something went wrong loading this page.</p>
        <p className="app-error-detail">{error.message || 'Unknown error'}</p>
        <button type="button" onClick={this.reload}>
          Reload
        </button>
      </div>
    )
  }
}
