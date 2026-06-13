import { useState, useEffect, useRef } from 'react'
import { db } from '../../lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

function FormOperador({ titulo, form, setForm, fotoPreview, fileRef, handleFoto, onGuardar, onCerrar }) {
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
        {[
          { key: 'nombre',         label: 'Nombre completo',    type: 'text'  },
          { key: 'rut',            label: 'RUT',                type: 'text'  },
          { key: 'telefono',       label: 'Teléfono',           type: 'text'  },
          { key: 'correoPersonal', label: 'Correo personal',    type: 'email' },
          { key: 'correoCorp',     label: 'Correo corporativo', type: 'email' },
          { key: 'ingresoTurno',   label: 'Ingreso a turno',    type: 'date'  },
          { key: 'salidaTurno',    label: 'Salida de turno',    type: 'date'  },
        ].map(c => (
          <div key={c.key} style={{ marginBottom: '10px' }}>
            <label style={styles.label}>{c.label}</label>
            <input style={styles.input} type={c.type} value={form[c.key] ?? ''} onChange={e => setForm(f => ({ ...f, [c.key]: e.target.value }))} />
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

function TarjetaOperador({ operador, numero, onEditar, onToggleEstado, onVerFoto, role }) {
  const [abierto, setAbierto] = useState(false)
  const enFaena = operador.estado === 'faena'

  return (
    <div style={{ ...styles.card, borderColor: enFaena ? 'var(--gl-ok)' : 'var(--gl-border)' }}>
      {/* Cabecera acordeón */}
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

      {/* Contenido expandible */}
      {abierto && (
        <div style={styles.cardBody}>
          <div style={styles.accionesHeader}>
            <button
              onClick={() => onToggleEstado(numero)}
              style={{ ...styles.btnEstado, background: enFaena ? 'var(--gl-ok-tint)' : 'var(--gl-border)' }}
            >
              {enFaena ? '🎮 En faena' : '😴 En descanso'}
            </button>
            {role === 'admin' && (
              <button onClick={() => onEditar(numero)} style={styles.btnEditar}>Editar</button>
            )}
          </div>

          {operador.nombre ? (
            <>
              {[
                { label: 'RUT',               valor: operador.rut },
                { label: 'Teléfono',          valor: operador.telefono },
                { label: 'Correo personal',   valor: operador.correoPersonal },
                { label: 'Correo corporativo',valor: operador.correoCorp },
                { label: 'Ingreso a turno',   valor: operador.ingresoTurno },
                { label: 'Salida de turno',   valor: operador.salidaTurno },
              ].map((f, i) => (
                <div key={i} style={styles.campo}>
                  <span style={styles.campoLabel}>{f.label}</span>
                  <span style={styles.campoValor}>{f.valor || '—'}</span>
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
  const [op1, setOp1]               = useState({})
  const [op2, setOp2]               = useState({})
  const [cargando, setCargando]     = useState(true)
  const [editando, setEditando]     = useState(null)
  const [form, setForm]             = useState({})
  const [fotoPreview, setFotoPreview] = useState(null)
  const [verFoto, setVerFoto]       = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    const cargar = async () => {
      const ref  = doc(db, 'centros', centro.id, 'datos', 'operadores')
      const snap = await getDoc(ref)
      if (snap.exists()) {
        setOp1(snap.data().op1 ?? {})
        setOp2(snap.data().op2 ?? {})
      }
      setCargando(false)
    }
    cargar()
  }, [centro.id])

  const guardar = async (nuevoOp1, nuevoOp2) => {
    const ref = doc(db, 'centros', centro.id, 'datos', 'operadores')
    await setDoc(ref, { op1: nuevoOp1, op2: nuevoOp2 })
  }

  const handleEditar = (numero) => {
    const op = numero === 1 ? op1 : op2
    setForm(op)
    setFotoPreview(op.foto ?? null)
    setEditando(numero)
  }

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setFotoPreview(ev.target.result)
      setForm(f => ({ ...f, foto: ev.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleGuardar = async () => {
    if (editando === 1) { const nuevo = { ...form }; setOp1(nuevo); await guardar(nuevo, op2) }
    else                { const nuevo = { ...form }; setOp2(nuevo); await guardar(op1, nuevo) }
    setEditando(null); setForm({}); setFotoPreview(null)
  }

  const handleToggleEstado = async (numero) => {
    if (numero === 1) {
      const nuevo = { ...op1, estado: op1.estado === 'faena' ? 'descanso' : 'faena' }
      setOp1(nuevo); await guardar(nuevo, op2)
    } else {
      const nuevo = { ...op2, estado: op2.estado === 'faena' ? 'descanso' : 'faena' }
      setOp2(nuevo); await guardar(op1, nuevo)
    }
  }

  if (cargando) return <p style={{ color: 'var(--gl-text-muted)', fontSize: '13px' }}>Cargando...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <TarjetaOperador operador={op1} numero={1} onEditar={handleEditar} onToggleEstado={handleToggleEstado} onVerFoto={setVerFoto} role={role} />
      <TarjetaOperador operador={op2} numero={2} onEditar={handleEditar} onToggleEstado={handleToggleEstado} onVerFoto={setVerFoto} role={role} />

      {verFoto && (
        <div style={styles.fotoModalOverlay} onClick={() => setVerFoto(null)}>
          <img src={verFoto} alt="foto operador" style={styles.fotoGrande} />
        </div>
      )}

      {editando && (
        <FormOperador
          titulo={`Operador ${editando}`}
          form={form} setForm={setForm}
          fotoPreview={fotoPreview} fileRef={fileRef} handleFoto={handleFoto}
          onGuardar={handleGuardar}
          onCerrar={() => { setEditando(null); setForm({}); setFotoPreview(null) }}
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