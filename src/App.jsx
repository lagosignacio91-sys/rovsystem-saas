import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function PantallaCarga() {
  return (
    <div style={cargaStyles.wrapper}>
      <div style={cargaStyles.logoWrapper}>
        <img src="/logo.png" alt="GL Robótica Submarina" style={cargaStyles.logo} />
      </div>
      <div style={cargaStyles.titulo}>GL Robótica Submarina</div>
      <div style={cargaStyles.cargando}>Cargando...</div>
    </div>
  )
}

const cargaStyles = {
  wrapper:     { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' },
  logoWrapper: { width: '120px', height: '120px', borderRadius: '50%', background: '#fff', padding: '8px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', animation: 'pulse 1.6s ease-in-out infinite' },
  logo:        { width: '100%', height: '100%', objectFit: 'contain' },
  titulo:      { color: '#f1f5f9', fontSize: '17px', fontWeight: '700', letterSpacing: '0.05em' },
  cargando:    { color: '#3b82f6', fontSize: '13px' },
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
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}