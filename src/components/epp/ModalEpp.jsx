import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import { doc, setDoc, onSnapshot, deleteField } from 'firebase/firestore'
import { logError } from '../../lib/logger'
import { Modal, Button } from '../kit'
import { t } from '../../theme/tokens'

// ---- Modal nombre de ítem EPP (agregar / renombrar catálogo global, solo admin) ----
function ModalItemEpp({ inicial = '', titulo, onGuardar, onCerrar }) {
  const [nombre, setNombre] = useState(inicial)
  const handleSubmit = (e) => {
    e.preventDefault()
    const n = nombre.trim()
    if (!n) return
    onGuardar(n)
  }
  return (
    <div style={s.modalOverlay}>
      <div style={s.modal}>
        <h3 style={s.modalTitulo}>{titulo}</h3>
        <p style={s.avisoGlobal}>⚠️ Esta lista es única para toda la flota: el cambio afecta a todos los operadores.</p>
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Nombre del ítem</label>
          <input style={s.input} value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Botas" autoFocus required />
          <div style={s.modalBtns}>
            <button type="button" onClick={onCerrar} style={s.btnCancelar}>Cancelar</button>
            <button type="submit"                     style={s.btnConfirmar}>Guardar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// EPP personal de un operador/apertura. Catálogo (labels) global en config/epp, editable
// solo por admin. Estado por persona en usuarios/{uid}.epp.faltantes = { [itemId]: true }
// (ausencia de la clave = tiene el ítem). Vive en la ficha de la persona, no en el roster
// del centro, porque "Sincronizar operadores" reescribe ese roster completo y borraría
// cualquier campo ajeno a los suyos.
//
// Dos modos según si recibe `uid`:
//  - Con uid: vista de UN operador puntual — solo su estado Tengo/Me falta (editable por
//    él mismo o por admin para corregir). Sin controles de catálogo.
//  - Sin uid: "Catálogo de EPP" — gestión general (+Agregar/renombrar/quitar), afecta a
//    todos. Sin estado de nadie, porque no hay un operador puntual al que mostrárselo.
export default function ModalEpp({ uid = null, nombre, role, onCerrar }) {
  const modoCatalogo = !uid
  const [catalogo, setCatalogo]     = useState([])   // [{ id, label }]
  const [faltantes, setFaltantes]   = useState({})   // { [id]: true }
  const [cargando, setCargando]     = useState(true)
  const [modal, setModal]           = useState(null) // { modo:'agregar' } | { modo:'renombrar', item }
  const puedeEditar = role === 'operador' || role === 'apertura' || role === 'admin'
  const esAdmin = role === 'admin'

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'epp'), (snap) => {
      setCatalogo(snap.exists() ? (snap.data().lista ?? []) : [])
      setCargando(false)
    }, (e) => { logError('ModalEpp/catalogo', e); setCargando(false) })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!uid) return
    const unsub = onSnapshot(doc(db, 'usuarios', uid), (snap) => {
      setFaltantes(snap.exists() ? (snap.data().epp?.faltantes ?? {}) : {})
    }, (e) => logError('ModalEpp/faltantes', e))
    return () => unsub()
  }, [uid])

  const toggleFalta = (id, enFalta) => {
    setFaltantes(f => ({ ...f, [id]: enFalta || undefined }))
    setDoc(doc(db, 'usuarios', uid), { epp: { faltantes: { [id]: enFalta ? true : deleteField() } } }, { merge: true })
  }

  const guardarCatalogo = (lista) => setDoc(doc(db, 'config', 'epp'), { lista }, { merge: true })
  const agregarItem   = (label)     => { guardarCatalogo([...catalogo, { id: String(Date.now()), label }]); setModal(null) }
  const renombrarItem = (id, label) => { guardarCatalogo(catalogo.map(i => i.id === id ? { ...i, label } : i)); setModal(null) }
  const quitarItem    = (id)        => guardarCatalogo(catalogo.filter(i => i.id !== id))

  const totalFaltan = catalogo.filter(item => faltantes[item.id]).length

  return (
    <Modal open title={modoCatalogo ? 'Catálogo de EPP' : `EPP — ${nombre}`} onClose={onCerrar} maxWidth={420}
      footer={<Button variant="secondary" size="lg" onClick={onCerrar}>Cerrar</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {modoCatalogo && esAdmin && (
          <button onClick={() => setModal({ modo: 'agregar' })} style={s.btnAgregar}>+ Agregar ítem</button>
        )}

        {cargando && <p style={s.vacio}>Cargando...</p>}
        {!cargando && catalogo.length === 0 && <p style={s.vacio}>Sin ítems de EPP definidos.</p>}

        <div style={s.listaItems}>
          {catalogo.map(item => {
            const enFalta = !!faltantes[item.id]
            return (
              <div key={item.id} style={s.filaEstuche}>
                <span style={s.itemNombre}>{item.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {modoCatalogo ? (
                    esAdmin && (
                      <>
                        <button onClick={() => setModal({ modo: 'renombrar', item })} style={s.btnEliminar} title="Renombrar">✏️</button>
                        <button onClick={() => quitarItem(item.id)}                  style={s.btnEliminar} title="Quitar de todos">🗑️</button>
                      </>
                    )
                  ) : (
                    <button
                      onClick={puedeEditar ? () => toggleFalta(item.id, !enFalta) : undefined}
                      style={{
                        ...s.estadoBadge,
                        color: enFalta ? 'var(--gl-fault)' : 'var(--gl-ok)',
                        background: enFalta ? 'var(--gl-fault-tint)' : 'var(--gl-ok-tint)',
                        cursor: puedeEditar ? 'pointer' : 'default',
                      }}
                    >
                      {enFalta ? '⚠️ Me falta' : '● Tengo'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {!modoCatalogo && !cargando && catalogo.length > 0 && (
          <p style={{ ...s.avisoGlobalInline, color: totalFaltan > 0 ? t.fault : t.textMuted }}>
            {totalFaltan > 0 ? `⚠️ Le falta ${totalFaltan} ítem${totalFaltan > 1 ? 's' : ''}.` : '✅ Tiene todo su EPP.'}
          </p>
        )}
        {modoCatalogo && esAdmin && catalogo.length > 0 && (
          <p style={s.avisoGlobalInline}>⚠️ Agregar, renombrar o quitar un ítem afecta a todos los operadores.</p>
        )}
      </div>

      {modal?.modo === 'agregar' && (
        <ModalItemEpp titulo="Agregar ítem EPP" onGuardar={agregarItem} onCerrar={() => setModal(null)} />
      )}
      {modal?.modo === 'renombrar' && (
        <ModalItemEpp titulo="Renombrar ítem EPP" inicial={modal.item.label}
          onGuardar={(n) => renombrarItem(modal.item.id, n)} onCerrar={() => setModal(null)} />
      )}
    </Modal>
  )
}

const s = {
  btnAgregar:   { alignSelf: 'flex-start', background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  listaItems:   { display: 'flex', flexDirection: 'column', gap: 6 },
  vacio:        { color: 'var(--gl-text-muted)', fontSize: 13, margin: 0 },
  filaEstuche:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, padding: '8px 12px' },
  itemNombre:   { color: 'var(--gl-text-primary)', fontSize: 12, fontWeight: 600 },
  estadoBadge:  { fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '4px 10px', border: 'none' },
  btnEliminar:  { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 },
  modal:        { background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 360 },
  modalTitulo:  { color: 'var(--gl-text-primary)', fontSize: 16, fontWeight: 700, marginBottom: 8 },
  label:        { color: 'var(--gl-text-secondary)', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 },
  input:        { width: '100%', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, color: 'var(--gl-text-primary)', fontSize: 14, padding: 10, outline: 'none', boxSizing: 'border-box' },
  modalBtns:    { display: 'flex', gap: 12, marginTop: 20 },
  btnCancelar:  { flex: 1, background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-text-secondary)', borderRadius: 8, padding: 10, cursor: 'pointer', fontSize: 14 },
  btnConfirmar: { flex: 1, background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  avisoGlobal:       { color: 'var(--gl-fault)', fontSize: 12, margin: '0 0 14px', lineHeight: 1.4, fontWeight: 500 },
  avisoGlobalInline: { fontSize: 11, margin: '4px 0 0', lineHeight: 1.4, fontWeight: 600 },
}
