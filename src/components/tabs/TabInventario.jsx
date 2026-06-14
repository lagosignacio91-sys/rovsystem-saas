import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'

// ---- Modal compartido ----
function ModalAgregar({ tipo, onGuardar, onCerrar }) {
  const [nombre,   setNombre]   = useState('')
  const [cantidad, setCantidad] = useState(1)
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    onGuardar({ nombre, cantidad: Number(cantidad), solicitado: false, cantidadSolicitada: 0 })
  }
  return (
    <div style={s.modalOverlay}>
      <div style={s.modal}>
        <h3 style={s.modalTitulo}>Agregar {tipo === 'herramienta' ? 'Herramienta' : 'Insumo'}</h3>
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Nombre</label>
          <input style={s.input} value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder={tipo === 'herramienta' ? 'Ej: Llave Stilson' : 'Ej: Fusibles 5A'} autoFocus required />
          <label style={{ ...s.label, marginTop: 12 }}>Cantidad actual</label>
          <input style={s.input} type="number" min={0} value={cantidad} onChange={e => setCantidad(e.target.value)} />
          <div style={s.modalBtns}>
            <button type="button" onClick={onCerrar}  style={s.btnCancelar}>Cancelar</button>
            <button type="submit"                      style={s.btnConfirmar}>Agregar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalSolicitar({ nombre, icono, onConfirmar, onCerrar }) {
  const [cantidad, setCantidad] = useState(1)
  return (
    <div style={s.modalOverlay}>
      <div style={s.modal}>
        <h3 style={s.modalTitulo}>Solicitar — {nombre}</h3>
        <p style={s.modalSub}>Tienes stock. ¿Cuántas unidades adicionales necesitas?</p>
        <label style={s.label}>Cantidad a solicitar</label>
        <input style={s.input} type="number" min={1} value={cantidad} onChange={e => setCantidad(e.target.value)} autoFocus />
        <div style={s.modalBtns}>
          <button onClick={onCerrar}                            style={s.btnCancelar}>Cancelar</button>
          <button onClick={() => onConfirmar(Number(cantidad))} style={s.btnConfirmar}>Solicitar</button>
        </div>
      </div>
    </div>
  )
}

// ---- Item genérico (herramienta o insumo) ----
function ItemLista({ item, icono, role, onSolicitar, onQuitarSolicitud, onActualizarCantidad, onEliminar }) {
  const [abierto, setAbierto]           = useState(false)
  const [modalSolicitar, setModal]      = useState(false)
  const sinStock   = item.cantidad === 0
  const solicitado = item.solicitado || sinStock

  return (
    <div style={{ ...s.card, borderColor: sinStock ? 'var(--gl-fault)' : item.solicitado ? 'var(--gl-low)' : 'var(--gl-border)' }}>
      <div style={s.acordeonHeader} onClick={() => setAbierto(!abierto)}>
        <div style={s.acordeonIzq}>
          <span style={s.itemNombre}>{item.nombre}</span>
          <span style={{ ...s.cantBadge, color: sinStock ? 'var(--gl-fault)' : 'var(--gl-text-secondary)' }}>
            {sinStock ? '⚠️ Sin stock' : `Cant: ${item.cantidad}`}
          </span>
        </div>
        <div style={s.acordeonDer}>
          {solicitado && (
            <span style={s.solBadge}>
              {icono} {sinStock ? 'Solicitado (sin stock)' : `Solicitado ×${item.cantidadSolicitada}`}
            </span>
          )}
          <span style={s.chevron}>{abierto ? '▲' : '▼'}</span>
        </div>
      </div>

      {abierto && (
        <div style={s.itemBody}>
          <div style={s.itemRow}>
            <span style={s.campoLabel}>Cantidad en stock</span>
            {(role === 'admin' || role === 'operador') ? (
              <input type="number" min={0} value={item.cantidad}
                onChange={e => onActualizarCantidad(item.id, e.target.value)}
                style={s.inputCant} onClick={e => e.stopPropagation()} />
            ) : (
              <span style={{ color: sinStock ? 'var(--gl-fault)' : 'var(--gl-text-primary)', fontSize: 12, fontWeight: 600 }}>{item.cantidad}</span>
            )}
          </div>

          {sinStock && (
            <div style={s.autoSolBox}>
              <span style={s.autoSolTexto}>⚠️ Solicitado automáticamente por stock en cero</span>
            </div>
          )}

          <div style={s.acciones}>
            {!sinStock && !item.solicitado && (
              <button onClick={() => setModal(true)} style={s.btnSolicitar}>{icono} Solicitar más</button>
            )}
            {!sinStock && item.solicitado && (
              <button onClick={() => onQuitarSolicitud(item.id)} style={s.btnQuitarSol}>✕ Quitar solicitud</button>
            )}
            {(role === 'admin' || role === 'operador') && (
              <button onClick={() => onEliminar(item.id)} style={s.btnEliminar}>🗑️ Eliminar</button>
            )}
          </div>
        </div>
      )}

      {modalSolicitar && (
        <ModalSolicitar nombre={item.nombre} icono={icono}
          onConfirmar={(cant) => { onSolicitar(item.id, cant); setModal(false) }}
          onCerrar={() => setModal(false)} />
      )}
    </div>
  )
}

// ---- Sección reutilizable (herramientas o insumos) ----
function Seccion({ centroId, coleccion, titulo, icono, tipo, role, sincronizarEstado }) {
  const [lista, setLista]           = useState([])
  const [cargando, setCargando]     = useState(true)
  const [modalAgregar, setModalAg]  = useState(false)

  useEffect(() => {
    const ref   = doc(db, 'centros', centroId, 'datos', coleccion)
    const unsub = onSnapshot(ref, async (snap) => {
      const raw = snap.exists() ? (snap.data().lista ?? []) : []
      setLista(raw.map(i => ({ ...i, solicitado: i.cantidad === 0 ? true : i.solicitado })))
      setCargando(false)
      if (sincronizarEstado) await sincronizarEstado(centroId)
    })
    return () => unsub()
  }, [centroId, coleccion])

  const guardar = async (nueva) => {
    await setDoc(doc(db, 'centros', centroId, 'datos', coleccion), { lista: nueva })
  }

  const agregar           = (item) => { guardar([...lista, { ...item, id: Date.now() }]); setModalAg(false) }
  const solicitar         = (id, cant) => guardar(lista.map(i => i.id === id ? { ...i, solicitado: true, cantidadSolicitada: cant } : i))
  const quitarSolicitud   = (id) => guardar(lista.map(i => i.id === id ? { ...i, solicitado: false, cantidadSolicitada: 0 } : i))
  const eliminar          = (id) => guardar(lista.filter(i => i.id !== id))
  const actualizarCantidad = (id, cant) =>
    guardar(lista.map(i => i.id === id ? { ...i, cantidad: Number(cant), solicitado: Number(cant) === 0 ? true : i.solicitado } : i))

  return (
    <div style={s.seccion}>
      <div style={s.secHeader}>
        <span style={s.secTitulo}>{titulo}</span>
        {(role === 'admin' || role === 'operador') && (
          <button onClick={() => setModalAg(true)} style={s.btnAgregar}>+ Agregar</button>
        )}
      </div>
      {cargando && <p style={s.vacio}>Cargando...</p>}
      {!cargando && lista.length === 0 && <p style={s.vacio}>Sin {titulo.toLowerCase()} registrados.</p>}
      <div style={s.listaItems}>
        {lista.map(item => (
          <ItemLista key={item.id} item={item} icono={icono} role={role}
            onSolicitar={solicitar} onQuitarSolicitud={quitarSolicitud}
            onActualizarCantidad={actualizarCantidad} onEliminar={eliminar} />
        ))}
      </div>
      {modalAgregar && <ModalAgregar tipo={tipo} onGuardar={agregar} onCerrar={() => setModalAg(false)} />}
    </div>
  )
}

export default function TabInventario({ centro, role, sincronizarEstado }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Seccion centroId={centro.id} coleccion="herramientas" titulo="Herramientas" icono="📋" tipo="herramienta" role={role} sincronizarEstado={sincronizarEstado} />
      <div style={s.divider} />
      <Seccion centroId={centro.id} coleccion="insumos"      titulo="Insumos"      icono="📦" tipo="insumo"      role={role} sincronizarEstado={sincronizarEstado} />
    </div>
  )
}

const s = {
  seccion:      { display: 'flex', flexDirection: 'column' },
  secHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  secTitulo:    { color: 'var(--gl-text-primary)', fontSize: 14, fontWeight: 700 },
  btnAgregar:   { background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  listaItems:   { display: 'flex', flexDirection: 'column', gap: 6 },
  vacio:        { color: 'var(--gl-text-muted)', fontSize: 13, margin: 0 },
  divider:      { borderTop: '1px solid var(--gl-border)' },
  card:         { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, overflow: 'hidden' },
  acordeonHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--gl-bg-elevated)' },
  acordeonIzq:  { display: 'flex', flexDirection: 'column', gap: 2 },
  acordeonDer:  { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  itemNombre:   { color: 'var(--gl-text-primary)', fontSize: 12, fontWeight: 600 },
  cantBadge:    { fontSize: 10, fontWeight: 500 },
  solBadge:     { background: 'var(--gl-brand-strong)', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600 },
  chevron:      { color: 'var(--gl-text-muted)', fontSize: 10 },
  itemBody:     { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--gl-border)' },
  itemRow:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  campoLabel:   { color: 'var(--gl-text-muted)', fontSize: 11 },
  inputCant:    { width: 60, background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: 4, color: 'var(--gl-text-primary)', fontSize: 12, padding: '3px 6px', outline: 'none' },
  autoSolBox:   { background: 'var(--gl-low-tint)', borderRadius: 6, padding: '5px 8px' },
  autoSolTexto: { color: 'var(--gl-low)', fontSize: 10, fontWeight: 500 },
  acciones:     { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btnSolicitar: { background: 'var(--gl-border)', border: '1px solid var(--gl-dispatch)', color: 'var(--gl-brand-soft)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600 },
  btnQuitarSol: { background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-text-secondary)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11 },
  btnEliminar:  { background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-fault)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal:        { background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 360 },
  modalTitulo:  { color: 'var(--gl-text-primary)', fontSize: 16, fontWeight: 700, marginBottom: 8 },
  modalSub:     { color: 'var(--gl-text-muted)', fontSize: 12, marginBottom: 16 },
  label:        { color: 'var(--gl-text-secondary)', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 },
  input:        { width: '100%', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, color: 'var(--gl-text-primary)', fontSize: 14, padding: 10, outline: 'none', boxSizing: 'border-box' },
  modalBtns:    { display: 'flex', gap: 12, marginTop: 20 },
  btnCancelar:  { flex: 1, background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-text-secondary)', borderRadius: 8, padding: 10, cursor: 'pointer', fontSize: 14 },
  btnConfirmar: { flex: 1, background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
}
