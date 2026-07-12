import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Clock, Truck, CircleCheck, Trash2, Package, Send, ChevronDown, ChevronRight, Wrench, AlertOctagon } from 'lucide-react'
import { t } from '../theme/tokens'
import { Button, Modal } from '../components/kit'
import { useDespachosGlobal } from '../hooks/useDespachosGlobal'
import { useEquipoTicketsGlobal } from '../hooks/useEquipoTicketsGlobal'
import { claveItem, normalizarItemsLegacy } from '../lib/despachos'
import { TICKET_ESTADO_LABEL } from '../lib/equipoTickets'

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

function DespachoCard({ d, role, marcarEnviado, enviarItemsPendientes, onAbrirRecepcion, onEliminar }) {
  const info = ESTADO_INFO[d.estado] ?? ESTADO_INFO.pendiente
  const Icon = info.icon
  const recibido = d.estado === 'recibido'
  const items = normalizarItemsLegacy(d)
  const pendientesItems = items.filter(i => i.estadoItem === 'pendiente')
  // Evita que un doble clic dispare "Marcar enviado" dos veces para el mismo despacho.
  const [enviando, setEnviando] = useState(false)

  const enviarWhatsApp = () => {
    const msg = `*Solicitud de despacho*\nCentro: ${d.centroNombre}\nÍtems:\n${(d.items ?? []).map(i => `• ${i.nombre}${i.cantidadSolicitada ? ` ×${i.cantidadSolicitada}` : ''}`).join('\n')}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  // Los despachos del flujo "falta → despacho" (origen: 'centro') marcan sus ítems
  // pendientes como enviados uno a uno; los de Bodega Central siguen usando marcarEnviado.
  const handleMarcarEnviado = async () => {
    if (enviando) return
    setEnviando(true)
    try {
      if (d.origen === 'centro') {
        await enviarItemsPendientes(d.id, pendientesItems.map(claveItem))
      } else {
        await marcarEnviado(d.id, (d.items ?? []).map(i => ({ ...i, cantidadDespachada: i.cantidadEnviada ?? i.cantidadSolicitada ?? i.cantidad ?? 1 })))
      }
    } catch (e) {
      console.error('[DespachosPage/marcarEnviado]', e)
      alert('No se pudo marcar como enviado. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
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

      {/* Evidencia del despacho: transportista, comentario y fotos */}
      {(d.transportista || d.comentarioDespacho || (d.fotosDespacho?.length > 0)) && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {d.transportista && <div style={{ fontSize: t.textXs, color: t.textSecondary }}>🚚 {d.transportista}</div>}
          {d.comentarioDespacho && <div style={{ fontSize: t.textXs, color: t.textMuted }}>📝 {d.comentarioDespacho}</div>}
          {d.fotosDespacho?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {d.fotosDespacho.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="foto despacho" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: t.radiusSm, border: `1px solid ${t.border}` }} />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {!recibido && (
        <div style={{ display: 'flex', gap: 7, marginTop: 10, paddingTop: 9, borderTop: `1px solid ${t.border}`, flexWrap: 'wrap' }}>
          {(role === 'admin' || role === 'supervisor') && d.estado === 'pendiente' && (
            <>
              <Button size="sm" icon={Send} onClick={enviarWhatsApp} style={{ background: '#22c55e', color: '#06240f' }}>WhatsApp</Button>
              <Button size="sm" variant="secondary" icon={Truck} onClick={handleMarcarEnviado} disabled={enviando}>
                {enviando ? 'Enviando...' : 'Marcar enviado'}
              </Button>
            </>
          )}
          {(role === 'admin' || role === 'operador') && (d.estado === 'enviado' || d.estado === 'parcial') && (
            <Button size="sm" variant="secondary" icon={CircleCheck} onClick={() => onAbrirRecepcion(d)} style={{ borderColor: t.ok, color: t.ok }}>Confirmar recepción</Button>
          )}
          {(role === 'admin' || role === 'supervisor') && (
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => onEliminar(d)} style={{ marginLeft: 'auto' }} aria-label="Eliminar" />
          )}
        </div>
      )}
    </div>
  )
}

function GrupoCentro({ nombre, despachos, role, marcarEnviado, enviarItemsPendientes, onAbrirRecepcion, onEliminar }) {
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
              marcarEnviado={marcarEnviado} enviarItemsPendientes={enviarItemsPendientes}
              onAbrirRecepcion={onAbrirRecepcion}
              onEliminar={onEliminar} />
          ))}
        </div>
      )}
    </div>
  )
}

function equipoLabel(equipo) { return equipo === 'backup' ? 'Backup' : 'Principal' }

function EquipoTicketCard({ ticket, role, teamId, bloqueado, onDespachar, onEnviarReemplazo, onAbrirRecepcion, onEliminar }) {
  const recibido = ticket.estado === 'recibido'
  const esMiTeam = !!teamId && ticket.teamAsignado === teamId
  const puedeDespachar       = ticket.estado === 'solicitado'        && (role === 'admin' || (role === 'operador' && esMiTeam)) && !bloqueado
  const puedeEnviarReemplazo = ticket.estado === 'despachado_taller' && (role === 'admin' || role === 'supervisor')            && !bloqueado
  const puedeConfirmar       = ticket.estado === 'reemplazo_enviado' && (role === 'admin' || (role === 'operador' && esMiTeam)) && !bloqueado
  const puedeEliminar        = (role === 'admin' || role === 'supervisor') && !bloqueado

  return (
    <div style={{ background: recibido ? t.bgInput : t.faultTint, border: `1px solid ${t.fault}`, borderRadius: t.radiusMd, padding: '11px 13px', opacity: recibido ? 0.8 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', gap: 9, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: t.radiusMd, background: t.bgElevated, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertOctagon size={16} color={t.fault} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: t.textSm, color: t.textPrimary, fontWeight: 600 }}>{equipoLabel(ticket.equipo)} — {ticket.campoLabel}</div>
            {ticket.fallaMotivo && <div style={{ fontSize: t.textXs, color: t.textMuted, marginTop: 2 }}>{ticket.fallaMotivo}</div>}
            {ticket.creadoEn && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2, opacity: 0.7 }}>{fechaRelativa(ticket.creadoEn)}</div>}
          </div>
        </div>
        <span style={{ fontSize: 10, color: t.fault, background: t.bgElevated, padding: '3px 9px', borderRadius: t.radiusFull, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {TICKET_ESTADO_LABEL[ticket.estado] ?? ticket.estado}
        </span>
      </div>

      {ticket.reemplazoDetalle && (
        <div style={{ marginTop: 8, fontSize: t.textXs, color: t.textSecondary }}>📦 {ticket.reemplazoDetalle}</div>
      )}
      {ticket.recepcionObservacion && (
        <div style={{ marginTop: 4, fontSize: t.textXs, color: t.textMuted }}>📝 {ticket.recepcionObservacion}</div>
      )}

      {!recibido && (
        <div style={{ display: 'flex', gap: 7, marginTop: 10, paddingTop: 9, borderTop: `1px solid ${t.fault}`, flexWrap: 'wrap' }}>
          {puedeDespachar && (
            <Button size="sm" variant="secondary" icon={Truck} onClick={() => onDespachar(ticket.id)}>Despachar a taller</Button>
          )}
          {puedeEnviarReemplazo && (
            <Button size="sm" variant="secondary" icon={Package} onClick={() => onEnviarReemplazo(ticket)}>Enviar reemplazo</Button>
          )}
          {puedeConfirmar && (
            <Button size="sm" variant="secondary" icon={CircleCheck} onClick={() => onAbrirRecepcion(ticket)} style={{ borderColor: t.ok, color: t.ok }}>Confirmar recepción</Button>
          )}
          {puedeEliminar && (
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => onEliminar(ticket)} style={{ marginLeft: 'auto' }} aria-label="Eliminar" />
          )}
        </div>
      )}
    </div>
  )
}

function GrupoCentroEquipos({ nombre, tickets, role, teamId, bloqueado, onDespachar, onEnviarReemplazo, onAbrirRecepcion, onEliminar }) {
  const [abierto, setAbierto] = useState(true)
  const abiertos = tickets.filter(t => t.estado !== 'recibido').length
  return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={() => setAbierto(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '9px 12px', cursor: 'pointer', textAlign: 'left' }}>
        {abierto ? <ChevronDown size={15} color={t.textMuted} /> : <ChevronRight size={15} color={t.textMuted} />}
        <span style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary, flex: 1 }}>{nombre}</span>
        {abiertos > 0 && (
          <span style={{ fontSize: 10, background: t.faultTint, color: t.fault, borderRadius: t.radiusFull, padding: '2px 8px', fontWeight: 600 }}>{abiertos} en curso</span>
        )}
        <span style={{ fontSize: t.textXs, color: t.textMuted }}>{tickets.length}</span>
      </button>
      {abierto && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 7, paddingLeft: 8 }}>
          {tickets.map(ticket => (
            <EquipoTicketCard key={ticket.id} ticket={ticket} role={role} teamId={teamId} bloqueado={bloqueado}
              onDespachar={onDespachar} onEnviarReemplazo={onEnviarReemplazo}
              onAbrirRecepcion={onAbrirRecepcion} onEliminar={onEliminar} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DespachosPage() {
  const { role, centros, empresaActiva, teamId } = useOutletContext()
  const { despachos, cargando, marcarEnviado, enviarItemsPendientes, confirmarRecepcion, eliminarDespacho } = useDespachosGlobal({ role, teamId })
  const {
    tickets: equipoTickets, cargando: cargandoEquipos,
    marcarDespachadoTaller, marcarReemplazoEnviado, confirmarRecepcion: confirmarRecepcionEquipo, eliminarTicket,
  } = useEquipoTicketsGlobal({ role, teamId })
  const [filtro,          setFiltro]          = useState('todos')
  const [aEliminar,       setAEliminar]       = useState(null)
  const [despachoRecibir, setDespachoRecibir] = useState(null)
  const [obsRecepcion,    setObsRecepcion]    = useState('')
  const [itemsRecibir,    setItemsRecibir]    = useState({}) // clave item -> boolean
  const [guardandoRec,    setGuardandoRec]    = useState(false)
  const [guardandoElim,   setGuardandoElim]   = useState(false)

  // ---- Equipos (tickets de falla → baja → reemplazo) ----
  const [ticketReemplazo, setTicketReemplazo] = useState(null)
  const [detalleReemplazo, setDetalleReemplazo] = useState('')
  const [ticketRecibir,   setTicketRecibir]   = useState(null)
  const [obsRecepcionEq,  setObsRecepcionEq]  = useState('')
  const [ticketEliminar,  setTicketEliminar]  = useState(null)
  const [guardandoEq,     setGuardandoEq]     = useState(false)

  const handleDespachar = async (id) => {
    if (guardandoEq) return
    setGuardandoEq(true)
    try {
      await marcarDespachadoTaller(id)
    } catch (e) {
      console.error('[DespachosPage/despacharEquipo]', e)
      alert('No se pudo marcar como despachado. Intenta de nuevo.')
    } finally {
      setGuardandoEq(false)
    }
  }

  const handleConfirmarReemplazo = async () => {
    if (!ticketReemplazo || guardandoEq) return
    setGuardandoEq(true)
    try {
      await marcarReemplazoEnviado(ticketReemplazo.id, { detalle: detalleReemplazo })
      setTicketReemplazo(null)
    } catch (e) {
      console.error('[DespachosPage/enviarReemplazo]', e)
      alert('No se pudo marcar el reemplazo. Intenta de nuevo.')
    } finally {
      setGuardandoEq(false)
    }
  }

  const handleConfirmarRecepcionEquipo = async () => {
    if (!ticketRecibir || guardandoEq) return
    setGuardandoEq(true)
    try {
      await confirmarRecepcionEquipo(ticketRecibir.id, { observacion: obsRecepcionEq })
      setTicketRecibir(null)
    } catch (e) {
      console.error('[DespachosPage/confirmarRecepcionEquipo]', e)
      alert('No se pudo confirmar la recepción. Intenta de nuevo.')
    } finally {
      setGuardandoEq(false)
    }
  }

  const abrirRecepcion = (d) => {
    const enviados = normalizarItemsLegacy(d).filter(i => i.estadoItem === 'enviado')
    setDespachoRecibir({ ...d, _enviados: enviados })
    setObsRecepcion('')
    setItemsRecibir(enviados.reduce((acc, i) => ({ ...acc, [claveItem(i)]: true }), {}))
  }

  const abrirReemplazo = (ticket) => { setTicketReemplazo(ticket); setDetalleReemplazo('') }
  const abrirRecepcionEquipo = (ticket) => { setTicketRecibir(ticket); setObsRecepcionEq('') }

  const toggleItemRecibir = (key) => setItemsRecibir(prev => ({ ...prev, [key]: !prev[key] }))

  const handleConfirmarRecepcion = async () => {
    if (!despachoRecibir) return
    const itemKeys = despachoRecibir._enviados.filter(i => itemsRecibir[claveItem(i)]).map(claveItem)
    if (itemKeys.length === 0) return
    setGuardandoRec(true)
    try {
      await confirmarRecepcion(despachoRecibir.id, itemKeys, obsRecepcion)
      setDespachoRecibir(null)
    } catch (e) {
      console.error('[DespachosPage/confirmarRecepcion]', e)
      alert('No se pudo confirmar la recepción. Intenta de nuevo.')
    } finally {
      setGuardandoRec(false)
    }
  }

  // Filtrar por empresa activa igual que en Centros
  const centrosBase = empresaActiva ? centros.filter(c => c.empresaId === empresaActiva.id) : centros
  const centroIds   = new Set(centrosBase.map(c => c.id))
  const despachosFiltrados = empresaActiva
    ? despachos.filter(d => centroIds.has(d.centroId))
    : despachos

  const equipoTicketsFiltrados = empresaActiva
    ? equipoTickets.filter(t => centroIds.has(t.centroId))
    : equipoTickets
  const porCentroEquipos = equipoTicketsFiltrados.reduce((acc, t) => {
    const nombre = t.centroNombre ?? 'Sin centro'
    ;(acc[nombre] = acc[nombre] ?? []).push(t)
    return acc
  }, {})
  const centrosOrdenadosEquipos = Object.keys(porCentroEquipos).sort((a, b) => a.localeCompare(b))

  const conteo = {
    pendiente: despachosFiltrados.filter(d => d.estado === 'pendiente').length,
    enviado:   despachosFiltrados.filter(d => d.estado === 'enviado' || d.estado === 'parcial').length,
    recibido:  despachosFiltrados.filter(d => d.estado === 'recibido').length,
  }

  let lista = filtro === 'todos' ? despachosFiltrados
    : filtro === 'enviado' ? despachosFiltrados.filter(d => d.estado === 'enviado' || d.estado === 'parcial')
    : despachosFiltrados.filter(d => d.estado === filtro)

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
            role={role} marcarEnviado={marcarEnviado} enviarItemsPendientes={enviarItemsPendientes}
            onAbrirRecepcion={abrirRecepcion}
            onEliminar={setAEliminar} />
        ))}

        {/* ---- Sección Equipos (tickets de falla → baja → reemplazo) ---- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '24px 0 12px' }}>
          <Wrench size={16} color={t.fault} />
          <span style={{ fontSize: t.textSm, fontWeight: 700, color: t.textPrimary }}>Equipos</span>
        </div>

        {cargandoEquipos && <p style={{ color: t.textMuted, fontSize: t.textSm }}>Cargando…</p>}

        {!cargandoEquipos && centrosOrdenadosEquipos.length === 0 && (
          <div style={{ textAlign: 'center', color: t.textMuted, padding: '24px 0', fontSize: t.textSm }}>
            <Wrench size={28} style={{ opacity: 0.5, marginBottom: 8 }} /><div>Sin tickets de equipo registrados.</div>
          </div>
        )}

        {centrosOrdenadosEquipos.map(nombre => (
          <GrupoCentroEquipos key={nombre} nombre={nombre} tickets={porCentroEquipos[nombre]}
            role={role} teamId={teamId} bloqueado={guardandoEq}
            onDespachar={handleDespachar} onEnviarReemplazo={abrirReemplazo}
            onAbrirRecepcion={abrirRecepcionEquipo} onEliminar={setTicketEliminar} />
        ))}
      </div>

      {/* Modal confirmar recepción */}
      {despachoRecibir && (
        <Modal open title="Confirmar Recepción" onClose={() => setDespachoRecibir(null)} maxWidth={360}
          footer={<>
            <Button variant="secondary" size="lg" onClick={() => setDespachoRecibir(null)} disabled={guardandoRec}>Cancelar</Button>
            <Button size="lg" style={{ background: t.ok, color: '#fff' }} onClick={handleConfirmarRecepcion} disabled={guardandoRec}>
              {guardandoRec ? 'Guardando...' : 'Confirmar'}
            </Button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: t.textSm, fontWeight: 600, color: t.textSecondary, marginBottom: 6 }}>Ítems recibidos</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {despachoRecibir._enviados.map(i => (
                  <label key={claveItem(i)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: t.textSm, color: t.textPrimary, background: t.bgInput, borderRadius: t.radiusMd, padding: '6px 10px' }}>
                    <input type="checkbox" checked={itemsRecibir[claveItem(i)] ?? true} onChange={() => toggleItemRecibir(claveItem(i))} />
                    {i.nombre} ×{i.cantidad}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: t.textSm, fontWeight: 600, color: t.textSecondary, marginBottom: 4 }}>Observación</label>
              <textarea
                value={obsRecepcion}
                onChange={e => setObsRecepcion(e.target.value)}
                placeholder="Ej: Se recibió todo OK, faltó un ítem..."
                rows={3}
                style={{ width: '100%', padding: '8px 10px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textPrimary, fontSize: t.textSm, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal eliminar */}
      {aEliminar && (
        <Modal open title="Eliminar despacho" onClose={() => !guardandoElim && setAEliminar(null)} maxWidth={340}
          footer={<>
            <Button variant="secondary" size="lg" onClick={() => setAEliminar(null)} disabled={guardandoElim}>Cancelar</Button>
            <Button variant="primary" size="lg" style={{ background: t.fault }} disabled={guardandoElim}
              onClick={async () => {
                if (guardandoElim) return
                setGuardandoElim(true)
                try { await eliminarDespacho(aEliminar.id); setAEliminar(null) } finally { setGuardandoElim(false) }
              }}>
              {guardandoElim ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>}>
          <p style={{ color: t.textSecondary, fontSize: t.textSm, margin: 0 }}>¿Eliminar el despacho de <b style={{ color: t.textPrimary }}>{aEliminar.centroNombre}</b>?</p>
        </Modal>
      )}

      {/* Modal enviar reemplazo de equipo */}
      {ticketReemplazo && (
        <Modal open title="Enviar reemplazo" onClose={() => setTicketReemplazo(null)} maxWidth={360}
          footer={<>
            <Button variant="secondary" size="lg" onClick={() => setTicketReemplazo(null)} disabled={guardandoEq}>Cancelar</Button>
            <Button size="lg" style={{ background: t.fault, color: '#fff' }} onClick={handleConfirmarReemplazo} disabled={guardandoEq}>
              {guardandoEq ? 'Guardando...' : 'Enviar reemplazo'}
            </Button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ color: t.textSecondary, fontSize: t.textSm, margin: 0 }}>
              {equipoLabel(ticketReemplazo.equipo)} — <b style={{ color: t.textPrimary }}>{ticketReemplazo.campoLabel}</b>, centro <b style={{ color: t.textPrimary }}>{ticketReemplazo.centroNombre}</b>
            </p>
            <div>
              <label style={{ display: 'block', fontSize: t.textSm, fontWeight: 600, color: t.textSecondary, marginBottom: 4 }}>Detalle (opcional)</label>
              <textarea
                value={detalleReemplazo}
                onChange={e => setDetalleReemplazo(e.target.value)}
                placeholder="Ej: se envía unidad de repuesto N°..."
                rows={3}
                style={{ width: '100%', padding: '8px 10px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textPrimary, fontSize: t.textSm, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal confirmar recepción de equipo */}
      {ticketRecibir && (
        <Modal open title="Confirmar Recepción" onClose={() => setTicketRecibir(null)} maxWidth={360}
          footer={<>
            <Button variant="secondary" size="lg" onClick={() => setTicketRecibir(null)} disabled={guardandoEq}>Cancelar</Button>
            <Button size="lg" style={{ background: t.ok, color: '#fff' }} onClick={handleConfirmarRecepcionEquipo} disabled={guardandoEq}>
              {guardandoEq ? 'Guardando...' : 'Confirmar'}
            </Button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ color: t.textSecondary, fontSize: t.textSm, margin: 0 }}>
              {equipoLabel(ticketRecibir.equipo)} — <b style={{ color: t.textPrimary }}>{ticketRecibir.campoLabel}</b>, centro <b style={{ color: t.textPrimary }}>{ticketRecibir.centroNombre}</b>
            </p>
            <div>
              <label style={{ display: 'block', fontSize: t.textSm, fontWeight: 600, color: t.textSecondary, marginBottom: 4 }}>Observación</label>
              <textarea
                value={obsRecepcionEq}
                onChange={e => setObsRecepcionEq(e.target.value)}
                placeholder="Ej: llegó en buen estado..."
                rows={3}
                style={{ width: '100%', padding: '8px 10px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textPrimary, fontSize: t.textSm, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal eliminar ticket de equipo */}
      {ticketEliminar && (
        <Modal open title="Eliminar ticket" onClose={() => !guardandoEq && setTicketEliminar(null)} maxWidth={340}
          footer={<>
            <Button variant="secondary" size="lg" onClick={() => setTicketEliminar(null)} disabled={guardandoEq}>Cancelar</Button>
            <Button variant="primary" size="lg" style={{ background: t.fault }} disabled={guardandoEq}
              onClick={async () => {
                if (guardandoEq) return
                setGuardandoEq(true)
                try { await eliminarTicket(ticketEliminar.id); setTicketEliminar(null) } finally { setGuardandoEq(false) }
              }}>
              {guardandoEq ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>}>
          <p style={{ color: t.textSecondary, fontSize: t.textSm, margin: 0 }}>¿Eliminar el ticket de <b style={{ color: t.textPrimary }}>{ticketEliminar.campoLabel}</b> ({ticketEliminar.centroNombre})?</p>
        </Modal>
      )}
    </div>
  )
}
