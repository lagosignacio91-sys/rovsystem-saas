import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCentros } from '../hooks/useCentros'
import MapView from '../components/map/MapView'
import FormCentro from '../components/map/FormCentro'
import PanelCentro from '../components/ui/PanelCentro'
import SelectorEmpresa from '../components/ui/SelectorEmpresa'

export default function Dashboard() {
  const { user, role, signOut }                                                          = useAuth()
  const { centros, cargando, agregarCentro, eliminarCentro, actualizarCentro, sincronizarEstado } = useCentros()
  const [latlngSeleccionado, setLatlngSeleccionado]                                      = useState(null)
  const [centroActivo, setCentroActivo]                                                  = useState(null)
  const [empresaActiva, setEmpresaActiva]                                                = useState(null)
  const [hora, setHora]                                                                  = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setHora(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const centrosFiltrados = empresaActiva
    ? centros.filter(c => c.empresaId === empresaActiva.id)
    : centros

  const handleMapClick = (latlng) => {
    if (role === 'admin') {
      setCentroActivo(null)
      setLatlngSeleccionado(latlng)
    }
  }

  const handleGuardar = async (datos) => {
    await agregarCentro(datos)
    setLatlngSeleccionado(null)
  }

  const handleCentroClick = (centro) => {
    setLatlngSeleccionado(null)
    setCentroActivo(centro)
  }

  const handleEliminar = async (id) => {
    if (window.confirm('¿Eliminar este centro de trabajo?')) {
      await eliminarCentro(id)
      setCentroActivo(null)
    }
  }

  const handleEstadoCambio = async (id, nuevoEstado) => {
    await actualizarCentro(id, { estado: nuevoEstado })
    if (centroActivo?.id === id) {
      setCentroActivo(c => ({ ...c, estado: nuevoEstado }))
    }
  }

  const handleCambiarEmpresa = (empresa) => {
    setEmpresaActiva(empresa)
    setCentroActivo(null)
  }

  const horaStr  = hora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const fechaStr = hora.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })
  const usuario  = user?.email?.split('@')[0] ?? ''

  const contOK    = centrosFiltrados.filter(c => c.estado === 'OK').length
  const contLow   = centrosFiltrados.filter(c => c.estado === 'LOW_STOCK').length
  const contFalla = centrosFiltrados.filter(c => c.estado === 'EQUIPMENT_FAULT').length
  const contSinOp = centrosFiltrados.filter(c => c.estado === 'NO_OPERATOR').length

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logoWrapper}>
            <img src="/logo.png" alt="GL" style={styles.logo} />
          </div>
          <div>
            <div style={styles.title}>GL Robótica Submarina</div>
            <div style={styles.subtitle}>Región de Aysén · Chile</div>
          </div>
        </div>

        <SelectorEmpresa empresaActiva={empresaActiva} onCambiar={handleCambiarEmpresa} role={role} />

        <div style={styles.userInfo}>
          <div style={styles.relojBox}>
            <div style={styles.horaTexto}>{horaStr}</div>
            <div style={styles.fechaTexto}>{fechaStr}</div>
          </div>
          <div style={styles.divider} />
          <span style={styles.role}>{role ?? 'sin rol'}</span>
          <span style={styles.usuario}>{usuario}</span>
          <button onClick={signOut} style={styles.logoutBtn}>Cerrar sesión</button>
        </div>
      </header>

      <div style={styles.statusBar}>
        <span style={styles.statusItem}>🟢 <b>{contOK}</b> OK</span>
        <span style={styles.statusItem}>🟡 <b>{contLow}</b> Stock bajo</span>
        <span style={styles.statusItem}>🔴 <b>{contFalla}</b> Falla</span>
        <span style={styles.statusItem}>⚫ <b>{contSinOp}</b> Sin operador</span>
        <span style={styles.statusSep}>|</span>
        <span style={styles.statusItem}>📍 <b>{centrosFiltrados.length}</b> centros — {empresaActiva ? empresaActiva.nombre : 'Todas las empresas'}</span>
        {role === 'admin' && <span style={styles.statusHint}>Haz clic en el mapa para agregar un centro</span>}
      </div>

      <div style={styles.mapWrapper}>
        <MapView
          centros={centrosFiltrados}
          onMapClick={handleMapClick}
          onCentroClick={handleCentroClick}
        />

        {centroActivo && (
          <div className="panel-slide">
            <PanelCentro
              centro={centroActivo}
              onCerrar={() => setCentroActivo(null)}
              onEliminar={handleEliminar}
              onEstadoCambio={handleEstadoCambio}
              sincronizarEstado={sincronizarEstado}
              role={role}
            />
          </div>
        )}
      </div>

      {latlngSeleccionado && (
        <FormCentro
          latlng={latlngSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={() => setLatlngSeleccionado(null)}
          cargando={cargando}
          empresaActiva={empresaActiva}
        />
      )}
    </div>
  )
}

const styles = {
  wrapper:    { height: '100vh', display: 'flex', flexDirection: 'column', background: '#060d1a', color: '#e2e8f0' },
  header:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: '60px', flexShrink: 0, background: 'linear-gradient(180deg, #0d1b2e 0%, #0a1628 100%)', borderBottom: '1px solid #1e3a5f', boxShadow: '0 2px 20px rgba(0,0,0,0.5)', gap: '8px' },
  brand:      { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 },
  logoWrapper:{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', padding: '2px', flexShrink: 0 },
  logo:       { width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' },
  title:      { fontWeight: '700', fontSize: '13px', letterSpacing: '0.03em', color: '#f1f5f9', whiteSpace: 'nowrap' },
  subtitle:   { fontSize: '10px', color: '#3b82f6', letterSpacing: '0.03em' },
  userInfo:   { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 },
  relojBox:   { textAlign: 'right', background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: '8px', padding: '4px 10px' },
  horaTexto:  { fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: '700', color: '#3b82f6', letterSpacing: '0.05em' },
  fechaTexto: { fontSize: '9px', color: '#475569', textTransform: 'capitalize', textAlign: 'center' },
  divider:    { width: '1px', height: '28px', background: '#1e3a5f' },
  role:       { background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff' },
  usuario:    { color: '#94a3b8', fontSize: '12px', fontWeight: '500' },
  logoutBtn:  { background: 'transparent', border: '1px solid #1e3a5f', color: '#64748b', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px' },
  statusBar:  { display: 'flex', alignItems: 'center', gap: '14px', padding: '5px 20px', background: '#0a1628', borderBottom: '1px solid #1e3a5f', fontSize: '11px', color: '#64748b', flexShrink: 0, flexWrap: 'wrap' },
  statusItem: { display: 'flex', alignItems: 'center', gap: '4px' },
  statusSep:  { color: '#1e3a5f' },
  statusHint: { marginLeft: 'auto', color: '#3b82f6', fontSize: '11px', fontStyle: 'italic' },
  mapWrapper: { flex: 1, position: 'relative', overflow: 'hidden' },
}