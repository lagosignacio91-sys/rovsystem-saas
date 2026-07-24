import { useState } from 'react'
import { MapPin, ArrowRight } from 'lucide-react'
import { Modal, Button } from '../kit'
import { t } from '../../theme/tokens'

function labelTeam(team) {
  return team ? 'Team ' + team.replace(/\D/g, '') : 'Sin team'
}

// Picker de centro destino para REASIGNAR de forma permanente (rotación, solo admin).
// Excluye el centro/team actual y el de apertura (team08). Muestra cuántos operadores
// tiene cada centro (ocupacionPorCentro) y avisa si ya llegó a 2. `onElegir(centro)`
// hace la reasignación (async); mientras corre, bloquea.
export default function ModalReasignarCentro({ nombre, centros, teamActual, ocupacionPorCentro = {}, onElegir, onCerrar }) {
  const [procesando, setProcesando] = useState(null) // id del centro en curso
  const [error, setError] = useState('')

  const destinos = [...centros]
    .filter(c => c.teamAsignado && c.teamAsignado !== teamActual && c.teamAsignado !== 'team08')
    .sort((a, b) => {
      const n = (c) => { const x = parseInt((c.teamAsignado || '').replace(/\D/g, ''), 10); return Number.isNaN(x) ? Infinity : x }
      return (n(a) - n(b)) || (a.nombre ?? '').localeCompare(b.nombre ?? '')
    })

  const elegir = async (centro) => {
    setProcesando(centro.id)
    setError('')
    try {
      await onElegir(centro)
      onCerrar()
    } catch {
      setError('No se pudo reasignar. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setProcesando(null)
    }
  }

  return (
    <Modal open title={`Reasignar a otro centro${nombre ? ' — ' + nombre : ''}`} onClose={procesando ? undefined : onCerrar} maxWidth={420}
      footer={<Button variant="secondary" size="lg" disabled={!!procesando} onClick={onCerrar}>Cancelar</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: '0 0 4px', fontSize: t.textSm, color: t.textSecondary, lineHeight: 1.4 }}>
          Elegí el centro destino. Queda asignado a ese centro de forma <b>permanente</b> (deja el suyo) y lo verá al iniciar sesión. El inventario de cada centro no se toca.
        </p>
        {destinos.length === 0 && <p style={{ color: t.textMuted, fontSize: t.textSm }}>No hay otros centros disponibles.</p>}
        {destinos.map(c => {
          const ocupacion = ocupacionPorCentro[c.id] ?? 0
          const lleno = ocupacion >= 2
          return (
            <button key={c.id} onClick={() => elegir(c)} disabled={!!procesando}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '10px 12px', cursor: procesando ? 'default' : 'pointer', opacity: procesando && procesando !== c.id ? 0.5 : 1 }}>
              <MapPin size={15} color={t.brandSoft} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary, textTransform: 'capitalize' }}>{c.nombre}</div>
                <div style={{ fontSize: 10, color: lleno ? t.fault : t.textMuted }}>
                  {labelTeam(c.teamAsignado)} · {ocupacion} {ocupacion === 1 ? 'operador' : 'operadores'}{lleno ? ' · ya tiene 2' : ''}
                </div>
              </div>
              {procesando === c.id ? <span style={{ fontSize: 11, color: t.textMuted }}>Reasignando…</span> : <ArrowRight size={15} color={t.textMuted} />}
            </button>
          )
        })}
        {error && <p style={{ color: t.fault, fontSize: 11, margin: '4px 0 0' }}>{error}</p>}
      </div>
    </Modal>
  )
}
