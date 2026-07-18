import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { HERRAMIENTAS_BASICAS_DEFAULT } from '../../config/appDefaults'
import { logError } from '../../lib/logger'
import { kitBase, esCentroApertura } from '../../lib/kitScope'

// ---- Fila de checklist fijo (Ok / Falta) ----
function FilaHerramienta({ item, estado, puedeEditar, onCambiar }) {
  const enFalta = estado === 'falta'
  return (
    <div style={s.filaEstuche}>
      <span style={s.itemNombre}>{item.label}</span>
      <button
        onClick={puedeEditar ? () => onCambiar(item.id, enFalta ? 'ok' : 'falta') : undefined}
        style={{
          ...s.estadoBadge,
          color: enFalta ? 'var(--gl-fault)' : 'var(--gl-ok)',
          background: enFalta ? 'var(--gl-fault-tint)' : 'var(--gl-ok-tint)',
          cursor: puedeEditar ? 'pointer' : 'default',
        }}
      >
        {enFalta ? '⚠️ Falta' : '● Ok'}
      </button>
    </div>
  )
}

// ---- Juego de herramientas fijo de un equipo (Principal o Backup) ----
function EquipoHerramientas({ titulo, estado, puedeEditar, onCambiar }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div style={s.seccion}>
      <div style={s.secHeaderClick} onClick={() => setAbierto(a => !a)}>
        <span style={s.secTitulo}>{titulo}</span>
        <span style={s.chevron}>{abierto ? '▲' : '▼'}</span>
      </div>
      {abierto && (
        <div style={s.listaItems}>
          {HERRAMIENTAS_BASICAS_DEFAULT.map(item => (
            <FilaHerramienta key={item.id} item={item} estado={estado[item.id] ?? 'ok'} puedeEditar={puedeEditar} onCambiar={onCambiar} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Modal agregar ítem a la caja de herramientas ----
function ModalAgregar({ onGuardar, onCerrar }) {
  const [nombre,   setNombre]   = useState('')
  const [cantidad, setCantidad] = useState(1)
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    onGuardar({ nombre, cantidad: Number(cantidad) })
  }
  return (
    <div style={s.modalOverlay}>
      <div style={s.modal}>
        <h3 style={s.modalTitulo}>Agregar herramienta</h3>
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Nombre</label>
          <input style={s.input} value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Llave allen 5mm" autoFocus required />
          <label style={{ ...s.label, marginTop: 12 }}>Cantidad</label>
          <input style={s.input} type="number" min={0} value={cantidad} onChange={e => setCantidad(e.target.value)} />
          <div style={s.modalBtns}>
            <button type="button" onClick={onCerrar} style={s.btnCancelar}>Cancelar</button>
            <button type="submit"                     style={s.btnConfirmar}>Agregar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- Ítem de la caja de herramientas (libre) ----
function ItemCaja({ item, puedeEditar, onActualizarCantidad, onToggleFalta, onEliminar }) {
  const enFalta = item.falta === true
  return (
    <div style={s.card}>
      <div style={s.itemRow}>
        <span style={s.itemNombre}>{item.nombre}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {puedeEditar ? (
            <input type="number" min={0} value={item.cantidad}
              onChange={e => onActualizarCantidad(item.id, e.target.value)} style={s.inputCant} />
          ) : (
            <span style={s.cantBadge}>Cant: {item.cantidad}</span>
          )}
          <button
            onClick={puedeEditar ? () => onToggleFalta(item.id, !enFalta) : undefined}
            style={{
              ...s.estadoBadge,
              color: enFalta ? 'var(--gl-fault)' : 'var(--gl-ok)',
              background: enFalta ? 'var(--gl-fault-tint)' : 'var(--gl-ok-tint)',
              cursor: puedeEditar ? 'pointer' : 'default',
            }}
          >
            {enFalta ? '⚠️ Falta' : '● Ok'}
          </button>
          {puedeEditar && <button onClick={() => onEliminar(item.id)} style={s.btnEliminar}>🗑️</button>}
        </div>
      </div>
    </div>
  )
}

// ---- Caja de herramientas extra (libre, por centro — o por team en apertura) ----
function CajaHerramientas({ centro, role }) {
  const [lista, setLista]         = useState([])
  const [cargando, setCargando]   = useState(true)
  const [modalAgregar, setModalAg] = useState(false)
  const [abierto, setAbierto]     = useState(false)
  const puedeEditar = role === 'admin' || role === 'operador' || role === 'supervisor' || role === 'apertura'

  useEffect(() => {
    const ref = doc(db, ...kitBase(centro), 'datos', 'cajaHerramientas')
    const unsub = onSnapshot(ref, (snap) => {
      setLista(snap.exists() ? (snap.data().lista ?? []) : [])
      setCargando(false)
    }, (e) => { logError('TabInventario/caja', e); setCargando(false) })
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centro.id, centro.teamAsignado])

  const guardar = (nueva) => setDoc(doc(db, ...kitBase(centro), 'datos', 'cajaHerramientas'), { lista: nueva }, { merge: true })

  const agregar = (item) => { guardar([...lista, { ...item, id: Date.now(), falta: false }]); setModalAg(false) }
  const actualizarCantidad = (id, cant) => guardar(lista.map(i => i.id === id ? { ...i, cantidad: Number(cant) } : i))
  const toggleFalta = (id, val) => guardar(lista.map(i => i.id === id ? { ...i, falta: val } : i))
  const eliminar = (id) => guardar(lista.filter(i => i.id !== id))

  return (
    <div style={s.seccion}>
      <div style={s.secHeaderClick} onClick={() => setAbierto(a => !a)}>
        <span style={s.secTitulo}>Caja de herramientas</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {puedeEditar && (
            <button onClick={(e) => { e.stopPropagation(); setModalAg(true) }} style={s.btnAgregar}>+ Agregar</button>
          )}
          <span style={s.chevron}>{abierto ? '▲' : '▼'}</span>
        </div>
      </div>
      {abierto && (
        <>
          {cargando && <p style={s.vacio}>Cargando...</p>}
          {!cargando && lista.length === 0 && <p style={s.vacio}>Sin ítems agregados.</p>}
          <div style={s.listaItems}>
            {lista.map(item => (
              <ItemCaja key={item.id} item={item} puedeEditar={puedeEditar}
                onActualizarCantidad={actualizarCantidad} onToggleFalta={toggleFalta} onEliminar={eliminar} />
            ))}
          </div>
        </>
      )}
      {modalAgregar && <ModalAgregar onGuardar={agregar} onCerrar={() => setModalAg(false)} />}
    </div>
  )
}

export default function TabInventario({ centro, role, sincronizarEstado }) {
  const [estadoPrincipal, setEstadoPrincipal] = useState({})
  const [estadoBackup, setEstadoBackup]       = useState({})
  const puedeEditar = role === 'admin' || role === 'operador' || role === 'supervisor' || role === 'apertura'

  useEffect(() => {
    const ref = doc(db, ...kitBase(centro), 'datos', 'estucheHerramientas')
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.exists() ? snap.data() : {}
      setEstadoPrincipal(data.principal ?? {})
      setEstadoBackup(data.backup ?? {})
    }, (e) => logError('TabInventario/estuche', e))
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centro.id, centro.teamAsignado])

  const cambiarEstado = async (equipo, itemId, valor) => {
    const ref = doc(db, ...kitBase(centro), 'datos', 'estucheHerramientas')
    const nuevo = { ...(equipo === 'principal' ? estadoPrincipal : estadoBackup), [itemId]: valor }
    await setDoc(ref, { [equipo]: nuevo }, { merge: true })
    if (!esCentroApertura(centro) && sincronizarEstado) await sincronizarEstado(centro.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <EquipoHerramientas titulo="Equipo Principal" estado={estadoPrincipal}
        puedeEditar={puedeEditar} onCambiar={(id, valor) => cambiarEstado('principal', id, valor)} />
      <div style={s.divider} />
      <EquipoHerramientas titulo="Equipo Backup" estado={estadoBackup}
        puedeEditar={puedeEditar} onCambiar={(id, valor) => cambiarEstado('backup', id, valor)} />
      <div style={s.divider} />
      <CajaHerramientas centro={centro} role={role} />
    </div>
  )
}

const s = {
  seccion:      { display: 'flex', flexDirection: 'column' },
  secHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  secHeaderClick: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, cursor: 'pointer', userSelect: 'none' },
  secTitulo:    { color: 'var(--gl-text-primary)', fontSize: 14, fontWeight: 700 },
  chevron:      { color: 'var(--gl-text-muted)', fontSize: 11 },
  btnAgregar:   { background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  listaItems:   { display: 'flex', flexDirection: 'column', gap: 6 },
  vacio:        { color: 'var(--gl-text-muted)', fontSize: 13, margin: 0 },
  divider:      { borderTop: '1px solid var(--gl-border)' },
  card:         { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, overflow: 'hidden', padding: '8px 12px' },
  filaEstuche:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, padding: '8px 12px' },
  itemRow:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  itemNombre:   { color: 'var(--gl-text-primary)', fontSize: 12, fontWeight: 600 },
  cantBadge:    { fontSize: 11, color: 'var(--gl-text-secondary)' },
  estadoBadge:  { fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '4px 10px', border: 'none' },
  inputCant:    { width: 60, background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: 4, color: 'var(--gl-text-primary)', fontSize: 12, padding: '3px 6px', outline: 'none' },
  btnEliminar:  { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal:        { background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 360 },
  modalTitulo:  { color: 'var(--gl-text-primary)', fontSize: 16, fontWeight: 700, marginBottom: 8 },
  label:        { color: 'var(--gl-text-secondary)', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 },
  input:        { width: '100%', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, color: 'var(--gl-text-primary)', fontSize: 14, padding: 10, outline: 'none', boxSizing: 'border-box' },
  modalBtns:    { display: 'flex', gap: 12, marginTop: 20 },
  btnCancelar:  { flex: 1, background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-text-secondary)', borderRadius: 8, padding: 10, cursor: 'pointer', fontSize: 14 },
  btnConfirmar: { flex: 1, background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
}
