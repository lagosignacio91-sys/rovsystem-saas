import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { t } from './theme/tokens'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import MainLayout from './components/layout/MainLayout'
import MapaPage from './pages/MapaPage'
import CentrosPage from './pages/CentrosPage'
import DespachosPage from './pages/DespachosPage'
import OperadoresPage from './pages/OperadoresPage'
import BitacorasPage  from './pages/BitacorasPage'
import TurnosPage     from './pages/TurnosPage'

function PantallaCarga({ error, onRelogin }) {
  return (
    <div style={carga.wrapper}>
      <div style={carga.logoWrap}><img src="/logo.png" alt="RovSystem" style={carga.logo} /></div>
      <div style={carga.titulo}>RovSystem</div>
      {error
        ? <div style={carga.error}>{error}<br /><button style={carga.btnRelogin} onClick={onRelogin}>Cerrar sesión</button></div>
        : <div style={carga.sub}>Powered by HyperionX</div>
      }
    </div>
  )
}

const carga = {
  wrapper:    { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: t.bgBase },
  logoWrap:   { width: 110, height: 110, borderRadius: '50%', background: '#fff', padding: 8, boxShadow: t.shadowLg, animation: 'pulse 1.6s ease-in-out infinite' },
  logo:       { width: '100%', height: '100%', objectFit: 'contain' },
  titulo:     { color: t.textPrimary, fontSize: t.textLg, fontWeight: 700, letterSpacing: '0.03em' },
  sub:        { color: t.brandSoft, fontSize: t.textSm },
  error:      { color: '#ef4444', fontSize: 13, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 },
  btnRelogin: { marginTop: 10, padding: '8px 20px', background: t.brand, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
}

function PrivateRoute({ children }) {
  const { user, role, loading, authError, signOut } = useAuth()
  if (loading) return <PantallaCarga />
  if (authError) return <PantallaCarga error={authError} onRelogin={signOut} />
  if (!user) return <Navigate to="/login" replace />
  if (!role) return <PantallaCarga error="No se pudo verificar tu rol. Contacta al administrador." onRelogin={signOut} />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PantallaCarga />
  return user ? <Navigate to="/" replace /> : children
}

function AnimatedRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<MapaPage />} />
        <Route path="centros"    element={<CentrosPage />} />
        <Route path="despachos"  element={<DespachosPage />} />
        <Route path="operadores" element={<OperadoresPage />} />
        <Route path="bitacoras"  element={<BitacorasPage />} />
        <Route path="turnos"     element={<TurnosPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
