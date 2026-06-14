import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import MapView from '../components/map/MapView'
import FormCentro from '../components/map/FormCentro'
import PanelCentro from '../components/ui/PanelCentro'

export default function MapaPage() {
  const { centros, cargando, agregarCentro, eliminarCentro, sincronizarEstado, role, uid, empresaActiva } = useOutletContext()
  const [latlng, setLatlng]           = useState(null)
  const [centroActivo, setCentroActivo] = useState(null)

  const centrosFiltrados = empresaActiva ? centros.filter(c => c.empresaId === empresaActiva.id) : centros

  const handleMapClick = (ll) => { if (role === 'admin') { setCentroActivo(null); setLatlng(ll) } }
  const handleGuardar  = async (datos) => { await agregarCentro(datos); setLatlng(null) }
  const handleEliminar = async (id) => { await eliminarCentro(id); setCentroActivo(null) }

  // Mantener el centro activo sincronizado con la data en vivo
  const centroVivo = centroActivo ? centros.find(c => c.id === centroActivo.id) ?? centroActivo : null

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapView centros={centrosFiltrados} onMapClick={handleMapClick} onCentroClick={setCentroActivo} role={role} />

      {centroVivo && (
        <div className="panel-slide gl-panel-wrapper" style={{ position: 'absolute', top: 0, right: 0, height: '100%', zIndex: 1000 }}>
          <PanelCentro
            centro={centroVivo}
            role={role}
            uid={uid}
            sincronizarEstado={sincronizarEstado}
            onCerrar={() => setCentroActivo(null)}
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
