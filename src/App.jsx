import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { t } from './theme/tokens'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import LoginOlimpo from './pages/LoginOlimpo'
import MainLayout from './components/layout/MainLayout'
import MapaPage from './pages/MapaPage'
import CentrosPage from './pages/CentrosPage'
import DespachosPage from './pages/DespachosPage'
import OperadoresPage from './pages/OperadoresPage'
import BitacorasPage  from './pages/BitacorasPage'
import TurnosPage     from './pages/TurnosPage'
import BodegaVirtualPage from './pages/BodegaVirtualPage'
import BodegaAdminPage   from './pages/BodegaAdminPage'
import ReportesPage      from './pages/ReportesPage'
import OlimpoPage        from './pages/OlimpoPage'
import TerminosPage      from './pages/TerminosPage'
import PrivacidadPage    from './pages/PrivacidadPage'

const isOlimpoHost = window.location.hostname === 'olimpo.hyperionx.tech'
  || window.location.search.includes('olimpo=1')

function PantallaCarga({ error, onRelogin }) {
  return (
    <div style={carga.wrapper}>
      <div style={carga.logoWrap}><img src="/hyperionx-symbol.png" alt="RovSystem by HyperionX" style={carga.logo} onError={(e) => { e.currentTarget.src = '/logo.png' }} /></div>
      <div style={carga.titulo}>{isOlimpoHost ? 'Olimpo' : 'RovSystem'}</div>
      {error
        ? <div style={carga.error}>{error}<br /><button style={carga.btnRelogin} onClick={onRelogin}>Cerrar sesión</button></div>
        : <div style={carga.sub}>Powered by HyperionX</div>
      }
    </div>
  )
}

const carga = {
  wrapper:    { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: isOlimpoHost ? '#0b0f18' : t.bgBase },
  logoWrap:   { width: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.6s ease-in-out infinite' },
  logo:       { width: '100%', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' },
  titulo:     { color: isOlimpoHost ? '#e8eaf0' : t.textPrimary, fontSize: t.textLg, fontWeight: 700, letterSpacing: '0.03em' },
  sub:        { color: isOlimpoHost ? 'rgba(232,234,240,0.45)' : t.brandSoft, fontSize: t.textSm },
  error:      { color: '#ef4444', fontSize: 13, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 },
  btnRelogin: { marginTop: 10, padding: '8px 20px', background: isOlimpoHost ? '#cc1020' : t.brand, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
}

function NoAcceso({ signOut }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#0b0f18' }}>
      <img src="/hyperionx-symbol.png" alt="HyperionX" style={{ width: 72, opacity: 0.9 }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
      <div style={{ color: '#e8eaf0', fontSize: 18, fontWeight: 700, letterSpacing: '0.04em' }}>Acceso no autorizado</div>
      <div style={{ color: 'rgba(232,234,240,0.55)', fontSize: 13, textAlign: 'center', maxWidth: 300 }}>
        Tu cuenta no tiene acceso al panel Olimpo.<br />Usa una cuenta con rol owner o ventas.
      </div>
      <button onClick={signOut} style={{ marginTop: 8, padding: '8px 24px', background: '#cc1020', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
        Cerrar sesión
      </button>
    </div>
  )
}

function PrivateRoute({ children, user, role, loading, authError, signOut, aceptoTerminos }) {
  if (loading) return <PantallaCarga />
  if (authError) return <PantallaCarga error={authError} onRelogin={signOut} />
  if (!user) return <Navigate to="/login" replace />
  if (!role) return <PantallaCarga error="No se pudo verificar tu rol. Contacta al administrador." onRelogin={signOut} />
  if (!aceptoTerminos && role !== 'owner' && role !== 'ventas') return <Navigate to="/terminos" replace />
  return children
}

function PublicRoute({ children, user, role, loading }) {
  if (loading) return <PantallaCarga />
  if (!user) return children
  // En olimpo.hyperionx.tech esperar a que el rol llegue de Firestore antes de redirigir
  // para que LoginOlimpo pueda detectar roles incorrectos antes de desaparecer
  if (isOlimpoHost && role === null) return <PantallaCarga />
  return <Navigate to={isOlimpoHost ? '/olimpo' : '/'} replace />
}

function RoleRoute({ roles, role, loading, children, signOut }) {
  if (loading) return <PantallaCarga />
  if (roles.includes(role)) return children
  // En subdominio olimpo no redirigimos a / (causaría loop), mostramos error
  if (isOlimpoHost) return <NoAcceso signOut={signOut} />
  return <Navigate to="/" replace />
}

function AnimatedRoutes() {
  const { user, role, loading, authError, signOut, aceptoTerminos, aceptarTerminos } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute user={user} role={role} loading={loading}>
          {isOlimpoHost ? <LoginOlimpo /> : <Login />}
        </PublicRoute>
      } />
      <Route path="/privacidad" element={<PrivacidadPage />} />
      <Route path="/terminos"   element={
        !loading && user && !aceptoTerminos && role !== 'owner' && role !== 'ventas'
          ? <TerminosPage onAceptar={aceptarTerminos} />
          : <Navigate to="/" replace />
      } />

      {/* Panel maestro — layout propio, sin sidebar GL */}
      <Route path="/olimpo" element={
        <PrivateRoute user={user} role={role} loading={loading} authError={authError} signOut={signOut} aceptoTerminos={aceptoTerminos}>
          <RoleRoute roles={['owner', 'ventas']} role={role} loading={loading} signOut={signOut}><OlimpoPage /></RoleRoute>
        </PrivateRoute>
      } />

      <Route path="/" element={<PrivateRoute user={user} role={role} loading={loading} authError={authError} signOut={signOut} aceptoTerminos={aceptoTerminos}><MainLayout /></PrivateRoute>}>
        <Route index element={
          (role === 'owner' || role === 'ventas' || isOlimpoHost)
            ? <Navigate to="/olimpo" replace />
            : <MapaPage />
        } />
        <Route path="centros"    element={<RoleRoute roles={['admin', 'supervisor']} role={role} loading={loading}><CentrosPage /></RoleRoute>} />
        <Route path="despachos"  element={<DespachosPage />} />
        <Route path="operadores" element={<RoleRoute roles={['admin', 'supervisor']} role={role} loading={loading}><OperadoresPage /></RoleRoute>} />
        <Route path="bitacoras"       element={<BitacorasPage />} />
        <Route path="turnos"          element={<TurnosPage />} />
        <Route path="bodega-virtual"  element={<RoleRoute roles={['supervisor']} role={role} loading={loading}><BodegaVirtualPage /></RoleRoute>} />
        <Route path="bodega-admin"    element={<RoleRoute roles={['admin']}      role={role} loading={loading}><BodegaAdminPage   /></RoleRoute>} />
        <Route path="reportes"        element={<RoleRoute roles={['admin', 'supervisor']} role={role} loading={loading}><ReportesPage /></RoleRoute>} />
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
