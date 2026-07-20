import { useState } from 'react'
import { useEquipoTickets } from '../../hooks/useEquipoTickets'
import { claveFalla, TICKET_ESTADO_LABEL } from '../../lib/equipoTickets'
import { esCentroApertura } from '../../lib/kitScope'

function equipoLabel(equipo) { return equipo === 'backup' ? 'Backup' : 'Principal' }

function ModalSolicitarBaja({ falla, procesando, onConfirmar, onCerrar }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitulo}>🔧 Solicitar baja</h3>
        <p style={styles.modalSubtitulo}>{equipoLabel(falla.equipo)} — {falla.campoLabel}</p>
        <div style={styles.razonBox}>
          <span style={styles.obsLabel}>Motivo de la falla:</span>
          <p style={styles.razonTexto}>{falla.fallaMotivo || 'Sin descripción'}</p>
        </div>
        <p style={styles.modalHint}>Se crea un ticket para que el operador despache este componente al taller.</p>
        <div style={styles.modalBtns}>
          <button onClick={onCerrar}    disabled={procesando} style={styles.btnCancelar}>Cancelar</button>
          <button onClick={onConfirmar} disabled={procesando} style={{ ...styles.btnConfirmarRojo, opacity: procesando ? 0.6 : 1 }}>
            {procesando ? 'Solicitando...' : 'Solicitar baja'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalReemplazo({ procesando, onConfirmar, onCerrar }) {
  const [detalle, setDetalle] = useState('')
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitulo}>📦 Enviar reemplazo</h3>
        <label style={styles.label}>Detalle (opcional)</label>
        <textarea style={styles.textarea} value={detalle} onChange={e => setDetalle(e.target.value)}
          placeholder="Ej: se envía unidad de repuesto N°..." rows={3} autoFocus />
        <div style={styles.modalBtns}>
          <button onClick={onCerrar}                  disabled={procesando} style={styles.btnCancelar}>Cancelar</button>
          <button onClick={() => onConfirmar(detalle)} disabled={procesando} style={{ ...styles.btnConfirmarRojo, opacity: procesando ? 0.6 : 1 }}>
            {procesando ? 'Enviando...' : 'Enviar reemplazo'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalRecepcionEquipo({ procesando, onConfirmar, onCerrar }) {
  const [observacion, setObservacion] = useState('')
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitulo}>✅ Confirmar Recepción</h3>
        <label style={styles.label}>Observación (opcional)</label>
        <textarea style={styles.textarea} value={observacion} onChange={e => setObservacion(e.target.value)}
          placeholder="Ej: llegó en buen estado..." rows={3} autoFocus />
        <div style={styles.modalBtns}>
          <button onClick={onCerrar}                      disabled={procesando} style={styles.btnCancelar}>Cancelar</button>
          <button onClick={() => onConfirmar(observacion)} disabled={procesando} style={{ ...styles.btnConfirmarRojo, opacity: procesando ? 0.6 : 1 }}>
            {procesando ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TicketCard({ ticket, role, teamId, bloqueado, onDespachar, onEnviarReemplazo, onConfirmarRecepcion, onEliminar }) {
  const [abierto, setAbierto] = useState(true)
  const [modal, setModal]     = useState(null) // 'reemplazo' | 'recepcion' | null

  const esMiTeam = !!teamId && ticket.teamAsignado === teamId
  const puedeDespachar       = ticket.estado === 'solicitado'        && (role === 'admin' || (role === 'operador' && esMiTeam)) && !bloqueado
  const puedeEnviarReemplazo = ticket.estado === 'despachado_taller' && (role === 'admin' || role === 'supervisor')            && !bloqueado
  const puedeConfirmar       = ticket.estado === 'reemplazo_enviado' && (role === 'admin' || (role === 'operador' && esMiTeam)) && !bloqueado
  const puedeEliminar        = (role === 'admin' || role === 'supervisor') && !bloqueado

  return (
    <div style={styles.tCard}>
      <div style={styles.tHeader} onClick={() => setAbierto(!abierto)}>
        <div style={styles.tHeaderIzq}>
          <span style={styles.tBadge}>{TICKET_ESTADO_LABEL[ticket.estado] ?? ticket.estado}</span>
          <span style={styles.tFecha}>{new Date(ticket.creadoEn).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
        <span style={styles.chevron}>{abierto ? '▲' : '▼'}</span>
      </div>

      {abierto && (
        <div style={styles.tBody}>
          <div style={styles.tItem}>
            <span style={styles.tItemTipo}>{equipoLabel(ticket.equipo)}</span>
            <span style={styles.tItemNombre}>{ticket.campoLabel}</span>
          </div>
          {ticket.fallaMotivo && (
            <div style={styles.obsBox}>
              <span style={styles.obsLabel}>⚠️ Falla:</span>
              <span style={styles.obsTexto}>{ticket.fallaMotivo}</span>
            </div>
          )}
          {ticket.reemplazoDetalle && (
            <div style={styles.obsBox}>
              <span style={styles.obsLabel}>📦 Reemplazo:</span>
              <span style={styles.obsTexto}>{ticket.reemplazoDetalle}</span>
            </div>
          )}
          {ticket.recepcionObservacion && (
            <div style={styles.obsBox}>
              <span style={styles.obsLabel}>📝 Observación:</span>
              <span style={styles.obsTexto}>{ticket.recepcionObservacion}</span>
            </div>
          )}

          <div style={styles.tAcciones}>
            {puedeDespachar && (
              <button onClick={() => onDespachar(ticket.id)} style={styles.btnAccionRojo}>🔧 Despachar a taller</button>
            )}
            {puedeEnviarReemplazo && (
              <button onClick={() => setModal('reemplazo')} style={styles.btnAccionRojo}>📦 Enviar reemplazo</button>
            )}
            {puedeConfirmar && (
              <button onClick={() => setModal('recepcion')} style={styles.btnAccionRojo}>✅ Confirmar recepción</button>
            )}
            {puedeEliminar && (
              <button onClick={() => onEliminar(ticket.id)} style={styles.btnEliminar}>🗑️</button>
            )}
          </div>
        </div>
      )}

      {modal === 'reemplazo' && (
        <ModalReemplazo
          procesando={bloqueado}
          onConfirmar={async (detalle) => { await onEnviarReemplazo(ticket.id, { detalle }); setModal(null) }}
          onCerrar={() => !bloqueado && setModal(null)}
        />
      )}
      {modal === 'recepcion' && (
        <ModalRecepcionEquipo
          procesando={bloqueado}
          onConfirmar={async (observacion) => { await onConfirmarRecepcion(ticket.id, { observacion }); setModal(null) }}
          onCerrar={() => !bloqueado && setModal(null)}
        />
      )}
    </div>
  )
}

export default function PanelEquipoTickets({ centro, role, teamId, sincronizarEstado }) {
  const { tickets, fallasSinTicket, cargando, solicitarBaja, marcarDespachadoTaller, marcarReemplazoEnviado, confirmarRecepcion, eliminarTicket } = useEquipoTickets(centro, teamId)
  const [fallaModal, setFallaModal] = useState(null)
  // Bloquea TODAS las acciones del panel mientras una escritura está en curso, para que
  // un doble clic (o reabrir el modal) no pueda generar dos tickets/acciones repetidas.
  const [procesando, setProcesando] = useState(false)

  const handleSolicitarBaja = async () => {
    if (!fallaModal || procesando) return
    setProcesando(true)
    try {
      await solicitarBaja({
        centroId: centro.id, centroNombre: centro.nombre, teamAsignado: centro.teamAsignado ?? null,
        equipo: fallaModal.equipo, campo: fallaModal.campo, campoLabel: fallaModal.campoLabel, fallaMotivo: fallaModal.fallaMotivo,
      })
      setFallaModal(null)
    } catch (e) {
      console.error('[PanelEquipoTickets/solicitarBaja]', e)
      alert('No se pudo solicitar la baja. Intenta de nuevo.')
    } finally {
      setProcesando(false)
    }
  }

  const handleDespachar = async (id) => {
    if (procesando) return
    setProcesando(true)
    try {
      await marcarDespachadoTaller(id)
    } catch (e) {
      console.error('[PanelEquipoTickets/despachar]', e)
      alert('No se pudo marcar como despachado. Intenta de nuevo.')
    } finally {
      setProcesando(false)
    }
  }

  const handleEnviarReemplazo = async (id, { detalle }) => {
    if (procesando) return
    setProcesando(true)
    try {
      await marcarReemplazoEnviado(id, { detalle })
    } catch (e) {
      console.error('[PanelEquipoTickets/reemplazo]', e)
      alert('No se pudo marcar el reemplazo. Intenta de nuevo.')
    } finally {
      setProcesando(false)
    }
  }

  const handleConfirmarRecepcion = async (id, { observacion }) => {
    if (procesando) return
    setProcesando(true)
    try {
      await confirmarRecepcion(id, { observacion })
      if (sincronizarEstado && !esCentroApertura(centro)) await sincronizarEstado(centro.id)
    } catch (e) {
      console.error('[PanelEquipoTickets/confirmarRecepcion]', e)
      alert('No se pudo confirmar la recepción. Intenta de nuevo.')
    } finally {
      setProcesando(false)
    }
  }

  const handleEliminar = async (id) => {
    if (procesando) return
    if (window.confirm('¿Eliminar este ticket?')) {
      setProcesando(true)
      try {
        await eliminarTicket(id)
      } finally {
        setProcesando(false)
      }
    }
  }

  if (cargando) return null

  return (
    <div>
      <h3 style={styles.titulo}>🔧 Equipos</h3>

      {fallasSinTicket.length > 0 && (
        <div style={styles.pendientesBox}>
          <div style={styles.pendientesTitulo}>⚠️ Fallas sin gestionar ({fallasSinTicket.length})</div>
          {fallasSinTicket.map((f) => (
            <div key={claveFalla(f)} style={styles.penItem}>
              <span style={styles.penTipo}>{equipoLabel(f.equipo)}</span>
              <span style={styles.penNombre}>{f.campoLabel}</span>
              {(role === 'admin' || role === 'supervisor') && (
                <button onClick={() => setFallaModal(f)} disabled={procesando}
                  style={{ ...styles.btnSolicitar, opacity: procesando ? 0.5 : 1 }}>Solicitar baja</button>
              )}
            </div>
          ))}
        </div>
      )}

      {fallasSinTicket.length === 0 && tickets.length === 0 && (
        <p style={styles.vacio}>Sin fallas ni tickets de equipo registrados.</p>
      )}

      {tickets.length > 0 && (
        <div style={styles.historial}>
          <div style={styles.historialTitulo}>📋 Historial</div>
          <div style={styles.lista}>
            {tickets.map(t => (
              <TicketCard
                key={t.id} ticket={t} role={role} teamId={teamId} bloqueado={procesando}
                onDespachar={handleDespachar}
                onEnviarReemplazo={handleEnviarReemplazo}
                onConfirmarRecepcion={handleConfirmarRecepcion}
                onEliminar={handleEliminar}
              />
            ))}
          </div>
        </div>
      )}

      {fallaModal && (
        <ModalSolicitarBaja falla={fallaModal} procesando={procesando} onConfirmar={handleSolicitarBaja}
          onCerrar={() => !procesando && setFallaModal(null)} />
      )}
    </div>
  )
}

const styles = {
  titulo:          { color: 'var(--gl-text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' },
  pendientesBox:   { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-fault)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' },
  pendientesTitulo:{ color: 'var(--gl-fault)', fontSize: '11px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  penItem:         { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' },
  penTipo:         { fontSize: '10px', fontWeight: '700', background: 'var(--gl-bg-elevated)', borderRadius: '4px', padding: '1px 5px', color: 'var(--gl-text-muted)' },
  penNombre:       { color: 'var(--gl-text-primary)', fontSize: '11px', flex: 1 },
  btnSolicitar:    { background: 'var(--gl-fault)', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  vacio:           { color: 'var(--gl-text-muted)', fontSize: '13px' },
  historial:       { marginTop: '4px' },
  historialTitulo: { color: 'var(--gl-text-muted)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' },
  lista:           { display: 'flex', flexDirection: 'column', gap: '8px' },
  tCard:           { background: 'var(--gl-fault-tint)', border: '1px solid var(--gl-fault)', borderRadius: '8px', overflow: 'hidden' },
  tHeader:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', userSelect: 'none' },
  tHeaderIzq:      { display: 'flex', alignItems: 'center', gap: '8px' },
  tBadge:          { fontSize: '11px', fontWeight: '700', borderRadius: '5px', padding: '2px 8px', color: 'var(--gl-fault)', background: 'var(--gl-bg-elevated)' },
  tFecha:          { color: 'var(--gl-text-muted)', fontSize: '10px' },
  chevron:         { color: 'var(--gl-text-muted)', fontSize: '10px' },
  tBody:           { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--gl-fault)' },
  tItem:           { display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--gl-bg-elevated)', borderRadius: '5px', padding: '4px 8px' },
  tItemTipo:       { fontSize: '9px', fontWeight: '700', background: 'var(--gl-bg-input)', borderRadius: '3px', padding: '1px 4px', color: 'var(--gl-fault)', whiteSpace: 'nowrap' },
  tItemNombre:     { color: 'var(--gl-text-primary)', fontSize: '11px', flex: 1 },
  obsBox:          { background: 'var(--gl-bg-elevated)', borderRadius: '6px', padding: '6px 8px' },
  obsLabel:        { color: 'var(--gl-text-muted)', fontSize: '10px', display: 'block', marginBottom: '2px' },
  obsTexto:        { color: 'var(--gl-text-primary)', fontSize: '11px' },
  tAcciones:       { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  btnAccionRojo:   { background: 'var(--gl-fault)', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  btnEliminar:     { background: 'transparent', border: '1px solid var(--gl-fault)', color: 'var(--gl-fault)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' },
  modalOverlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal:           { background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-fault)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '380px', maxHeight: '85vh', overflowY: 'auto' },
  modalTitulo:     { color: 'var(--gl-text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '4px' },
  modalSubtitulo:  { color: 'var(--gl-text-secondary)', fontSize: '12px', marginBottom: '12px', fontWeight: '600' },
  modalHint:       { color: 'var(--gl-text-muted)', fontSize: '11px', marginTop: '10px' },
  razonBox:        { background: 'var(--gl-bg-input)', borderRadius: '8px', padding: '8px 10px' },
  razonTexto:      { color: 'var(--gl-text-primary)', fontSize: '12px', margin: '2px 0 0' },
  label:           { color: 'var(--gl-text-secondary)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' },
  textarea:        { width: '100%', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: '8px', color: 'var(--gl-text-primary)', fontSize: '13px', padding: '8px', outline: 'none', resize: 'none', boxSizing: 'border-box' },
  modalBtns:       { display: 'flex', gap: '10px', marginTop: '16px' },
  btnCancelar:     { flex: 1, background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-text-secondary)', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px' },
  btnConfirmarRojo:{ flex: 1, background: 'var(--gl-fault)', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
}
