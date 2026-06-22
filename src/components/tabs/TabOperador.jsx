import { useState, useEffect, useRef } from 'react'
import { db, storage, auth } from '../../lib/firebase'
import { doc, setDoc, onSnapshot, deleteField } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useAppConfig } from '../../hooks/useAppConfig'
import { TIPOS_OPERADOR } from '../../config/appDefaults'

function FormOperador({ titulo, form, setForm, fotoPreview, fileRef, handleFoto, onGuardar, onCerrar, campos }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitulo}>{titulo}</h3>
        <div style={styles.fotoUpload} onClick={() => fileRef.current.click()}>
          {fotoPreview
            ? <img src={fotoPreview} alt="foto" style={styles.fotoPreview} />
            : <span style={styles.fotoPlaceholder}>📷 Subir foto</span>
          }
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} />
        <div style={{ marginBottom: '10px' }}>
          <label style={styles.label}>Nombre completo</label>
          <input style={styles.input} type="text" value={form.nombre ?? ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
        </div>
        {campos.map(c => (
          <div key={c.id} style={{ marginBottom: '10px' }}>
            <label style={styles.label}>{c.label}</label>
            <input style={styles.input} type={c.type} value={form[c.id] ?? ''} onChange={e => setForm(f => ({ ...f, [c.id]: e.target.value }))} />
          </div>
        ))}
        <div style={styles.modalBtns}>
          <button onClick={onCerrar}  style={styles.btnCancelar}>Cancelar</button>
          <button onClick={onGuardar} style={styles.btnConfirmar}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

function TarjetaOperador({ operador, numero, onEditar, onToggleEstado, onVerFoto, role, campos }) {
  const [abierto, setAbierto] = useState(false)
  const enFaena = operador.estado === 'faena'

  return (
    <div style={{ ...styles.card, borderColor: enFaena ? 'var(--gl-ok)' : 'var(--gl-border)' }}>
      <div style={styles.acordeonHeader} onClick={() => setAbierto(!abierto)}>
        <div style={styles.acordeonIzq}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {operador.foto
              ? <img src={operador.foto} alt="foto" style={{ ...styles.miniFoto, border: `2px solid ${enFaena ? 'var(--gl-ok)' : 'var(--gl-border)'}` }} onClick={e => { e.stopPropagation(); onVerFoto(operador.foto) }} />
              : <div style={{ ...styles.miniFotoVacia, border: `2px solid ${enFaena ? 'var(--gl-ok)' : 'var(--gl-border)'}` }}>👤</div>
            }
            <span style={styles.miniIcono}>{enFaena ? '🎮' : '😴'}</span>
          </div>
          <div style={styles.opInfo}>
            <span style={styles.opNombre}>{operador.nombre || `Operador ${numero}`}</span>
            <span style={styles.opCorreo}>{operador.correoCorp || operador.correoPersonal || 'Sin correo'}</span>
            <span style={{ ...styles.opEstado, color: enFaena ? 'var(--gl-ok)' : 'var(--gl-text-muted)' }}>
              {enFaena ? '🎮 En faena' : '😴 En descanso'}
            </span>
          </div>
        </div>
        <div style={styles.acordeonDer}>
          <span style={styles.chevron}>{abierto ? '▲' : '▼'}</span>
        </div>
      </div>

      {abierto && (
        <div style={styles.cardBody}>
          <div style={styles.accionesHeader}>
            <button
              onClick={onToggleEstado}
              style={{ ...styles.btnEstado, background: enFaena ? 'var(--gl-ok-tint)' : 'var(--gl-border)' }}
            >
              {enFaena ? '🎮 En faena' : '😴 En descanso'}
            </button>
            {role === 'admin' && (
              <button onClick={onEditar} style={styles.btnEditar}>Editar</button>
            )}
          </div>

          {operador.nombre ? (
            <>
              {campos.map((c) => (
                <div key={c.id} style={styles.campo}>
                  <span style={styles.campoLabel}>{c.label}</span>
                  <span style={styles.campoValor}>{operador[c.id] || '—'}</span>
                </div>
              ))}
            </>
          ) : (
            <p style={styles.vacio}>Sin operador asignado.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function TabOperador({ centro, role }) {
  const { camposOperador } = useAppConfig()
  const campos = camposOperador
    .filter((c) => !c.hidden)
    .map((c) => ({ ...c, type: TIPOS_OPERADOR[c.id] ?? 'text' }))
  const [lista, setLista]             = useState([])
  const [cargando, setCargando]       = useState(true)
  const [editando, setEditando]       = useState(null)
  const [form, setForm]               = useState({})
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoFile, setFotoFile]       = useState(null)
  const [verFoto, setVerFoto]         = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    const ref = doc(db, 'centros', centro.id, 'datos', 'operadores')
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data()
        setLista(data.lista ?? [data.op1, data.op2].filter(Boolean))
      } else {
        setLista([])
      }
      setCargando(false)
    })
    return () => unsub()
  }, [centro.id])

  const guardar = async (nuevaLista) => {
    const ref = doc(db, 'centros', centro.id, 'datos', 'operadores')
    await setDoc(ref, { lista: nuevaLista, op1: deleteField(), op2: deleteField() }, { merge: true })
  }

  const cerrarEdicion = () => {
    if (fotoFile) URL.revokeObjectURL(fotoPreview)
    setEditando(null); setForm({}); setFotoPreview(null); setFotoFile(null)
  }

  const handleEditar = (idx) => {
    setFotoFile(null)
    setForm(lista[idx])
    setFotoPreview(lista[idx].foto ?? null)
    setEditando(idx)
  }

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (fotoFile) URL.revokeObjectURL(fotoPreview)
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const handleGuardar = async () => {
    let fotoUrl = form.foto ?? null
    if (fotoFile) {
      try {
        const path    = `operadores/${centro.id}/${Date.now()}_foto`
        const storRef = ref(storage, path)
        const uid = auth.currentUser?.uid ?? 'unknown'
        const snap    = await uploadBytes(storRef, fotoFile, { customMetadata: { uploadedBy: uid } })
        fotoUrl = await getDownloadURL(snap.ref)
      } catch {
        // Error de Storage — se conserva la foto anterior sin abortar el guardado
      }
    }
    const nueva = lista.map((op, i) => i === editando ? { ...form, foto: fotoUrl } : op)
    setLista(nueva)
    await guardar(nueva)
    cerrarEdicion()
  }

  const handleToggleEstado = async (idx) => {
    const nueva = lista.map((op, i) =>
      i === idx ? { ...op, estado: op.estado === 'faena' ? 'descanso' : 'faena' } : op
    )
    setLista(nueva)
    await guardar(nueva)
  }

  if (cargando) return <p style={{ color: 'var(--gl-text-muted)', fontSize: '13px' }}>Cargando...</p>

  if (!lista.length) return (
    <p style={{ color: 'var(--gl-text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
      Sin operadores asignados.<br />
      <span style={{ fontSize: 11 }}>Ve a Centros y ejecuta «Sincronizar operadores».</span>
    </p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {lista.map((op, i) => (
        <TarjetaOperador
          key={i}
          operador={op}
          numero={i + 1}
          onEditar={() => handleEditar(i)}
          onToggleEstado={() => handleToggleEstado(i)}
          onVerFoto={setVerFoto}
          role={role}
          campos={campos}
        />
      ))}

      {verFoto && (
        <div style={styles.fotoModalOverlay} onClick={() => setVerFoto(null)}>
          <img src={verFoto} alt="foto operador" style={styles.fotoGrande} />
        </div>
      )}

      {editando !== null && (
        <FormOperador
          titulo={`Operador ${editando + 1}`}
          form={form} setForm={setForm}
          fotoPreview={fotoPreview} fileRef={fileRef} handleFoto={handleFoto}
          onGuardar={handleGuardar}
          onCerrar={cerrarEdicion}
          campos={campos}
        />
      )}
    </div>
  )
}

const styles = {
  card:            { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: '8px', overflow: 'hidden' },
  acordeonHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--gl-bg-elevated)', gap: '10px' },
  acordeonIzq:     { display: 'flex', alignItems: 'center', gap: '10px', flex: 1 },
  acordeonDer:     { display: 'flex', alignItems: 'center' },
  miniFoto:        { width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', display: 'block' },
  miniFotoVacia:   { width: '44px', height: '44px', borderRadius: '50%', background: 'var(--gl-bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  miniIcono:       { position: 'absolute', bottom: '-2px', right: '-2px', fontSize: '12px', background: 'var(--gl-bg-elevated)', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  opInfo:          { display: 'flex', flexDirection: 'column', gap: '1px', overflow: 'hidden' },
  opNombre:        { color: 'var(--gl-text-primary)', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  opCorreo:        { color: 'var(--gl-text-muted)', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  opEstado:        { fontSize: '10px', fontWeight: '600' },
  chevron:         { color: 'var(--gl-text-muted)', fontSize: '10px' },
  cardBody:        { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--gl-border)' },
  accionesHeader:  { display: 'flex', gap: '8px', marginBottom: '4px' },
  btnEstado:       { border: 'none', color: '#fff', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  btnEditar:       { background: 'transparent', border: '1px solid var(--gl-dispatch)', color: 'var(--gl-dispatch)', borderRadius: '5px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px' },
  campo:           { display: 'flex', flexDirection: 'column', gap: '1px' },
  campoLabel:      { color: 'var(--gl-text-muted)', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
  campoValor:      { color: 'var(--gl-text-primary)', fontSize: '11px' },
  vacio:           { color: 'var(--gl-text-muted)', fontSize: '12px' },
  fotoModalOverlay:{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  fotoGrande:      { maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' },
  modalOverlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal:           { background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '380px', maxHeight: '90vh', overflowY: 'auto' },
  modalTitulo:     { color: 'var(--gl-text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '16px' },
  fotoUpload:      { width: '70px', height: '70px', borderRadius: '50%', background: 'var(--gl-bg-input)', border: '2px dashed var(--gl-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 auto 14px' },
  fotoPreview:     { width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover' },
  fotoPlaceholder: { color: 'var(--gl-text-muted)', fontSize: '11px', textAlign: 'center' },
  label:           { color: 'var(--gl-text-secondary)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' },
  input:           { width: '100%', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: '8px', color: 'var(--gl-text-primary)', fontSize: '13px', padding: '8px', outline: 'none', boxSizing: 'border-box' },
  modalBtns:       { display: 'flex', gap: '12px', marginTop: '16px' },
  btnCancelar:     { flex: 1, background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-text-secondary)', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px' },
  btnConfirmar:    { flex: 1, background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
}
