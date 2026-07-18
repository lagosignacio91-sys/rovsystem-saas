import { useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import MapView from '../components/map/MapView'
import FormCentro from '../components/map/FormCentro'
import PanelCentro from '../components/ui/PanelCentro'
import { useEmpresas } from '../hooks/useEmpresas'

export default function MapaPage() {
  const { centros, cargando, agregarCentro, eliminarCentro, actualizarCentro, sincronizarEstado, role, uid, teamId, empresaActiva, centrosConFaltantes } = useOutletContext()
  const { empresas } = useEmpresas()
  const [latlng, setLatlng]             = useState(null)
  const [centroActivo, setCentroActivo] = useState(null)

  const centrosFiltrados = empresaActiva ? centros.filter(c => c.empresaId === empresaActiva.id) : centros

  // Operador y apertura: el panel de su propio centro (teamAsignado === teamId) queda
  // siempre visible, no depende de click. Para apertura (teamId = team08) su "centro
  // actual" es el que esté en apertura, si hay alguno.
  const miCentro = (role === 'operador' || role === 'apertura') ? centros.find(c => c.teamAsignado === teamId) : null
  // Guardia uno-a-la-vez: apertura no puede abrir otro centro si ya tiene uno en curso.
  const aperturaOcupada = role === 'apertura' && !!miCentro

  // Handlers memoizados (T-01): estables entre renders para no romper el memo de
  // MapView/PanelCentro (que reciben estas funciones como props).
  const handleMapClick = useCallback((ll) => {
    if (role === 'admin') { setCentroActivo(null); setLatlng(ll); return }
    if (role === 'apertura') {
      if (aperturaOcupada) { alert('Ya tenés un centro en apertura. Cerralo antes de abrir otro.'); return }
      setCentroActivo(null); setLatlng(ll)
    }
  }, [role, aperturaOcupada])
  const handleGuardar  = useCallback(async (datos) => { await agregarCentro(datos); setLatlng(null) }, [agregarCentro])
  const handleEliminar = useCallback(async (id) => { await eliminarCentro(id); setCentroActivo(null) }, [eliminarCentro])
  const cerrarPanel    = useCallback(() => setCentroActivo(null), [])

  const handleCentroClick = useCallback((c) => {
    if (role === 'operador' || role === 'apertura') return // panel fijo a su propio centro (ver abajo)
    if (role === 'admin' || role === 'supervisor') { setCentroActivo(c); return }
  }, [role])

  const centroVivo = (role === 'operador' || role === 'apertura')
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
            onCerrar={(role === 'operador' || role === 'apertura') ? null : cerrarPanel}
            onEliminar={handleEliminar}
          />
        </div>
      )}

      {latlng && (
        <FormCentro
          latlng={latlng}
          onGuardar={handleGuardar}
          onCancelar={() => setLatlng(null)}
          cargando={cargando}
          empresaActiva={empresaActiva}
          role={role}
          empresas={empresas}
        />
      )}
    </div>
  )
}
