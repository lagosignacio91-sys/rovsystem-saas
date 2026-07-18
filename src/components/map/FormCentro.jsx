import { useState } from 'react'
import { Building2, MapPin } from 'lucide-react'
import { t } from '../../theme/tokens'
import { Modal, Button, Input, Select, Field } from '../kit'
import { TEAM_APERTURA } from '../../lib/kitScope'

const ESTADOS = [
  { value: 'OK',              label: 'Operativo' },
  { value: 'LOW_STOCK',       label: 'Stock bajo' },
  { value: 'EQUIPMENT_FAULT', label: 'Falla de equipo' },
  { value: 'DISPATCH_ONWAY',  label: 'Despacho en camino' },
  { value: 'NO_OPERATOR',     label: 'Sin operador' },
]

const TEAMS = Array.from({ length: 11 }, (_, i) => ({
  id:    `team${String(i + 1).padStart(2, '0')}`,
  label: `Team ${String(i + 1).padStart(2, '0')}`,
}))

// `role` y `empresas` se usan solo para el modo apertura: apertura no tiene una
// empresa activa fija (recorre clientes), así que elige el cliente aquí y el
// centro nace marcado como "en apertura" (teamAsignado === TEAM_APERTURA).
export default function FormCentro({ latlng, onGuardar, onCancelar, cargando, empresaActiva, role, empresas = [] }) {
  const esApertura = role === 'apertura'
  const [nombre, setNombre] = useState('')
  const [estado, setEstado] = useState('OK')
  const [team, setTeam]     = useState('')
  const [empresaId, setEmpresaId] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    if (esApertura) {
      const emp = empresas.find(x => x.id === empresaId)
      if (!emp) return
      onGuardar({
        nombre, estado,
        lat: latlng.lat, lng: latlng.lng,
        empresaId:     emp.id,
        empresaNombre: emp.nombre,
        teamAsignado:  TEAM_APERTURA,   // marca "centro actual de apertura"
        estadoCiclo:   'apertura',
      })
      return
    }
    onGuardar({
      nombre, estado,
      lat: latlng.lat, lng: latlng.lng,
      empresaId:     empresaActiva?.id ?? null,
      empresaNombre: empresaActiva?.nombre ?? 'Sin empresa',
      teamAsignado:  team || null,
    })
  }

  const puedeGuardar = nombre.trim() && (!esApertura || empresaId)

  return (
    <Modal open title={esApertura ? 'Abrir centro nuevo' : 'Nuevo centro de trabajo'} onClose={onCancelar} maxWidth={400}
      footer={<>
        <Button variant="secondary" size="lg" onClick={onCancelar}>Cancelar</Button>
        <Button variant="primary" size="lg" disabled={cargando || !puedeGuardar} onClick={submit}>{cargando ? 'Guardando...' : (esApertura ? 'Abrir centro' : 'Guardar centro')}</Button>
      </>}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        {!esApertura && empresaActiva && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: t.brandSoft, fontSize: t.textSm }}>
            <Building2 size={14} /> {empresaActiva.nombre}
          </span>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: t.textMuted, fontSize: t.textSm }}>
          <MapPin size={14} /> {latlng.lat.toFixed(5)}, {latlng.lng.toFixed(5)}
        </span>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Nombre del centro">
          <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Centro Melinka Norte" required autoFocus />
        </Field>

        {esApertura && (
          <Field label="Cliente / empresa">
            <Select value={empresaId} onChange={e => setEmpresaId(e.target.value)}>
              <option value="">— Selecciona el cliente —</option>
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nombre}</option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Estado inicial">
          <Select value={estado} onChange={e => setEstado(e.target.value)}>
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </Select>
        </Field>

        {esApertura ? (
          <p style={{ fontSize: t.textXs, color: t.textMuted, margin: 0, lineHeight: 1.5 }}>
            Este centro se abre con tu equipo de apertura. Trabajarás con tu kit propio; al terminar, usá
            <b> «Cerrar apertura»</b> para dejar el centro registrado y libre para su team definitivo.
          </p>
        ) : (
          <Field label="Team asignado">
            <Select value={team} onChange={e => setTeam(e.target.value)}>
              <option value="">— Sin team —</option>
              {TEAMS.map(tm => (
                <option key={tm.id} value={tm.id}>{tm.label}</option>
              ))}
            </Select>
          </Field>
        )}
      </form>
    </Modal>
  )
}
