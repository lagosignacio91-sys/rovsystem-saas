import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

const CAMPOS = [
  { key: 'modelo',               label: 'Modelo',             sinFalla: true },
  { key: 'codigoRov',            label: 'Código ROV' },
  { key: 'codigoControl',        label: 'Código Control' },
  { key: 'codigoUmbilical',      label: 'Código Umbilical' },
  { key: 'codigoCargadorRov',    label: 'Cargador ROV' },
  { key: 'codigoCargadorControl',label: 'Cargador Control' },
]

function ModalFalla({ campo, valorActual, onConfirmar, onCerrar }) {
  const [razon, setRazon] = useState(valorActual ?? '')
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitulo}>Falla — {campo}</h3>
        <textarea style={styles.textarea} value={razon} onChange={e => setRazon(e.target.value)} placeholder="Describe la falla..." rows={3} autoFocus />
        <div style={styles.modalBtns}>
          <button onClick={onCerrar}                 style={styles.btnCancelar}>Cancelar</button>
          <button onClick={() => onConfirmar(razon)} style={styles.btnConfirmar}>Confirmar falla</button>
        </div>
      </div>
    </div>
  )
}

function ModalVerFalla({ campo, razon, onCerrar, onLimpiar, puedeEditar }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitulo}>Falla — {campo}</h3>
        <div style={styles.razonBox}><p style={styles.razonTexto}>{razon}</p></div>
        <div style={styles.modalBtns}>
          <button onClick={onCerrar}  style={styles.btnCancelar}>Cerrar</button>
          {puedeEditar && <button onClick={onLimpiar} style={styles.btnLimpiar}>✅ Marcar operativo</button>}
        </div>
      </div>
    </div>
  )
}

function EquipoCard({ titulo, datos, onGuardar, role }) {
  const [abierto, setAbierto]         = useState(false)
  const [editando, setEditando]       = useState(false)
  const [form, setForm]               = useState(datos)
  const [modalFalla, setModalFalla]   = useState(null)
  const [verFalla, setVerFalla]       = useState(null)
  const [obsEditando, setObsEditando] = useState(false)
  const [obsTemp, setObsTemp]         = useState(datos.observacion ?? '')

  useEffect(() => { setForm(datos); setObsTemp(datos.observacion ?? '') }, [datos])

  // El taller (supervisor) ve fallas pero NO edita equipos ROV. Solo admin/operador editan.
  const puedeEditar = role === 'admin' || role === 'operador'
  const tieneFalla = Object.values(form.estados ?? {}).some(e => e === 'falla')

  const handleGuardar = () => { onGuardar(form); setEditando(false) }

  const marcarFalla = (key) => setModalFalla({ key, label: CAMPOS.find(c => c.key === key)?.label })

  const confirmarFalla = (razon) => {
    const nuevo = { ...form, estados: { ...form.estados, [modalFalla.key]: 'falla' }, fallas: { ...form.fallas, [modalFalla.key]: razon } }
    setForm(nuevo); onGuardar(nuevo); setModalFalla(null)
  }

  const limpiarFalla = (key) => {
    const nuevo = { ...form, estados: { ...form.estados, [key]: 'operativo' }, fallas: { ...form.fallas, [key]: '' } }
    setForm(nuevo); onGuardar(nuevo); setVerFalla(null)
  }

  const guardarObservacion = () => {
    const nuevo = { ...form, observacion: obsTemp }
    setForm(nuevo); onGuardar(nuevo); setObsEditando(false)
  }

  return (
    <div style={styles.card}>
      <div style={styles.acordeonHeader} onClick={() => setAbierto(!abierto)}>
        <div style={styles.acordeonIzq}>
          <span style={styles.acordeonTitulo}>{titulo}</span>
          {form.modelo && <span style={styles.acordeonModelo}>{form.modelo}</span>}
        </div>
        <div style={styles.acordeonDer}>
          <span style={{ ...styles.estadoBadge, color: tieneFalla ? 'var(--gl-fault)' : 'var(--gl-ok)', background: tieneFalla ? 'var(--gl-fault-tint)' : 'var(--gl-ok-tint)' }}>
            {tieneFalla ? '⚠️ Falla' : '● Operativo'}
          </span>
          <span style={styles.chevron}>{abierto ? '▲' : '▼'}</span>
        </div>
      </div>

      {abierto && (
        <div style={styles.cardBody}>
          <div style={styles.bodyHeader}>
            {(role === 'admin' || role === 'operador') && (
              <button onClick={() => editando ? handleGuardar() : setEditando(true)} style={editando ? styles.btnSave : styles.btnEdit}>
                {editando ? 'Guardar' : 'Editar'}
              </button>
            )}
          </div>

          {CAMPOS.map(c => {
            const esFalla = form.estados?.[c.key] === 'falla'
            return (
              <div key={c.key} style={styles.fila}>
                <div style={styles.filaIzq}>
                  <span style={styles.campoLabel}>{c.label}</span>
                  {editando ? (
                    <input style={styles.input} value={form[c.key] ?? ''} onChange={e => setForm({ ...form, [c.key]: e.target.value })} placeholder="Sin código" />
                  ) : (
                    <span
                      style={esFalla ? styles.valorFalla : form[c.key] ? styles.campoValor : styles.sinCodigo}
                      onClick={esFalla ? () => setVerFalla({ key: c.key, label: c.label }) : undefined}
                      title={esFalla ? 'Ver razón de falla' : ''}
                    >
                      {form[c.key] || '⚠️ Sin código'}
                      {esFalla && <span style={styles.verFallaHint}> — ver</span>}
                    </span>
                  )}
                </div>
                {!c.sinFalla && (esFalla || puedeEditar) && (
                  <button
                    onClick={() => esFalla ? setVerFalla({ key: c.key, label: c.label }) : marcarFalla(c.key)}
                    style={{ ...styles.btnFalla, ...(esFalla ? styles.btnFallaActivo : {}) }}
                    title={esFalla ? 'Ver falla' : 'Marcar falla'}
                  >❌</button>
                )}
              </div>
            )
          })}

          <div style={styles.obsBox}>
            <div style={styles.obsHeader}>
              <span style={styles.campoLabel}>OBSERVACIÓN</span>
              {!obsEditando && puedeEditar && <button onClick={() => setObsEditando(true)} style={styles.btnObsEditar}>✏️</button>}
            </div>
            {obsEditando ? (
              <div>
                <textarea style={styles.obsTextarea} value={obsTemp} onChange={e => setObsTemp(e.target.value)} placeholder="Escribe una observación..." rows={2} autoFocus />
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <button onClick={() => setObsEditando(false)} style={styles.btnObsCancelar}>Cancelar</button>
                  <button onClick={guardarObservacion}          style={styles.btnObsGuardar}>Guardar</button>
                </div>
              </div>
            ) : (
              <span style={form.observacion ? styles.obsTexto : styles.obsVacio}>
                {form.observacion || 'Sin observación — toca ✏️ para agregar'}
              </span>
            )}
          </div>
        </div>
      )}

      {modalFalla && <ModalFalla campo={modalFalla.label} valorActual={form.fallas?.[modalFalla.key]} onConfirmar={confirmarFalla} onCerrar={() => setModalFalla(null)} />}
      {verFalla   && <ModalVerFalla campo={verFalla.label} razon={form.fallas?.[verFalla.key]} onCerrar={() => setVerFalla(null)} onLimpiar={() => limpiarFalla(verFalla.key)} puedeEditar={puedeEditar} />}
    </div>
  )
}

export default function TabROV({ centro, role, sincronizarEstado }) {
  const [principal, setPrincipal] = useState({})
  const [backup, setBackup]       = useState({})
  const [cargando, setCargando]   = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const ref  = doc(db, 'centros', centro.id, 'equipos', 'rov')
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const p = snap.data().principal ?? {}
        const b = snap.data().backup ?? {}
        setPrincipal(p); setBackup(b)
      }
      setCargando(false)
    }
    cargar()
  }, [centro.id])

  const verificarEstadoCentro = async () => {
    if (sincronizarEstado) await sincronizarEstado(centro.id)
  }

  const guardarPrincipal = async (datos) => {
    const ref = doc(db, 'centros', centro.id, 'equipos', 'rov')
    await setDoc(ref, { principal: datos, backup }, { merge: true })
    setPrincipal(datos); await verificarEstadoCentro()
  }

  const guardarBackup = async (datos) => {
    const ref = doc(db, 'centros', centro.id, 'equipos', 'rov')
    await setDoc(ref, { principal, backup: datos }, { merge: true })
    setBackup(datos); await verificarEstadoCentro()
  }

  if (cargando) return <p style={{ color: 'var(--gl-text-muted)', fontSize: '13px' }}>Cargando...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <EquipoCard titulo="🤖 Equipo Principal" datos={principal} onGuardar={guardarPrincipal} role={role} />
      <EquipoCard titulo="🔄 Equipo Backup"    datos={backup}    onGuardar={guardarBackup}    role={role} />
    </div>
  )
}

const styles = {
  card:           { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: '10px', overflow: 'hidden' },
  acordeonHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--gl-bg-elevated)' },
  acordeonIzq:    { display: 'flex', flexDirection: 'column', gap: '2px' },
  acordeonTitulo: { color: 'var(--gl-text-primary)', fontWeight: '700', fontSize: '12px' },
  acordeonModelo: { color: 'var(--gl-text-muted)', fontSize: '11px' },
  acordeonDer:    { display: 'flex', alignItems: 'center', gap: '8px' },
  estadoBadge:    { fontSize: '10px', fontWeight: '700', borderRadius: '5px', padding: '2px 7px' },
  chevron:        { color: 'var(--gl-text-muted)', fontSize: '10px' },
  cardBody:       { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--gl-border)' },
  bodyHeader:     { display: 'flex', justifyContent: 'flex-end' },
  fila:           { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' },
  filaIzq:        { flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' },
  campoLabel:     { color: 'var(--gl-text-muted)', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
  campoValor:     { color: 'var(--gl-text-primary)', fontSize: '11px' },
  sinCodigo:      { color: 'var(--gl-low)', fontSize: '11px' },
  valorFalla:     { color: 'var(--gl-fault)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline dotted' },
  verFallaHint:   { fontSize: '10px', color: 'var(--gl-text-secondary)' },
  btnFalla:       { width: '24px', height: '24px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gl-bg-elevated)', flexShrink: 0 },
  btnFallaActivo: { background: 'var(--gl-fault)', boxShadow: '0 0 0 2px var(--gl-fault)' },
  btnEdit:        { background: 'transparent', border: '1px solid var(--gl-dispatch)', color: 'var(--gl-dispatch)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '10px' },
  btnSave:        { background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '10px' },
  input:          { background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: '4px', color: 'var(--gl-text-primary)', fontSize: '11px', padding: '3px 6px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  obsBox:         { background: 'var(--gl-bg-elevated)', borderRadius: '6px', padding: '6px 8px', marginTop: '2px' },
  obsHeader:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' },
  btnObsEditar:   { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '0' },
  obsTexto:       { color: 'var(--gl-text-primary)', fontSize: '11px', lineHeight: '1.4' },
  obsVacio:       { color: 'var(--gl-text-muted)', fontSize: '11px', fontStyle: 'italic' },
  obsTextarea:    { width: '100%', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: '6px', color: 'var(--gl-text-primary)', fontSize: '11px', padding: '6px', outline: 'none', resize: 'none', boxSizing: 'border-box' },
  btnObsCancelar: { background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-text-secondary)', borderRadius: '4px', padding: '2px 7px', cursor: 'pointer', fontSize: '10px' },
  btnObsGuardar:  { background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: '4px', padding: '2px 7px', cursor: 'pointer', fontSize: '10px', fontWeight: '600' },
  modalOverlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal:          { background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px' },
  modalTitulo:    { color: 'var(--gl-text-primary)', fontSize: '15px', fontWeight: '700', marginBottom: '14px' },
  textarea:       { width: '100%', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: '8px', color: 'var(--gl-text-primary)', fontSize: '13px', padding: '8px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' },
  modalBtns:      { display: 'flex', gap: '10px', marginTop: '14px' },
  btnCancelar:    { flex: 1, background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-text-secondary)', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px' },
  btnConfirmar:   { flex: 1, background: 'var(--gl-fault)', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  btnLimpiar:     { flex: 1, background: 'var(--gl-ok)', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  razonBox:       { background: 'var(--gl-fault-tint)', borderRadius: '8px', padding: '12px', marginBottom: '8px' },
  razonTexto:     { color: 'var(--gl-fault)', fontSize: '13px', lineHeight: '1.5' },
}