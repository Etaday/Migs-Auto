import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Keeps one failing dashboard tab from taking the whole page down: shows what
 * broke and lets the tab be retried. Resets itself when `resetKey` changes.
 */
export default class TabBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <section className="adm-panel" role="alert">
        <h2>This section hit a problem</h2>
        <p className="adm-note">{error.message || String(error)}</p>
        <p><button type="button" className="adm-btn" onClick={() => this.setState({ error: null })}>Try again</button></p>
      </section>
    )
  }
}
