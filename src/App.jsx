import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { t } from './theme/tokens'
import Login from './pages/Login'
import MainLayout from './components/layout/MainLayout'
import MapaPage from './pages/MapaPage'
import CentrosPage from './pages/CentrosPage'
import DespachosPage from './pages/DespachosPage'
import OperadoresPage from './pages/OperadoresPage'

function PantallaCarga() {
  return (
    <div style={carga.wrapper}>
      <div style={carga.logoWrap}><img src="/logo.png" alt="GL" style={carga.logo} /></div>
      <div style={carga.titulo}>GL Robótica Submarina</div>
      <div style={carga.sub}>Cargando…</div>
    </div>
  )
}

const carga = {
  wrapper:  { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: t.bgBase },
  logoWrap: { width: 110, height: 110, borderRadius: '50%', background: '#fff', padding: 8, boxShadow: t.shadowLg, animation: 'pulse 1.6s ease-in-out infinite' },
  logo:     { width: '100%', height: '100%', objectFit: 'contain' },
  titulo:   { color: t.textPrimary, fontSize: t.textLg, fontWeight: 700, letterSpacing: '0.03em' },
  sub:      { color: t.brandSoft, fontSize: t.textSm },
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PantallaCarga />
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PantallaCarga />
  return user ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route index element={<MapaPage />} />
          <Route path="centros" element={<CentrosPage />} />
          <Route path="despachos" element={<DespachosPage />} />
          <Route path="operadores" element={<OperadoresPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
