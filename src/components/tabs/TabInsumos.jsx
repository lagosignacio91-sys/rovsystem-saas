import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'

function ModalAgregar({ onGuardar, onCerrar }) {
  const [nombre,   setNombre]   = useState('')
  const [cantidad, setCantidad] = useState(1)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    onGuardar({ nombre, cantidad: Number(cantidad), solicitado: false, cantidadSolicitada: 0 })
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitulo}>Agregar Insumo</h3>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Nombre</label>
          <input style={styles.input} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Fusibles 5A" autoFocus required />
          <label style={{ ...styles.label, marginTop: '12px' }}>Cantidad actual</label>
          <input style={styles.input} type="number" min={0} value={cantidad} onChange={e => setCantidad(e.target.value)} />
          <div style={styles.modalBtns}>
            <button type="button" onClick={onCerrar}  style={styles.btnCancelar}>Cancelar</button>
            <button type="submit"                      style={styles.btnConfirmar}>Agregar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalSolicitar({ nombre, onConfirmar, onCerrar }) {
  const [cantidad, setCantidad] = useState(1)
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitulo}>Solicitar — {nombre}</h3>
        <p style={styles.modalSub}>Tienes stock. ¿Cuántas unidades adicionales necesitas?</p>
        <label style={styles.label}>Cantidad a solicitar</label>
        <input style={styles.input} type="number" min={1} value={cantidad} onChange={e => setCantidad(e.target.value)} autoFocus />
        <div style={styles.modalBtns}>
          <button onClick={onCerrar}                      style={styles.btnCancelar}>Cancelar</button>
          <button onClick={() => onConfirmar(Number(cantidad))} style={styles.btnConfirmar}>Solicitar</button>
        </div>
      </div>
    </div>
  )
}

function InsumoItem({ i, role, onSolicitar, onQuitarSolicitud, onActualizarCantidad, onEliminar }) {
  const [abierto, setAbierto]       = useState(false)
  const [modalSolicitar, setModalSolicitar] = useState(false)
  const sinStock    = i.cantidad === 0
  const solicitado  = i.solicitado || sinStock

  return (
    <div style={{ ...styles.card, borderColor: sinStock ? 'var(--gl-fault)' : i.solicitado ? 'var(--gl-low)' : 'var(--gl-border)' }}>
      <div style={styles.acordeonHeader} onClick={() => setAbierto(!abierto)}>
        <div style={styles.acordeonIzq}>
          <span style={styles.itemNombre}>{i.nombre}</span>
          <span style={{ ...styles.cantBadge, color: sinStock ? 'var(--gl-fault)' : 'var(--gl-text-secondary)' }}>
            {sinStock ? '⚠️ Sin stock' : `Cant: ${i.cantidad}`}
          </span>
        </div>
        <div style={styles.acordeonDer}>
          {solicitado && (
            <span style={styles.solicitadoBadge}>
              📦 {sinStock ? 'Solicitado (sin stock)' : `Solicitado ×${i.cantidadSolicitada}`}
            </span>
          )}
          <span style={styles.chevron}>{abierto ? '▲' : '▼'}</span>
        </div>
      </div>

      {abierto && (
        <div style={styles.itemBody}>
          <div style={styles.itemRow}>
            <span style={styles.campoLabel}>Cantidad en stock</span>
            {(role === 'admin' || role === 'operador') ? (
              <input
                type="number" min={0} value={i.cantidad}
                onChange={e => onActualizarCantidad(i.id, e.target.value)}
                style={styles.inputCantidad}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span style={{ color: sinStock ? 'var(--gl-fault)' : 'var(--gl-text-primary)', fontSize: '12px', fontWeight: '600' }}>{i.cantidad}</span>
            )}
          </div>

          {sinStock && (
            <div style={styles.autoSolBox}>
              <span style={styles.autoSolTexto}>⚠️ Solicitado automáticamente por stock en cero</span>
            </div>
          )}

          <div style={styles.acciones}>
            {!sinStock && !i.solicitado && (
              <button onClick={() => setModalSolicitar(true)} style={styles.btnSolicitar}>
                📦 Solicitar más
              </button>
            )}
            {!sinStock && i.solicitado && (
              <button onClick={() => onQuitarSolicitud(i.id)} style={styles.btnQuitarSol}>
                ✕ Quitar solicitud
              </button>
            )}
            {(role === 'admin' || role === 'operador') && (
              <button onClick={() => onEliminar(i.id)} style={styles.btnEliminar}>🗑️ Eliminar</button>
            )}
          </div>
        </div>
      )}

      {modalSolicitar && (
        <ModalSolicitar
          nombre={i.nombre}
          onConfirmar={(cant) => { onSolicitar(i.id, cant); setModalSolicitar(false) }}
          onCerrar={() => setModalSolicitar(false)}
        />
      )}
    </div>
  )
}

export default function TabInsumos({ centro, role, sincronizarEstado }) {
  const [insumos, setInsumos]           = useState([])
  const [cargando, setCargando]         = useState(true)
  const [modalAgregar, setModalAgregar] = useState(false)

  useEffect(() => {
    const ref   = doc(db, 'centros', centro.id, 'datos', 'insumos')
    const unsub = onSnapshot(ref, async (snap) => {
      const lista = snap.exists() ? (snap.data().lista ?? []) : []
      // Auto-marcar solicitado si cantidad es 0
      const listaActualizada = lista.map(i => ({
        ...i,
        solicitado: i.cantidad === 0 ? true : i.solicitado,
      }))
      setInsumos(listaActualizada)
      setCargando(false)
      if (sincronizarEstado) await sincronizarEstado(centro.id)
    })
    return () => unsub()
  }, [centro.id])

  const guardar = async (lista) => {
    const ref = doc(db, 'centros', centro.id, 'datos', 'insumos')
    await setDoc(ref, { lista })
  }

  const agregar = (item) => { guardar([...insumos, { ...item, id: Date.now() }]); setModalAgregar(false) }

  const solicitar = (id, cantidadSolicitada) => {
    guardar(insumos.map(i => i.id === id ? { ...i, solicitado: true, cantidadSolicitada } : i))
  }

  const quitarSolicitud = (id) => {
    guardar(insumos.map(i => i.id === id ? { ...i, solicitado: false, cantidadSolicitada: 0 } : i))
  }

  const eliminar           = (id) => guardar(insumos.filter(i => i.id !== id))
  const actualizarCantidad = (id, cantidad) => {
    guardar(insumos.map(i => i.id === id ? {
      ...i,
      cantidad: Number(cantidad),
      solicitado: Number(cantidad) === 0 ? true : i.solicitado,
    } : i))
  }

  if (cargando) return <p style={{ color: 'var(--gl-text-muted)', fontSize: '13px' }}>Cargando...</p>

  return (
    <div>
      <div style={styles.topBar}>
        <h3 style={styles.titulo}>Insumos</h3>
        {(role === 'admin' || role === 'operador') && <button onClick={() => setModalAgregar(true)} style={styles.btnAgregar}>+ Agregar</button>}
      </div>
      {insumos.length === 0 && <p style={styles.vacio}>Sin insumos registrados.</p>}
      <div style={styles.lista}>
        {insumos.map(i => (
          <InsumoItem
            key={i.id} i={i} role={role}
            onSolicitar={solicitar}
            onQuitarSolicitud={quitarSolicitud}
            onActualizarCantidad={actualizarCantidad}
            onEliminar={eliminar}
          />
        ))}
      </div>
      {modalAgregar && <ModalAgregar onGuardar={agregar} onCerrar={() => setModalAgregar(false)} />}
    </div>
  )
}

const styles = {
  topBar:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  titulo:         { color: 'var(--gl-text-primary)', fontSize: '14px', fontWeight: '600' },
  btnAgregar:     { background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  vacio:          { color: 'var(--gl-text-muted)', fontSize: '13px' },
  lista:          { display: 'flex', flexDirection: 'column', gap: '6px' },
  card:           { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: '8px', overflow: 'hidden' },
  acordeonHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--gl-bg-elevated)' },
  acordeonIzq:    { display: 'flex', flexDirection: 'column', gap: '2px' },
  acordeonDer:    { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' },
  itemNombre:     { color: 'var(--gl-text-primary)', fontSize: '12px', fontWeight: '600' },
  cantBadge:      { fontSize: '10px', fontWeight: '500' },
  solicitadoBadge:{ background: 'var(--gl-brand-strong)', color: '#fff', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: '600' },
  chevron:        { color: 'var(--gl-text-muted)', fontSize: '10px' },
  itemBody:       { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--gl-border)' },
  itemRow:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  campoLabel:     { color: 'var(--gl-text-muted)', fontSize: '11px' },
  inputCantidad:  { width: '60px', background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: '4px', color: 'var(--gl-text-primary)', fontSize: '12px', padding: '3px 6px', outline: 'none' },
  autoSolBox:     { background: 'var(--gl-low-tint)', borderRadius: '6px', padding: '5px 8px' },
  autoSolTexto:   { color: 'var(--gl-low)', fontSize: '10px', fontWeight: '500' },
  acciones:       { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  btnSolicitar:   { background: 'var(--gl-border)', border: '1px solid var(--gl-dispatch)', color: 'var(--gl-brand-soft)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  btnQuitarSol:   { background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-text-secondary)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '11px' },
  btnEliminar:    { background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-fault)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '11px' },
  modalOverlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal:          { background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '360px' },
  modalTitulo:    { color: 'var(--gl-text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '8px' },
  modalSub:       { color: 'var(--gl-text-muted)', fontSize: '12px', marginBottom: '16px' },
  label:          { color: 'var(--gl-text-secondary)', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' },
  input:          { width: '100%', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: '8px', color: 'var(--gl-text-primary)', fontSize: '14px', padding: '10px', outline: 'none', boxSizing: 'border-box' },
  modalBtns:      { display: 'flex', gap: '12px', marginTop: '20px' },
  btnCancelar:    { flex: 1, background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-text-secondary)', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px' },
  btnConfirmar:   { flex: 1, background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
}