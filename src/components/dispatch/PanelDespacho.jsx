import { useState } from 'react'
import { useDespachos } from '../../hooks/useDespachos'
import { claveItem, normalizarItemsLegacy } from '../../lib/despachos'
import { esCentroApertura } from '../../lib/kitScope'
import PanelEquipoTickets from './PanelEquipoTickets'

function origenLabel(i) {
  if (i.origen === 'estuche') return i.equipo === 'backup' ? 'Estuche · Backup' : 'Estuche · Principal'
  return 'Caja'
}

function ModalSeleccionItems({ items, procesando, onConfirmar, onCerrar }) {
  const [seleccionados, setSeleccionados] = useState(
    items.reduce((acc, i) => ({
      ...acc,
      [claveItem(i)]: { checked: true, cantidad: 1, enviarAhora: true },
    }), {})
  )

  const toggleItem = (key) => {
    setSeleccionados(prev => ({ ...prev, [key]: { ...prev[key], checked: !prev[key].checked } }))
  }
  const setCantidad = (key, val) => {
    setSeleccionados(prev => ({ ...prev, [key]: { ...prev[key], cantidad: Number(val) } }))
  }
  const toggleEnviarAhora = (key) => {
    setSeleccionados(prev => ({ ...prev, [key]: { ...prev[key], enviarAhora: !prev[key].enviarAhora } }))
  }

  const handleConfirmar = () => {
    const itemsSeleccionados = items
      .filter(i => seleccionados[claveItem(i)]?.checked)
      .map(i => ({
        ...i,
        cantidad: seleccionados[claveItem(i)]?.cantidad ?? 1,
        estadoItem: seleccionados[claveItem(i)]?.enviarAhora ? 'enviado' : 'pendiente',
      }))
    if (itemsSeleccionados.length === 0) { alert('Selecciona al menos un ítem.'); return }
    onConfirmar(itemsSeleccionados)
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitulo}>📦 Generar Despacho</h3>
        <p style={styles.modalSubtitulo}>Elige qué enviar, la cantidad, y si va ahora o queda pendiente.</p>
        <div style={styles.itemsLista}>
          {items.map(i => {
            const key = claveItem(i)
            const sel = seleccionados[key]
            return (
              <div key={key} style={{ ...styles.itemRow, opacity: sel?.checked ? 1 : 0.4 }}>
                <input
                  type="checkbox"
                  checked={sel?.checked ?? true}
                  onChange={() => toggleItem(key)}
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                />
                <div style={styles.itemInfo}>
                  <span style={styles.itemTipoBadge}>{origenLabel(i)}</span>
                  <span style={styles.itemNombre}>{i.nombre}</span>
                </div>
                <div style={styles.itemCantBox}>
                  <span style={styles.itemCantLabel}>Cant.</span>
                  <input
                    type="number" min={1}
                    value={sel?.cantidad ?? 1}
                    onChange={e => setCantidad(key, e.target.value)}
                    style={styles.inputCant}
                    disabled={!sel?.checked}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => toggleEnviarAhora(key)}
                  disabled={!sel?.checked}
                  style={{
                    ...styles.btnToggleEnvio,
                    color: sel?.enviarAhora ? 'var(--gl-ok)' : 'var(--gl-low)',
                    background: sel?.enviarAhora ? 'var(--gl-ok-tint)' : 'var(--gl-low-tint)',
                  }}
                >
                  {sel?.enviarAhora ? '🚚 Ahora' : '⏳ Pendiente'}
                </button>
              </div>
            )
          })}
        </div>
        <div style={styles.modalBtns}>
          <button onClick={onCerrar}        disabled={procesando} style={styles.btnCancelar}>Cancelar</button>
          <button onClick={handleConfirmar} disabled={procesando} style={{ ...styles.btnConfirmar, opacity: procesando ? 0.6 : 1 }}>
            {procesando ? 'Generando...' : 'Generar despacho'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalRecepcion({ items, procesando, onConfirmar, onCerrar }) {
  const [observacion, setObservacion] = useState('')
  const [marcados, setMarcados] = useState(() =>
    items.reduce((acc, i) => ({ ...acc, [claveItem(i)]: true }), {})
  )

  const toggle = (key) => setMarcados(prev => ({ ...prev, [key]: !prev[key] }))

  const handleConfirmar = () => {
    const keys = items.filter(i => marcados[claveItem(i)]).map(claveItem)
    if (keys.length === 0) { alert('Selecciona al menos un ítem recibido.'); return }
    onConfirmar(keys, observacion)
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitulo}>✅ Confirmar Recepción</h3>
        <p style={styles.modalSubtitulo}>Marca los ítems que llegaron.</p>
        <div style={styles.itemsLista}>
          {items.map(i => {
            const key = claveItem(i)
            return (
              <label key={key} style={{ ...styles.itemRow, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={marcados[key] ?? true}
                  onChange={() => toggle(key)}
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                />
                <div style={styles.itemInfo}>
                  <span style={styles.itemTipoBadge}>{origenLabel(i)}</span>
                  <span style={styles.itemNombre}>{i.nombre} ×{i.cantidad}</span>
                </div>
              </label>
            )
          })}
        </div>
        <label style={styles.label}>Observación</label>
        <textarea style={styles.textarea} value={observacion} onChange={e => setObservacion(e.target.value)}
          placeholder="Ej: Se recibió todo, faltó 1..." rows={3} />
        <div style={styles.modalBtns}>
          <button onClick={onCerrar}        disabled={procesando} style={styles.btnCancelar}>Cancelar</button>
          <button onClick={handleConfirmar} disabled={procesando} style={{ ...styles.btnConfirmar, opacity: procesando ? 0.6 : 1 }}>
            {procesando ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ESTADO_ITEM_LABEL = { pendiente: '⏳ Pendiente', enviado: '🚚 En camino', recibido: '✅ Recibido' }

function DespachoCard({ d, role, bloqueado, onEnviarPendientes, onConfirmarRecepcion, onEliminar, onCopiarWhatsapp }) {
  const [abierto, setAbierto]   = useState(true)
  const [modalRec, setModalRec] = useState(false)

  const items = normalizarItemsLegacy(d)
  const pendientesItems = items.filter(i => i.estadoItem === 'pendiente')
  const enviadosItems   = items.filter(i => i.estadoItem === 'enviado')

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
          {items.length > 0 && (
            <div style={styles.seccion}>
              <div style={styles.seccionTitulo}>📋 Ítems</div>
              {items.map((item, i) => (
                <div key={i} style={styles.dItem}>
                  <span style={styles.dItemTipo}>{ESTADO_ITEM_LABEL[item.estadoItem] ?? item.estadoItem}</span>
                  <span style={styles.dItemNombre}>{item.nombre}</span>
                  <span style={styles.dItemCant}>×{item.cantidad}</span>
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
            {d.recibidoEn && <span style={styles.fechaItem}>✅ Última recepción: {new Date(d.recibidoEn).toLocaleDateString('es-CL')}</span>}
          </div>

          <div style={styles.dAcciones}>
            <button onClick={() => onCopiarWhatsapp(d)} style={styles.btnWhatsapp}>📋 WhatsApp</button>
            {(role === 'admin' || role === 'supervisor') && !bloqueado && pendientesItems.length > 0 && (
              <button onClick={() => onEnviarPendientes(d.id, pendientesItems.map(claveItem))} style={styles.btnEnviado}>
                🚚 Enviar pendientes ({pendientesItems.length})
              </button>
            )}
            {(role === 'admin' || role === 'operador') && !bloqueado && enviadosItems.length > 0 && (
              <button onClick={() => setModalRec(true)} style={styles.btnRecibido}>
                ✅ Confirmar recepción ({enviadosItems.length})
              </button>
            )}
            {(role === 'admin' || role === 'supervisor') && !bloqueado && (
              <button onClick={() => onEliminar(d.id)} style={styles.btnEliminar}>🗑️</button>
            )}
          </div>
        </div>
      )}

      {modalRec && (
        <ModalRecepcion
          items={enviadosItems}
          procesando={bloqueado}
          onConfirmar={async (itemKeys, obs) => { await onConfirmarRecepcion(d.id, itemKeys, obs); setModalRec(false) }}
          onCerrar={() => !bloqueado && setModalRec(false)}
        />
      )}
    </div>
  )
}

export default function PanelDespacho({ centro, role, teamId, sincronizarEstado }) {
  const { despachos, itemsPendientes, cargando, crearDespacho, enviarItemsPendientes, confirmarRecepcion, eliminarDespacho } = useDespachos(centro, teamId)
  const [modalItems, setModalItems] = useState(false)
  // Bloquea las acciones del panel mientras una escritura está en curso, para que un
  // doble clic no pueda generar dos despachos o repetir la misma acción.
  const [procesando, setProcesando] = useState(false)

  const handleGenerarDespacho = async (itemsSeleccionados) => {
    if (procesando) return
    setProcesando(true)
    try {
      await crearDespacho({ centroId: centro.id, centroNombre: centro.nombre, items: itemsSeleccionados, teamAsignado: centro.teamAsignado ?? null })
      setModalItems(false)
    } catch (e) {
      console.error('[PanelDespacho/generarDespacho]', e)
      alert('No se pudo generar el despacho. Intenta de nuevo.')
    } finally {
      setProcesando(false)
    }
  }

  const handleEnviarPendientes = async (id, itemKeys) => {
    if (procesando) return
    setProcesando(true)
    try {
      await enviarItemsPendientes(id, itemKeys)
      if (sincronizarEstado && !esCentroApertura(centro)) await sincronizarEstado(centro.id)
    } catch (e) {
      console.error('[PanelDespacho/enviarPendientes]', e)
      alert('No se pudo marcar como enviado. Intenta de nuevo.')
    } finally {
      setProcesando(false)
    }
  }

  const handleConfirmarRecepcion = async (id, itemKeys, observacion) => {
    if (procesando) return
    setProcesando(true)
    try {
      await confirmarRecepcion(id, itemKeys, observacion)
      if (sincronizarEstado && !esCentroApertura(centro)) await sincronizarEstado(centro.id)
    } catch (e) {
      console.error('[PanelDespacho/confirmarRecepcion]', e)
      alert('No se pudo confirmar la recepción. Intenta de nuevo.')
    } finally {
      setProcesando(false)
    }
  }

  const handleEliminar = async (id) => {
    if (procesando) return
    if (window.confirm('¿Eliminar este despacho?')) {
      setProcesando(true)
      try {
        await eliminarDespacho(id)
      } finally {
        setProcesando(false)
      }
    }
  }

  const copiarWhatsapp = (d) => {
    const items  = normalizarItemsLegacy(d)
    const lineas = items.map(i => `• ${i.nombre} — Cant: ${i.cantidad}`).join('\n')
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
              if (procesando) return
              if (itemsPendientes.length === 0) { alert('No hay herramientas marcadas como falta en este centro.'); return }
              setModalItems(true)
            }}
            disabled={procesando}
            style={{ ...styles.btnGenerar, opacity: procesando ? 0.6 : 1 }}
          >
            + Generar despacho
          </button>
        )}
      </div>

      {itemsPendientes.length > 0 && (
        <div style={styles.pendientesBox}>
          <div style={styles.pendientesTitulo}>⚠️ Faltantes sin despachar ({itemsPendientes.length})</div>
          {itemsPendientes.map((i) => (
            <div key={claveItem(i)} style={styles.penItem}>
              <span style={styles.penTipo}>{origenLabel(i)}</span>
              <span style={styles.penNombre}>{i.nombre}</span>
            </div>
          ))}
        </div>
      )}

      {itemsPendientes.length === 0 && despachos.length === 0 && (
        <p style={styles.vacio}>Sin faltantes ni despachos registrados.</p>
      )}

      {despachos.length > 0 && (
        <div style={styles.historial}>
          <div style={styles.historialTitulo}>📋 Historial</div>
          <div style={styles.lista}>
            {despachos.map(d => (
              <DespachoCard
                key={d.id} d={d} role={role} bloqueado={procesando}
                onEnviarPendientes={handleEnviarPendientes}
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
          procesando={procesando}
          onConfirmar={handleGenerarDespacho}
          onCerrar={() => !procesando && setModalItems(false)}
        />
      )}

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--gl-border)' }}>
        <PanelEquipoTickets centro={centro} role={role} teamId={teamId} sincronizarEstado={sincronizarEstado} />
      </div>
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
  penTipo:         { fontSize: '10px', fontWeight: '700', background: 'var(--gl-bg-elevated)', borderRadius: '4px', padding: '1px 5px', color: 'var(--gl-text-muted)' },
  penNombre:       { color: 'var(--gl-text-primary)', fontSize: '11px', flex: 1 },
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
  dItemTipo:       { fontSize: '9px', fontWeight: '700', background: 'var(--gl-bg-input)', borderRadius: '3px', padding: '1px 4px', color: 'var(--gl-brand-soft)', whiteSpace: 'nowrap' },
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
  modal:           { background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px', maxHeight: '85vh', overflowY: 'auto' },
  modalTitulo:     { color: 'var(--gl-text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '4px' },
  modalSubtitulo:  { color: 'var(--gl-text-muted)', fontSize: '12px', marginBottom: '16px' },
  itemsLista:      { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  itemRow:         { display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--gl-bg-input)', borderRadius: '8px', padding: '8px 10px' },
  itemInfo:        { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 },
  itemTipoBadge:   { fontSize: '9px', fontWeight: '700', color: 'var(--gl-text-muted)', textTransform: 'uppercase' },
  itemNombre:      { color: 'var(--gl-text-primary)', fontSize: '12px', fontWeight: '500' },
  itemCantBox:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
  itemCantLabel:   { color: 'var(--gl-text-muted)', fontSize: '9px' },
  inputCant:       { width: '50px', background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: '4px', color: 'var(--gl-text-primary)', fontSize: '12px', padding: '3px 6px', outline: 'none', textAlign: 'center' },
  btnToggleEnvio:  { border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0 },
  label:           { color: 'var(--gl-text-secondary)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' },
  textarea:        { width: '100%', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: '8px', color: 'var(--gl-text-primary)', fontSize: '13px', padding: '8px', outline: 'none', resize: 'none', boxSizing: 'border-box' },
  modalBtns:       { display: 'flex', gap: '10px', marginTop: '16px' },
  btnCancelar:     { flex: 1, background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-text-secondary)', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px' },
  btnConfirmar:    { flex: 1, background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
}
