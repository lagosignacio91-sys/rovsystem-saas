import { useState } from 'react'
import { Building2, MapPin } from 'lucide-react'
import { t } from '../../theme/tokens'
import { Modal, Button, Input, Select, Field } from '../kit'
import { TEAMS_ESPECIALES, labelTeamEspecial, esPiloto } from '../../lib/kitScope'
import { AREAS, AREA_DEFAULT } from '../../config/appDefaults'

const ESTADOS = [
  { value: 'OK',              label: 'Operativo' },
  { value: 'LOW_STOCK',       label: 'Stock bajo' },
  { value: 'EQUIPMENT_FAULT', label: 'Falla de equipo' },
  { value: 'DISPATCH_ONWAY',  label: 'Despacho en camino' },
  { value: 'NO_OPERATOR',     label: 'Sin operador' },
]

// Teams normales asignables (excluye los reservados para operación especial).
// Llega hasta team16 para cubrir las áreas nuevas (ej. Cisne = team15/team16).
const TEAMS = Array.from({ length: 16 }, (_, i) => ({
  id:    `team${String(i + 1).padStart(2, '0')}`,
  label: `Team ${String(i + 1).padStart(2, '0')}`,
})).filter(tm => !TEAMS_ESPECIALES.includes(tm.id))

// `role`/`teamId`/`empresas` se usan solo para el modo especial (apertura o
// soberanía): el piloto no tiene una empresa activa fija (recorre clientes), elige
// el cliente aquí y el centro nace marcado con SU team especial (teamAsignado = teamId).
export default function FormCentro({ latlng, onGuardar, onCancelar, cargando, empresaActiva, role, teamId, empresas = [] }) {
  const esPilotoRol = esPiloto(role)
  const labelEsp = labelTeamEspecial(teamId) ?? 'apertura'
  const [nombre, setNombre] = useState('')
  const [estado, setEstado] = useState('OK')
  const [team, setTeam]     = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [area, setArea]     = useState(AREA_DEFAULT)
  // lat/lng vienen del clic en el mapa pero son editables (pegar coordenadas exactas).
  const [lat, setLat]       = useState(latlng?.lat != null ? String(latlng.lat) : '')
  const [lng, setLng]       = useState(latlng?.lng != null ? String(latlng.lng) : '')

  const latN = Number(lat), lngN = Number(lng)
  const coordsOk = lat !== '' && lng !== '' && !Number.isNaN(latN) && !Number.isNaN(lngN)

  const submit = (e) => {
    e.preventDefault()
    if (!nombre.trim() || !coordsOk) return
    if (esPilotoRol) {
      const emp = empresas.find(x => x.id === empresaId)
      if (!emp) return
      onGuardar({
        nombre, estado, area,
        lat: latN, lng: lngN,
        empresaId:     emp.id,
        empresaNombre: emp.nombre,
        teamAsignado:  teamId,          // marca "centro actual" del team especial del creador
        estadoCiclo:   'apertura',
      })
      return
    }
    onGuardar({
      nombre, estado, area,
      lat: latN, lng: lngN,
      empresaId:     empresaActiva?.id ?? null,
      empresaNombre: empresaActiva?.nombre ?? 'Sin empresa',
      teamAsignado:  team || null,
    })
  }

  const puedeGuardar = nombre.trim() && coordsOk && (!esPilotoRol || empresaId)

  return (
    <Modal open title={esPilotoRol ? 'Abrir centro nuevo' : 'Nuevo centro de trabajo'} onClose={onCancelar} maxWidth={400}
      footer={<>
        <Button variant="secondary" size="lg" onClick={onCancelar}>Cancelar</Button>
        <Button variant="primary" size="lg" disabled={cargando || !puedeGuardar} onClick={submit}>{cargando ? 'Guardando...' : (esPilotoRol ? 'Abrir centro' : 'Guardar centro')}</Button>
      </>}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        {!esPilotoRol && empresaActiva && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: t.brandSoft, fontSize: t.textSm }}>
            <Building2 size={14} /> {empresaActiva.nombre}
          </span>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: t.textMuted, fontSize: t.textSm }}>
          <MapPin size={14} /> Ubicación (editable abajo)
        </span>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Nombre del centro">
          <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Centro Melinka Norte" required autoFocus />
        </Field>

        <Field label="Área">
          <Select value={area} onChange={e => setArea(e.target.value)}>
            {AREAS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </Select>
        </Field>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Field label="Latitud">
              <Input value={lat} onChange={e => setLat(e.target.value)} placeholder="-45.06569" inputMode="decimal" />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Longitud">
              <Input value={lng} onChange={e => setLng(e.target.value)} placeholder="-73.57994" inputMode="decimal" />
            </Field>
          </div>
        </div>

        {esPilotoRol && (
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

        {esPilotoRol ? (
          <p style={{ fontSize: t.textXs, color: t.textMuted, margin: 0, lineHeight: 1.5 }}>
            Este centro se abre con tu equipo de <b>{labelEsp}</b>. Trabajarás con tu kit propio; al terminar, usá
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
