import { useState } from 'react'
import { useDespachos } from '../../hooks/useDespachos'

function ModalSeleccionItems({ items, onConfirmar, onCerrar }) {
  const [seleccionados, setSeleccionados] = useState(
    items.reduce((acc, i) => ({
      ...acc,
      [i.id]: { checked: true, cantidad: i.cantidad === 0 ? 1 : i.cantidadSolicitada ?? i.cantidad }
    }), {})
  )

  const toggleItem = (id) => {
    setSeleccionados(prev => ({ ...prev, [id]: { ...prev[id], checked: !prev[id].checked } }))
  }

  const setCantidad = (id, val) => {
    setSeleccionados(prev => ({ ...prev, [id]: { ...prev[id], cantidad: Number(val) } }))
  }

  const handleConfirmar = () => {
    const itemsSeleccionados = items
      .filter(i => seleccionados[i.id]?.checked)
      .map(i => ({ ...i, cantidadEnviada: seleccionados[i.id]?.cantidad ?? 1 }))
    if (itemsSeleccionados.length === 0) { alert('Selecciona al menos un ítem.'); return }
    onConfirmar(itemsSeleccionados)
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitulo}>📦 Generar Despacho</h3>
        <p style={styles.modalSubtitulo}>Selecciona qué se va a despachar y ajusta las cantidades.</p>
        <div style={styles.itemsLista}>
          {items.map(i => (
            <div key={i.id} style={{ ...styles.itemRow, opacity: seleccionados[i.id]?.checked ? 1 : 0.4 }}>
              <input
                type="checkbox"
                checked={seleccionados[i.id]?.checked ?? true}
                onChange={() => toggleItem(i.id)}
                style={{ cursor: 'pointer', flexShrink: 0 }}
              />
              <div style={styles.itemInfo}>
                <span style={styles.itemTipoBadge}>{i.tipo}</span>
                <span style={styles.itemNombre}>{i.nombre}</span>
                {i.cantidad === 0
                  ? <span style={styles.itemSinStock}>⚠️ Sin stock</span>
                  : <span style={styles.itemSolicitudExtra}>Solicitud extra</span>
                }
              </div>
              <div style={styles.itemCantBox}>
                <span style={styles.itemCantLabel}>Cant.</span>
                <input
                  type="number" min={1}
                  value={seleccionados[i.id]?.cantidad ?? 1}
                  onChange={e => setCantidad(i.id, e.target.value)}
                  style={styles.inputCant}
                  disabled={!seleccionados[i.id]?.checked}
                />
              </div>
            </div>
          ))}
        </div>
        <div style={styles.modalBtns}>
          <button onClick={onCerrar}        style={styles.btnCancelar}>Cancelar</button>
          <button onClick={handleConfirmar} style={styles.btnConfirmar}>Generar despacho</button>
        </div>
      </div>
    </div>
  )
}

function ModalRecepcion({ onConfirmar, onCerrar }) {
  const [observacion, setObservacion] = useState('')
  const [completo, setCompleto]       = useState(true)

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitulo}>✅ Confirmar Recepción</h3>
        <label style={styles.label}>Observación</label>
        <textarea style={styles.textarea} value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Ej: Se recibió todo, faltó 1 fusible..." rows={3} autoFocus />
        <div style={styles.checkRow}>
          <input type="checkbox" id="completo" checked={completo} onChange={e => setCompleto(e.target.checked)} style={{ cursor: 'pointer' }} />
          <label htmlFor="completo" style={styles.checkLabel}>Recepción completa</label>
        </div>
        <p style={styles.checkHint}>{completo ? '🟢 El centro quedará en estado OK' : '🟡 El centro seguirá en amarillo'}</p>
        <div style={styles.modalBtns}>
          <button onClick={onCerrar}                                style={styles.btnCancelar}>Cancelar</button>
          <button onClick={() => onConfirmar(observacion, completo)} style={styles.btnConfirmar}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}

function DespachoCard({ d, role, onMarcarEnviado, onConfirmarRecepcion, onEliminar, onCopiarWhatsapp }) {
  const [abierto, setAbierto]   = useState(true)
  const [modalRec, setModalRec] = useState(false)

  const BADGE = {
    pendiente: { label: '🟡 Pendiente',        color: 'var(--gl-low)', bg: 'var(--gl-low-tint)' },
    enviado:   { label: '🔵 En camino',         color: 'var(--gl-dispatch)', bg: 'var(--gl-border)' },
    parcial:   { label: '🟡 Recepción parcial', color: 'var(--gl-low)', bg: 'var(--gl-low-tint)' },
    recibido:  { label: '🟢 Recibido',          color: 'var(--gl-ok)', bg: 'var(--gl-ok-tint)' },
  }
  const badge = BADGE[d.estado] ?? { label: d.estado, color: 'var(--gl-text-muted)', bg: 'var(--gl-bg-elevated)' }

  return (
    <div style={styles.dCard}>
      <div style={styles.dHeader} onClick={() => setAbierto(!abierto)}>
        <div style={styles.dHeaderIzq}>
          <span style={{ ...styles.dBadge, color: badge.color, background: badge.bg }}>{badge.label}</span>
          <span style={styles.dFecha}>{new Date(d.creadoEn).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
        <span style={styles.chevron}>{abierto ? '▲' : '▼'}</span>
      </div>

      {abierto && (
        <div style={styles.dBody}>
          {d.items?.length > 0 && (
            <div style={styles.seccion}>
              <div style={styles.seccionTitulo}>📋 Ítems solicitados</div>
              {d.items.map((item, i) => (
                <div key={i} style={styles.dItem}>
                  <span style={{ ...styles.dItemTipo, color: item.tipo === 'Herramienta' ? 'var(--gl-brand-soft)' : '#86efac' }}>{item.tipo}</span>
                  <span style={styles.dItemNombre}>{item.nombre}</span>
                  <span style={styles.dItemCant}>×{item.cantidadEnviada ?? item.cantidad}</span>
                </div>
              ))}
            </div>
          )}

          {d.observacion && (
            <div style={styles.obsBox}>
              <span style={styles.obsLabel}>📝 Observación:</span>
              <span style={styles.obsTexto}>{d.observacion}</span>
            </div>
          )}

          <div style={styles.fechasBox}>
            {d.enviadoEn  && <span style={styles.fechaItem}>🚚 Enviado: {new Date(d.enviadoEn).toLocaleDateString('es-CL')}</span>}
            {d.recibidoEn && <span style={styles.fechaItem}>✅ Recibido: {new Date(d.recibidoEn).toLocaleDateString('es-CL')}</span>}
          </div>

          <div style={styles.dAcciones}>
            <button onClick={() => onCopiarWhatsapp(d)} style={styles.btnWhatsapp}>📋 WhatsApp</button>
            {(role === 'admin' || role === 'supervisor') && d.estado === 'pendiente' && (
              <button onClick={() => onMarcarEnviado(d.id, d.items)} style={styles.btnEnviado}>🚚 Marcar enviado</button>
            )}
            {(d.estado === 'enviado' || d.estado === 'parcial') && (
              <button onClick={() => setModalRec(true)} style={styles.btnRecibido}>✅ Recibido</button>
            )}
            {(role === 'admin' || role === 'supervisor') && (
              <button onClick={() => onEliminar(d.id)} style={styles.btnEliminar}>🗑️</button>
            )}
          </div>
        </div>
      )}

      {modalRec && (
        <ModalRecepcion
          onConfirmar={(obs, comp) => { onConfirmarRecepcion(d.id, obs, comp); setModalRec(false) }}
          onCerrar={() => setModalRec(false)}
        />
      )}
    </div>
  )
}

export default function PanelDespacho({ centro, role, sincronizarEstado }) {
  const { despachos, itemsPendientes, cargando, crearDespacho, marcarEnviado, confirmarRecepcion, eliminarDespacho } = useDespachos(centro.id)
  const [modalItems, setModalItems] = useState(false)

  const handleGenerarDespacho = async (itemsSeleccionados) => {
    await crearDespacho({ centroId: centro.id, centroNombre: centro.nombre, items: itemsSeleccionados })
    setModalItems(false)
  }

  const handleMarcarEnviado = async (id, items) => {
    await marcarEnviado(id, items)
    if (sincronizarEstado) await sincronizarEstado(centro.id)
  }

  const handleConfirmarRecepcion = async (id, observacion, completo) => {
    await confirmarRecepcion(id, observacion, completo)
    if (sincronizarEstado) await sincronizarEstado(centro.id)
  }

  const handleEliminar = async (id) => {
    if (window.confirm('¿Eliminar este despacho?')) await eliminarDespacho(id)
  }

  const copiarWhatsapp = (d) => {
    const lineas = d.items?.map(i => `• ${i.tipo}: ${i.nombre} — Cant: ${i.cantidadEnviada ?? i.cantidad}`).join('\n') ?? ''
    const texto  = `📦 *Despacho — ${centro.nombre}*\n📅 ${new Date(d.creadoEn).toLocaleDateString('es-CL')}\n\n${lineas}`
    navigator.clipboard.writeText(texto)
    alert('✅ Copiado. Pégalo en WhatsApp.')
  }

  if (cargando) return <p style={{ color: 'var(--gl-text-muted)', fontSize: '13px' }}>Cargando...</p>

  return (
    <div>
      <div style={styles.topBar}>
        <h3 style={styles.titulo}>Despachos</h3>
        {(role === 'admin' || role === 'supervisor') && (
          <button
            onClick={() => {
              if (itemsPendientes.length === 0) { alert('No hay insumos ni herramientas solicitados o en cero.'); return }
              setModalItems(true)
            }}
            style={styles.btnGenerar}
          >
            + Generar despacho
          </button>
        )}
      </div>

      {itemsPendientes.length > 0 && (
        <div style={styles.pendientesBox}>
          <div style={styles.pendientesTitulo}>⏳ Pendientes de despacho ({itemsPendientes.length})</div>
          {itemsPendientes.map((i, idx) => (
            <div key={idx} style={styles.penItem}>
              <span style={{ ...styles.penTipo, color: i.tipo === 'Herramienta' ? 'var(--gl-brand-soft)' : '#86efac' }}>{i.tipo}</span>
              <span style={styles.penNombre}>{i.nombre}</span>
              <span style={{ ...styles.penCant, color: i.cantidad === 0 ? 'var(--gl-fault)' : 'var(--gl-text-muted)' }}>
                {i.cantidad === 0 ? '⚠️ Sin stock' : `Solicitud extra ×${i.cantidadSolicitada}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {itemsPendientes.length === 0 && despachos.length === 0 && (
        <p style={styles.vacio}>Sin solicitudes ni despachos registrados.</p>
      )}

      {despachos.length > 0 && (
        <div style={styles.historial}>
          <div style={styles.historialTitulo}>📋 Historial</div>
          <div style={styles.lista}>
            {despachos.map(d => (
              <DespachoCard
                key={d.id} d={d} role={role}
                onMarcarEnviado={handleMarcarEnviado}
                onConfirmarRecepcion={handleConfirmarRecepcion}
                onEliminar={handleEliminar}
                onCopiarWhatsapp={copiarWhatsapp}
              />
            ))}
          </div>
        </div>
      )}

      {modalItems && (
        <ModalSeleccionItems
          items={itemsPendientes}
          onConfirmar={handleGenerarDespacho}
          onCerrar={() => setModalItems(false)}
        />
      )}
    </div>
  )
}

const styles = {
  topBar:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  titulo:          { color: 'var(--gl-text-primary)', fontSize: '14px', fontWeight: '600' },
  btnGenerar:      { background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  pendientesBox:   { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-low)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' },
  pendientesTitulo:{ color: 'var(--gl-low)', fontSize: '11px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  penItem:         { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
  penTipo:         { fontSize: '10px', fontWeight: '700', background: 'var(--gl-bg-elevated)', borderRadius: '4px', padding: '1px 5px' },
  penNombre:       { color: 'var(--gl-text-primary)', fontSize: '11px', flex: 1 },
  penCant:         { fontSize: '10px', fontWeight: '600' },
  vacio:           { color: 'var(--gl-text-muted)', fontSize: '13px' },
  historial:       { marginTop: '4px' },
  historialTitulo: { color: 'var(--gl-text-muted)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' },
  lista:           { display: 'flex', flexDirection: 'column', gap: '8px' },
  dCard:           { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: '8px', overflow: 'hidden' },
  dHeader:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', background: 'var(--gl-bg-elevated)', userSelect: 'none' },
  dHeaderIzq:      { display: 'flex', alignItems: 'center', gap: '8px' },
  dBadge:          { fontSize: '11px', fontWeight: '700', borderRadius: '5px', padding: '2px 8px' },
  dFecha:          { color: 'var(--gl-text-muted)', fontSize: '10px' },
  chevron:         { color: 'var(--gl-text-muted)', fontSize: '10px' },
  dBody:           { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--gl-border)' },
  seccion:         { display: 'flex', flexDirection: 'column', gap: '3px' },
  seccionTitulo:   { color: 'var(--gl-text-muted)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' },
  dItem:           { display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--gl-bg-elevated)', borderRadius: '5px', padding: '4px 8px' },
  dItemTipo:       { fontSize: '9px', fontWeight: '700', background: 'var(--gl-bg-input)', borderRadius: '3px', padding: '1px 4px' },
  dItemNombre:     { color: 'var(--gl-text-primary)', fontSize: '11px', flex: 1 },
  dItemCant:       { color: 'var(--gl-text-secondary)', fontSize: '11px', fontWeight: '600' },
  obsBox:          { background: 'var(--gl-bg-elevated)', borderRadius: '6px', padding: '6px 8px' },
  obsLabel:        { color: 'var(--gl-text-muted)', fontSize: '10px', display: 'block', marginBottom: '2px' },
  obsTexto:        { color: 'var(--gl-text-primary)', fontSize: '11px' },
  fechasBox:       { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  fechaItem:       { color: 'var(--gl-text-muted)', fontSize: '10px' },
  dAcciones:       { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  btnWhatsapp:     { background: 'var(--gl-ok-tint)', border: '1px solid var(--gl-ok)', color: '#86efac', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  btnEnviado:      { background: 'var(--gl-border)', border: '1px solid var(--gl-dispatch)', color: 'var(--gl-brand-soft)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  btnRecibido:     { background: 'var(--gl-ok-tint)', border: '1px solid var(--gl-ok)', color: '#86efac', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  btnEliminar:     { background: 'transparent', border: '1px solid var(--gl-fault)', color: 'var(--gl-fault)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' },
  modalOverlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal:           { background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '380px', maxHeight: '85vh', overflowY: 'auto' },
  modalTitulo:     { color: 'var(--gl-text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '4px' },
  modalSubtitulo:  { color: 'var(--gl-text-muted)', fontSize: '12px', marginBottom: '16px' },
  itemsLista:      { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  itemRow:         { display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--gl-bg-input)', borderRadius: '8px', padding: '8px 10px' },
  itemInfo:        { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
  itemTipoBadge:   { fontSize: '9px', fontWeight: '700', color: 'var(--gl-text-muted)', textTransform: 'uppercase' },
  itemNombre:      { color: 'var(--gl-text-primary)', fontSize: '12px', fontWeight: '500' },
  itemSinStock:    { color: 'var(--gl-fault)', fontSize: '10px', fontWeight: '600' },
  itemSolicitudExtra: { color: 'var(--gl-low)', fontSize: '10px', fontWeight: '600' },
  itemCantBox:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
  itemCantLabel:   { color: 'var(--gl-text-muted)', fontSize: '9px' },
  inputCant:       { width: '50px', background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: '4px', color: 'var(--gl-text-primary)', fontSize: '12px', padding: '3px 6px', outline: 'none', textAlign: 'center' },
  label:           { color: 'var(--gl-text-secondary)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' },
  textarea:        { width: '100%', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: '8px', color: 'var(--gl-text-primary)', fontSize: '13px', padding: '8px', outline: 'none', resize: 'none', boxSizing: 'border-box' },
  checkRow:        { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' },
  checkLabel:      { color: 'var(--gl-text-primary)', fontSize: '13px', cursor: 'pointer' },
  checkHint:       { color: 'var(--gl-text-muted)', fontSize: '11px', marginTop: '4px' },
  modalBtns:       { display: 'flex', gap: '10px', marginTop: '16px' },
  btnCancelar:     { flex: 1, background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-text-secondary)', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px' },
  btnConfirmar:    { flex: 1, background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
}