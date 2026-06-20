import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useMemo, useEffect } from 'react'
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore'
import { db } from './lib/firebase'
import LoginDemo    from './pages/LoginDemo'
import MapaDemo     from './pages/MapaDemo'
import CentrosDemo  from './pages/CentrosDemo'
import DespachosDemo from './pages/DespachosDemo'
import SidebarDemo  from './components/SidebarDemo'
import CTAFloat     from './components/CTAFloat'

function useCliente() {
  const loc = useLocation()
  return useMemo(() => {
    const params = new URLSearchParams(loc.search)
    return params.get('cliente') || ''
  }, [loc.search])
}

function useTracking() {
  const loc = useLocation()
  useEffect(() => {
    const slug = new URLSearchParams(loc.search).get('ref')
    if (!slug) return
    updateDoc(doc(db, 'hxProspectos', slug), {
      visitas: increment(1),
      ultimaVisita: serverTimestamp(),
    }).catch(() => {})
  // Solo trackear al cargar la demo (mount inicial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

function AppLayout() {
  const cliente = useCliente()
  const loc     = useLocation()
  const isLogin = loc.pathname === '/'
  useTracking()

  if (isLogin) return <LoginDemo cliente={cliente} />

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <SidebarDemo cliente={cliente} />
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/mapa"      element={<MapaDemo />} />
          <Route path="/centros"   element={<CentrosDemo />} />
          <Route path="/despachos" element={<DespachosDemo />} />
          <Route path="*"          element={<Navigate to="/mapa" replace />} />
        </Routes>
      </main>
      <CTAFloat />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
