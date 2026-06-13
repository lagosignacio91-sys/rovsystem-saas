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
        <h3 style={styles.modalTitulo}>Agregar Herramienta</h3>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Nombre</label>
          <input style={styles.input} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Llave Stilson" autoFocus required />
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
          <button onClick={onCerrar}                           style={styles.btnCancelar}>Cancelar</button>
          <button onClick={() => onConfirmar(Number(cantidad))} style={styles.btnConfirmar}>Solicitar</button>
        </div>
      </div>
    </div>
  )
}

function HerramientaItem({ h, role, onSolicitar, onQuitarSolicitud, onActualizarCantidad, onEliminar }) {
  const [abierto, setAbierto]               = useState(false)
  const [modalSolicitar, setModalSolicitar] = useState(false)
  const sinStock   = h.cantidad === 0
  const solicitado = h.solicitado || sinStock

  return (
    <div style={{ ...styles.card, borderColor: sinStock ? '#ef4444' : h.solicitado ? '#eab308' : '#334155' }}>
      <div style={styles.acordeonHeader} onClick={() => setAbierto(!abierto)}>
        <div style={styles.acordeonIzq}>
          <span style={styles.itemNombre}>{h.nombre}</span>
          <span style={{ ...styles.cantBadge, color: sinStock ? '#f87171' : '#94a3b8' }}>
            {sinStock ? '⚠️ Sin stock' : `Cant: ${h.cantidad}`}
          </span>
        </div>
        <div style={styles.acordeonDer}>
          {solicitado && (
            <span style={styles.solicitadoBadge}>
              📋 {sinStock ? 'Solicitado (sin stock)' : `Solicitado ×${h.cantidadSolicitada}`}
            </span>
          )}
          <span style={styles.chevron}>{abierto ? '▲' : '▼'}</span>
        </div>
      </div>

      {abierto && (
        <div style={styles.itemBody}>
          <div style={styles.itemRow}>
            <span style={styles.campoLabel}>Cantidad en stock</span>
            {role === 'admin' ? (
              <input
                type="number" min={0} value={h.cantidad}
                onChange={e => onActualizarCantidad(h.id, e.target.value)}
                style={styles.inputCantidad}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span style={{ color: sinStock ? '#ef4444' : '#f1f5f9', fontSize: '12px', fontWeight: '600' }}>{h.cantidad}</span>
            )}
          </div>

          {sinStock && (
            <div style={styles.autoSolBox}>
              <span style={styles.autoSolTexto}>⚠️ Solicitado automáticamente por stock en cero</span>
            </div>
          )}

          <div style={styles.acciones}>
            {!sinStock && !h.solicitado && (
              <button onClick={() => setModalSolicitar(true)} style={styles.btnSolicitar}>
                📋 Solicitar más
              </button>
            )}
            {!sinStock && h.solicitado && (
              <button onClick={() => onQuitarSolicitud(h.id)} style={styles.btnQuitarSol}>
                ✕ Quitar solicitud
              </button>
            )}
            {role === 'admin' && (
              <button onClick={() => onEliminar(h.id)} style={styles.btnEliminar}>🗑️ Eliminar</button>
            )}
          </div>
        </div>
      )}

      {modalSolicitar && (
        <ModalSolicitar
          nombre={h.nombre}
          onConfirmar={(cant) => { onSolicitar(h.id, cant); setModalSolicitar(false) }}
          onCerrar={() => setModalSolicitar(false)}
        />
      )}
    </div>
  )
}

export default function TabHerramientas({ centro, role, sincronizarEstado }) {
  const [herramientas, setHerramientas] = useState([])
  const [cargando, setCargando]         = useState(true)
  const [modalAgregar, setModalAgregar] = useState(false)

  useEffect(() => {
    const ref   = doc(db, 'centros', centro.id, 'datos', 'herramientas')
    const unsub = onSnapshot(ref, async (snap) => {
      const lista = snap.exists() ? (snap.data().lista ?? []) : []
      const listaActualizada = lista.map(h => ({
        ...h,
        solicitado: h.cantidad === 0 ? true : h.solicitado,
      }))
      setHerramientas(listaActualizada)
      setCargando(false)
      if (sincronizarEstado) await sincronizarEstado(centro.id)
    })
    return () => unsub()
  }, [centro.id])

  const guardar = async (lista) => {
    const ref = doc(db, 'centros', centro.id, 'datos', 'herramientas')
    await setDoc(ref, { lista })
  }

  const agregar = (item) => { guardar([...herramientas, { ...item, id: Date.now() }]); setModalAgregar(false) }

  const solicitar = (id, cantidadSolicitada) => {
    guardar(herramientas.map(h => h.id === id ? { ...h, solicitado: true, cantidadSolicitada } : h))
  }

  const quitarSolicitud = (id) => {
    guardar(herramientas.map(h => h.id === id ? { ...h, solicitado: false, cantidadSolicitada: 0 } : h))
  }

  const eliminar = (id) => guardar(herramientas.filter(h => h.id !== id))

  const actualizarCantidad = (id, cantidad) => {
    guardar(herramientas.map(h => h.id === id ? {
      ...h,
      cantidad: Number(cantidad),
      solicitado: Number(cantidad) === 0 ? true : h.solicitado,
    } : h))
  }

  if (cargando) return <p style={{ color: '#64748b', fontSize: '13px' }}>Cargando...</p>

  return (
    <div>
      <div style={styles.topBar}>
        <h3 style={styles.titulo}>Herramientas</h3>
        {role === 'admin' && <button onClick={() => setModalAgregar(true)} style={styles.btnAgregar}>+ Agregar</button>}
      </div>
      {herramientas.length === 0 && <p style={styles.vacio}>Sin herramientas registradas.</p>}
      <div style={styles.lista}>
        {herramientas.map(h => (
          <HerramientaItem
            key={h.id} h={h} role={role}
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
  titulo:         { color: '#f1f5f9', fontSize: '14px', fontWeight: '600' },
  btnAgregar:     { background: '#2563eb', border: 'none', color: '#fff', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  vacio:          { color: '#475569', fontSize: '13px' },
  lista:          { display: 'flex', flexDirection: 'column', gap: '6px' },
  card:           { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' },
  acordeonHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', userSelect: 'none', background: '#1e293b' },
  acordeonIzq:    { display: 'flex', flexDirection: 'column', gap: '2px' },
  acordeonDer:    { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' },
  itemNombre:     { color: '#f1f5f9', fontSize: '12px', fontWeight: '600' },
  cantBadge:      { fontSize: '10px', fontWeight: '500' },
  solicitadoBadge:{ background: '#1d4ed8', color: '#fff', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: '600' },
  chevron:        { color: '#64748b', fontSize: '10px' },
  itemBody:       { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #334155' },
  itemRow:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  campoLabel:     { color: '#64748b', fontSize: '11px' },
  inputCantidad:  { width: '60px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f1f5f9', fontSize: '12px', padding: '3px 6px', outline: 'none' },
  autoSolBox:     { background: '#422006', borderRadius: '6px', padding: '5px 8px' },
  autoSolTexto:   { color: '#fde68a', fontSize: '10px', fontWeight: '500' },
  acciones:       { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  btnSolicitar:   { background: '#1e3a5f', border: '1px solid #3b82f6', color: '#93c5fd', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  btnQuitarSol:   { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '11px' },
  btnEliminar:    { background: 'transparent', border: '1px solid #334155', color: '#f87171', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '11px' },
  modalOverlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal:          { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '360px' },
  modalTitulo:    { color: '#f1f5f9', fontSize: '16px', fontWeight: '700', marginBottom: '8px' },
  modalSub:       { color: '#64748b', fontSize: '12px', marginBottom: '16px' },
  label:          { color: '#94a3b8', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' },
  input:          { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', padding: '10px', outline: 'none', boxSizing: 'border-box' },
  modalBtns:      { display: 'flex', gap: '12px', marginTop: '20px' },
  btnCancelar:    { flex: 1, background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px' },
  btnConfirmar:   { flex: 1, background: '#2563eb', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
}