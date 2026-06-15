import { useState } from 'react'
import { Building2, MapPin } from 'lucide-react'
import { t } from '../../theme/tokens'
import { Modal, Button, Input, Select, Field } from '../kit'

const ESTADOS = [
  { value: 'OK',              label: 'Operativo' },
  { value: 'LOW_STOCK',       label: 'Stock bajo' },
  { value: 'EQUIPMENT_FAULT', label: 'Falla de equipo' },
  { value: 'DISPATCH_ONWAY',  label: 'Despacho en camino' },
  { value: 'NO_OPERATOR',     label: 'Sin operador' },
]

const TEAMS = Array.from({ length: 10 }, (_, i) => ({
  id:    `team-${String(i + 1).padStart(2, '0')}`,
  label: `Team ${String(i + 1).padStart(2, '0')}`,
}))

export default function FormCentro({ latlng, onGuardar, onCancelar, cargando, empresaActiva }) {
  const [nombre, setNombre] = useState('')
  const [estado, setEstado] = useState('OK')
  const [teamId, setTeamId] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    onGuardar({
      nombre, estado,
      lat: latlng.lat, lng: latlng.lng,
      empresaId:     empresaActiva?.id ?? null,
      empresaNombre: empresaActiva?.nombre ?? 'Sin empresa',
      teamId:        teamId || null,
    })
  }

  return (
    <Modal open title="Nuevo centro de trabajo" onClose={onCancelar} maxWidth={400}
      footer={<>
        <Button variant="secondary" size="lg" onClick={onCancelar}>Cancelar</Button>
        <Button variant="primary" size="lg" disabled={cargando} onClick={submit}>{cargando ? 'Guardando...' : 'Guardar centro'}</Button>
      </>}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        {empresaActiva && (
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
        <Field label="Estado inicial">
          <Select value={estado} onChange={e => setEstado(e.target.value)}>
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </Select>
        </Field>
        <Field label="Team asignado">
          <Select value={teamId} onChange={e => setTeamId(e.target.value)}>
            <option value="">— Sin team —</option>
            {TEAMS.map(tm => (
              <option key={tm.id} value={tm.id}>{tm.label}</option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  )
}
