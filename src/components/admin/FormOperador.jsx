import { useState, useRef } from 'react'
import { comprimirFoto } from '../../lib/compressorFotos'
import { useEmpresas } from '../../hooks/useEmpresas'
import { validarRut, validarEmail } from '../../lib/validaciones'

const CAMPOS = [
  { key: 'nombre',            label: 'Nombre completo *',       type: 'text',  requerido: true },
  { key: 'rut',               label: 'RUT *',                   type: 'text',  requerido: true },
  { key: 'telefono',          label: 'Teléfono',                type: 'text'  },
  { key: 'correoCorporativo', label: 'Correo corporativo *',    type: 'email', requerido: true },
  { key: 'area',              label: 'Área',                    type: 'text'  },
  { key: 'proveedor',         label: 'Proveedor',               type: 'text'  },
]

export default function FormOperador({ inicial, esEdicion, onGuardar, onCerrar }) {
  const { empresas }                  = useEmpresas()
  const [form, setForm]               = useState(inicial ?? { rol: 'operador', esRelevo: false, estado: 'pendiente' })
  const [password, setPassword]       = useState('')
  const [fotoPreview, setFotoPreview] = useState(inicial?.foto ?? null)
  const [guardando, setGuardando]     = useState(false)
  const [errorLocal, setErrorLocal]   = useState('')
  const fileRef                       = useRef()

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleFoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const b64 = await comprimirFoto(file)
    setFotoPreview(b64)
    set('foto', b64)
  }

  const handleSubmit = async () => {
    if (!form.nombre?.trim())            return setErrorLocal('El nombre es obligatorio')
    if (!form.rut?.trim())               return setErrorLocal('El RUT es obligatorio')
    if (!validarRut(form.rut))           return setErrorLocal('RUT inválido. Formato: 12345678-K')
    if (!form.correoCorporativo?.trim()) return setErrorLocal('El correo corporativo es obligatorio')
    if (!validarEmail(form.correoCorporativo)) return setErrorLocal('Correo corporativo inválido')
    if (!esEdicion && !password.trim())  return setErrorLocal('La contraseña inicial es obligatoria')

    setErrorLocal('')
    setGuardando(true)
    await onGuardar(form, password)
    setGuardando(false)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.titulo}>{esEdicion ? 'Editar operador' : 'Nuevo operador'}</h3>
          <button onClick={onCerrar} style={styles.btnX}>✕</button>
        </div>

        {/* Foto */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={styles.fotoCirculo} onClick={() => fileRef.current.click()}>
            {fotoPreview
              ? <img src={fotoPreview} alt="foto" style={styles.fotoImg} />
              : <span style={styles.fotoPlaceholder}>📷</span>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} />
          <span style={styles.fotoHint}>Toca para subir foto</span>
        </div>

        {/* Campos básicos */}
        {CAMPOS.map(c => (
          <div key={c.key} style={styles.campoWrap}>
            <label style={styles.label}>{c.label}</label>
            <input
              style={styles.input}
              type={c.type}
              value={form[c.key] ?? ''}
              onChange={e => set(c.key, e.target.value)}
              disabled={esEdicion && c.key === 'correoCorporativo'}
            />
          </div>
        ))}

        {/* Contraseña inicial (solo crear) */}
        {!esEdicion && (
          <div style={styles.campoWrap}>
            <label style={styles.label}>Contraseña inicial * <span style={styles.hint}>(misma del correo corporativo)</span></label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
        )}

        {/* Empresa */}
        <div style={styles.campoWrap}>
          <label style={styles.label}>Empresa</label>
          <select style={styles.select} value={form.empresaId ?? ''} onChange={e => set('empresaId', e.target.value || null)}>
            <option value="">— Sin empresa —</option>
            {empresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nombre}</option>
            ))}
          </select>
        </div>

        {/* Team y rol */}
        <div style={styles.fila}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Número de Team</label>
            <input
              style={styles.input}
              type="text"
              placeholder="team01, team08..."
              value={form.teamId ?? ''}
              onChange={e => set('teamId', e.target.value.trim() || null)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Rol</label>
            <select style={styles.select} value={form.rol ?? 'operador'} onChange={e => set('rol', e.target.value)}>
              <option value="operador">Operador</option>
              <option value="apertura">Apertura</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner (HyperionX)</option>
            </select>
          </div>
        </div>

        {/* Estado y relevo */}
        <div style={styles.fila}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Estado</label>
            <select style={styles.select} value={form.estado ?? 'pendiente'} onChange={e => set('estado', e.target.value)}>
              <option value="activo">Activo</option>
              <option value="descanso">En descanso</option>
              <option value="pendiente">Pendiente asignación</option>
            </select>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
            <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={form.esRelevo ?? false}
                onChange={e => set('esRelevo', e.target.checked)}
                style={{ accentColor: '#3b82f6', width: '14px', height: '14px' }}
              />
              Es operador relevo
            </label>
          </div>
        </div>

        {/* Acceso móvil (licencia por usuario) */}
        <div style={styles.movilBox}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.movilHabilitado ?? false}
              onChange={e => set('movilHabilitado', e.target.checked)}
              style={{ accentColor: '#22c55e', width: '18px', height: '18px' }}
            />
            <span>
              <span style={{ display: 'block', color: '#f1f5f9', fontSize: '13px', fontWeight: 600 }}>📱 Acceso móvil habilitado</span>
              <span style={{ display: 'block', color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                Permite usar la app en teléfono. Si está apagado, en el celular verá la pantalla para contratar.
              </span>
            </span>
          </label>
        </div>

        {errorLocal && <p style={styles.error}>{errorLocal}</p>}

        <div style={styles.btns}>
          <button onClick={onCerrar} style={styles.btnCancelar}>Cancelar</button>
          <button onClick={handleSubmit} style={styles.btnConfirmar} disabled={guardando}>
            {guardando ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Crear operador'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' },
  modal:        { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  titulo:       { color: '#f1f5f9', fontSize: '16px', fontWeight: '700' },
  btnX:         { background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px', lineHeight: '1' },
  fotoCirculo:  { width: '72px', height: '72px', borderRadius: '50%', background: '#0f172a', border: '2px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 auto 4px', overflow: 'hidden' },
  fotoImg:      { width: '100%', height: '100%', objectFit: 'cover' },
  fotoPlaceholder:{ fontSize: '24px' },
  fotoHint:     { color: '#475569', fontSize: '10px' },
  campoWrap:    { marginBottom: '12px' },
  label:        { color: '#94a3b8', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' },
  hint:         { color: '#475569', fontWeight: '400', fontSize: '10px' },
  input:        { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '13px', padding: '8px 10px', outline: 'none', boxSizing: 'border-box' },
  select:       { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '13px', padding: '8px 10px', outline: 'none', boxSizing: 'border-box' },
  fila:         { display: 'flex', gap: '12px', marginBottom: '12px' },
  movilBox:     { marginBottom: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '12px' },
  error:        { color: '#ef4444', fontSize: '12px', marginBottom: '12px', background: '#1f0a0a', border: '1px solid #7f1d1d', borderRadius: '6px', padding: '8px 10px' },
  btns:         { display: 'flex', gap: '12px', marginTop: '16px' },
  btnCancelar:  { flex: 1, background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', padding: '9px', cursor: 'pointer', fontSize: '13px' },
  btnConfirmar: { flex: 2, background: '#2563eb', border: 'none', color: '#fff', borderRadius: '8px', padding: '9px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
}
