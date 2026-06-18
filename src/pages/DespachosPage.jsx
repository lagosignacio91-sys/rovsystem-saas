import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Clock, Truck, CircleCheck, Trash2, Package, Send, ChevronDown, ChevronRight } from 'lucide-react'
import { t } from '../theme/tokens'
import { Button, Modal } from '../components/kit'
import { useDespachosGlobal } from '../hooks/useDespachosGlobal'

const ESTADO_INFO = {
  pendiente: { label: 'Pendiente',  color: t.low,      tint: t.lowTint,      icon: Clock },
  enviado:   { label: 'En camino',  color: t.dispatch, tint: t.dispatchTint, icon: Truck },
  parcial:   { label: 'Parcial',    color: t.low,      tint: t.lowTint,      icon: Truck },
  recibido:  { label: 'Recibido',   color: t.ok,       tint: t.okTint,       icon: CircleCheck },
}

const FILTROS = [
  { key: 'todos',      label: 'Todos' },
  { key: 'pendiente',  label: 'Pendientes' },
  { key: 'enviado',    label: 'En camino' },
  { key: 'recibido',   label: 'Recibidos' },
]

function fechaRelativa(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7)  return `Hace ${days} días`
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

function itemsTexto(d) {
  const items = d.items ?? []
  if (items.length === 0) return 'Sin ítems'
  return items.map(i => i.nombre + (i.cantidadSolicitada ? ` ×${i.cantidadSolicitada}` : '')).join(', ')
}

function DespachoCard({ d, role, marcarEnviado, confirmarRecepcion, eliminarDespacho, onEliminar }) {
  const info = ESTADO_INFO[d.estado] ?? ESTADO_INFO.pendiente
  const Icon = info.icon
  const recibido = d.estado === 'recibido'

  const enviarWhatsApp = () => {
    const msg = `*Solicitud de despacho*\nCentro: ${d.centroNombre}\nÍtems:\n${(d.items ?? []).map(i => `• ${i.nombre}${i.cantidadSolicitada ? ` ×${i.cantidadSolicitada}` : ''}`).join('\n')}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div style={{ background: recibido ? t.bgInput : t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '11px 13px', opacity: recibido ? 0.8 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', gap: 9, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: t.radiusMd, background: info.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={16} color={info.color} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: t.textXs, color: t.textMuted, marginTop: 2 }}>{(d.items ?? []).length} ítem(s) · {itemsTexto(d)}</div>
            {d.creadoEn && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2, opacity: 0.7 }}>{fechaRelativa(d.creadoEn)}</div>}
          </div>
        </div>
        <span style={{ fontSize: 10, color: info.color, background: info.tint, padding: '3px 9px', borderRadius: t.radiusFull, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>{info.label}</span>
      </div>

      {!recibido && (
        <div style={{ display: 'flex', gap: 7, marginTop: 10, paddingTop: 9, borderTop: `1px solid ${t.border}`, flexWrap: 'wrap' }}>
          {(role === 'admin' || role === 'supervisor') && d.estado === 'pendiente' && (
            <>
              <Button size="sm" icon={Send} onClick={enviarWhatsApp} style={{ background: '#22c55e', color: '#06240f' }}>WhatsApp</Button>
              <Button size="sm" variant="secondary" icon={Truck} onClick={() => marcarEnviado(d.id)}>Marcar enviado</Button>
            </>
          )}
          {(d.estado === 'enviado' || d.estado === 'parcial') && (
            <Button size="sm" variant="secondary" icon={CircleCheck} onClick={() => confirmarRecepcion(d.id)} style={{ borderColor: t.ok, color: t.ok }}>Confirmar recepción</Button>
          )}
          {role === 'admin' && (
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => onEliminar(d)} style={{ marginLeft: 'auto' }} aria-label="Eliminar" />
          )}
        </div>
      )}
    </div>
  )
}

function GrupoCentro({ nombre, despachos, role, marcarEnviado, confirmarRecepcion, onEliminar }) {
  const [abierto, setAbierto] = useState(true)
  const pendientes = despachos.filter(d => d.estado === 'pendiente' || d.estado === 'parcial').length
  return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={() => setAbierto(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '9px 12px', cursor: 'pointer', textAlign: 'left' }}>
        {abierto ? <ChevronDown size={15} color={t.textMuted} /> : <ChevronRight size={15} color={t.textMuted} />}
        <span style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary, flex: 1 }}>{nombre}</span>
        {pendientes > 0 && (
          <span style={{ fontSize: 10, background: t.lowTint, color: t.low, borderRadius: t.radiusFull, padding: '2px 8px', fontWeight: 600 }}>{pendientes} pendiente{pendientes > 1 ? 's' : ''}</span>
        )}
        <span style={{ fontSize: t.textXs, color: t.textMuted }}>{despachos.length}</span>
      </button>
      {abierto && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 7, paddingLeft: 8 }}>
          {despachos.map(d => (
            <DespachoCard key={d.id} d={d} role={role}
              marcarEnviado={marcarEnviado} confirmarRecepcion={confirmarRecepcion}
              onEliminar={onEliminar} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DespachosPage() {
  const { role, centros, empresaActiva } = useOutletContext()
  const { despachos, cargando, marcarEnviado, confirmarRecepcion, eliminarDespacho } = useDespachosGlobal()
  const [filtro, setFiltro]       = useState('todos')
  const [aEliminar, setAEliminar] = useState(null)

  // Filtrar por empresa activa igual que en Centros
  const centrosBase = empresaActiva ? centros.filter(c => c.empresaId === empresaActiva.id) : centros
  const centroIds   = new Set(centrosBase.map(c => c.id))
  const despachosFiltrados = empresaActiva
    ? despachos.filter(d => centroIds.has(d.centroId))
    : despachos

  const conteo = {
    pendiente: despachosFiltrados.filter(d => d.estado === 'pendiente').length,
    enviado:   despachosFiltrados.filter(d => d.estado === 'enviado' || d.estado === 'parcial').length,
    recibido:  despachosFiltrados.filter(d => d.estado === 'recibido').length,
  }

  let lista = filtro === 'todos' ? despachosFiltrados
    : filtro === 'enviado' ? despachosFiltrados.filter(d => d.estado === 'enviado' || d.estado === 'parcial')
    : despachosFiltrados.filter(d => d.estado === filtro)

  // Agrupar por centro
  const porCentro = lista.reduce((acc, d) => {
    const nombre = d.centroNombre ?? 'Sin centro'
    ;(acc[nombre] = acc[nombre] ?? []).push(d)
    return acc
  }, {})
  const centrosOrdenados = Object.keys(porCentro).sort((a, b) => a.localeCompare(b))

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: t.space5 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div className="gl-stats-row">
          {FILTROS.map(f => {
            const active = filtro === f.key
            const n = f.key === 'todos' ? despachosFiltrados.length : (conteo[f.key] ?? 0)
            const color = f.key === 'pendiente' ? '#eab308' : f.key === 'enviado' ? '#3b82f6' : f.key === 'recibido' ? '#22c55e' : null
            return (
              <button key={f.key} className={`gl-stat-chip${active ? ' active' : ''}`}
                onClick={() => setFiltro(f.key)}
                style={active && color ? { color, borderColor: color, background: `${color}18` }
                  : active ? { color: t.brandSoft, borderColor: t.brand, background: t.brandTint } : {}}>
                {color && <span className="gl-stat-dot" style={{ background: color }} />}
                {f.label}{n > 0 ? <span style={{ opacity: 0.65 }}> {n}</span> : ''}
              </button>
            )
          })}
        </div>

        {cargando && <p style={{ color: t.textMuted, fontSize: t.textSm }}>Cargando…</p>}

        {!cargando && lista.length === 0 && (
          <div style={{ textAlign: 'center', color: t.textMuted, padding: '48px 0', fontSize: t.textSm }}>
            <Package size={32} style={{ opacity: 0.5, marginBottom: 8 }} /><div>No hay despachos en esta categoría.</div>
          </div>
        )}

        {centrosOrdenados.map(nombre => (
          <GrupoCentro key={nombre} nombre={nombre} despachos={porCentro[nombre]}
            role={role} marcarEnviado={marcarEnviado} confirmarRecepcion={confirmarRecepcion}
            onEliminar={setAEliminar} />
        ))}
      </div>

      {aEliminar && (
        <Modal open title="Eliminar despacho" onClose={() => setAEliminar(null)} maxWidth={340}
          footer={<>
            <Button variant="secondary" size="lg" onClick={() => setAEliminar(null)}>Cancelar</Button>
            <Button variant="primary" size="lg" style={{ background: t.fault }} onClick={async () => { await eliminarDespacho(aEliminar.id); setAEliminar(null) }}>Eliminar</Button>
          </>}>
          <p style={{ color: t.textSecondary, fontSize: t.textSm, margin: 0 }}>¿Eliminar el despacho de <b style={{ color: t.textPrimary }}>{aEliminar.centroNombre}</b>?</p>
        </Modal>
      )}
    </div>
  )
}
