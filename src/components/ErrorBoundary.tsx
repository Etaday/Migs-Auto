import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Catches a crash (or a page file that failed to load, which happens when the
 * site is updated while a visitor has it open) and offers a reload instead of
 * leaving a blank screen.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="legal-page" role="alert">
        <div className="legal-page__card">
          <h1 className="legal-page__title">Something went wrong.</h1>
          <div className="legal-page__body">
            <p>The page did not load properly. This usually fixes itself with a reload.</p>
            <p><button type="button" className="legal-page__back" onClick={() => window.location.reload()}>Reload the page</button></p>
          </div>
        </div>
      </main>
    )
  }
}
