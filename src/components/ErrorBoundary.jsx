import { Component } from 'react'
import { t } from '../theme/tokens'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    const isDev = import.meta.env.DEV
    if (isDev) {
      console.error('ErrorBoundary caught:', error, info.componentStack)
    } else {
      console.error(`[ErrorBoundary] error:${error?.name ?? 'unknown'}`)
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={s.wrapper}>
          <div style={s.titulo}>Algo salió mal</div>
          <div style={s.msg}>Ocurrió un error inesperado. Por favor recarga la página.</div>
          <button style={s.btn} onClick={() => { this.setState({ error: null }); window.location.reload() }}>
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const s = {
  wrapper: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: t.bgBase, padding: 24 },
  titulo:  { color: t.fault || '#ef4444', fontSize: 20, fontWeight: 700 },
  msg:     { color: t.textSecondary, fontSize: 14, maxWidth: 400, textAlign: 'center' },
  btn:     { marginTop: 8, padding: '10px 24px', background: t.brand, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600 },
}
