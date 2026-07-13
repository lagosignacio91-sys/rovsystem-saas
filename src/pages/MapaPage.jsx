import { useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import MapView from '../components/map/MapView'
import FormCentro from '../components/map/FormCentro'
import PanelCentro from '../components/ui/PanelCentro'

export default function MapaPage() {
  const { centros, cargando, agregarCentro, eliminarCentro, actualizarCentro, sincronizarEstado, role, uid, teamId, empresaActiva, centrosConFaltantes } = useOutletContext()
  const [latlng, setLatlng]             = useState(null)
  const [centroActivo, setCentroActivo] = useState(null)

  const centrosFiltrados = empresaActiva ? centros.filter(c => c.empresaId === empresaActiva.id) : centros

  // Handlers memoizados (T-01): estables entre renders para no romper el memo de
  // MapView/PanelCentro (que reciben estas funciones como props).
  const handleMapClick = useCallback((ll) => { if (role === 'admin') { setCentroActivo(null); setLatlng(ll) } }, [role])
  const handleGuardar  = useCallback(async (datos) => { await agregarCentro(datos); setLatlng(null) }, [agregarCentro])
  const handleEliminar = useCallback(async (id) => { await eliminarCentro(id); setCentroActivo(null) }, [eliminarCentro])
  const cerrarPanel    = useCallback(() => setCentroActivo(null), [])

  const handleCentroClick = useCallback((c) => {
    if (role === 'operador') return // el operador ya ve el popup de contacto (ver MapView); el panel queda siempre fijo a la derecha
    if (role === 'admin' || role === 'supervisor') { setCentroActivo(c); return }
  }, [role])

  // Operador: el panel de su propio centro queda siempre visible, no depende de click.
  const miCentro = role === 'operador' ? centros.find(c => c.teamAsignado === teamId) : null

  const centroVivo = role === 'operador'
    ? miCentro
    : (centroActivo ? centros.find(c => c.id === centroActivo.id) ?? centroActivo : null)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapView centros={centrosFiltrados} onMapClick={handleMapClick} onCentroClick={handleCentroClick} role={role} userTeamId={teamId} centrosConFaltantes={centrosConFaltantes} />

      {centroVivo && (
        <div className="panel-slide gl-panel-wrapper" style={{ position: 'absolute', top: 0, right: 0, height: '100%', zIndex: 1000 }}>
          <PanelCentro
            centro={centroVivo}
            role={role}
            uid={uid}
            teamId={teamId}
            sincronizarEstado={sincronizarEstado}
            actualizarCentro={actualizarCentro}
            onCerrar={role === 'operador' ? null : cerrarPanel}
            onEliminar={handleEliminar}
          />
        </div>
      )}

      {latlng && (
        <FormCentro latlng={latlng} onGuardar={handleGuardar} onCancelar={() => setLatlng(null)} cargando={cargando} empresaActiva={empresaActiva} />
      )}
    </div>
  )
}
