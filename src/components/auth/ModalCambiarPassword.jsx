import { useState } from 'react'
import { Modal, Button } from '../kit'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

// Traduce los códigos de error de Firebase Auth a mensajes claros en español.
function mensajeError(code) {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'La contraseña actual no es correcta.'
    case 'auth/weak-password':
      return 'La nueva contraseña debe tener al menos 6 caracteres.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.'
    case 'auth/requires-recent-login':
      return 'Por seguridad, vuelve a iniciar sesión y cámbiala de nuevo.'
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet e intenta otra vez.'
    case 'auth/no-user':
      return 'No hay una sesión activa.'
    default:
      return 'No se pudo cambiar la contraseña. Intenta nuevamente.'
  }
}

export default function ModalCambiarPassword({ onCerrar }) {
  const { cambiarPassword } = useAuth()
  const [actual, setActual]       = useState('')
  const [nueva, setNueva]         = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [ver, setVer]             = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState('')
  const [ok, setOk]               = useState(false)

  // Validación local antes de tocar Firebase (mismo mínimo que exige Auth: 6+).
  const validar = () => {
    if (!actual)               return 'Ingresa tu contraseña actual.'
    if (nueva.length < 6)      return 'La nueva contraseña debe tener al menos 6 caracteres.'
    if (nueva !== confirmar)   return 'La nueva contraseña y su confirmación no coinciden.'
    if (nueva === actual)      return 'La nueva contraseña debe ser distinta de la actual.'
    return ''
  }

  const guardar = async () => {
    const motivo = validar()
    if (motivo) { setError(motivo); return }
    setError('')
    setGuardando(true)
    const { error: err } = await cambiarPassword(actual, nueva)
    setGuardando(false)
    if (err) { setError(mensajeError(err.code)); return }
    setOk(true)
    setTimeout(() => onCerrar(), 1400)
  }

  if (ok) {
    return (
      <Modal open title="Contraseña actualizada" onClose={onCerrar} maxWidth={380}>
        <div style={s.okBox}>
          <CheckCircle2 size={40} color="var(--gl-ok)" />
          <p style={s.okTxt}>Tu contraseña se cambió correctamente.</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open title="Cambiar contraseña" onClose={onCerrar} maxWidth={400}
      footer={<>
        <Button variant="secondary" size="lg" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button variant="primary" size="lg" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </>}>
      <div style={s.wrap}>
        <Campo label="Contraseña actual" valor={actual} onChange={setActual} ver={ver} autoFocus />
        <div style={s.divider} />
        <Campo label="Nueva contraseña" valor={nueva} onChange={setNueva} ver={ver} />
        <Campo label="Confirmar nueva contraseña" valor={confirmar} onChange={setConfirmar} ver={ver} />

        <button type="button" style={s.verBtn} onClick={() => setVer(v => !v)}>
          {ver ? <EyeOff size={13} /> : <Eye size={13} />}
          {ver ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
        </button>

        <p style={s.hint}>Mínimo 6 caracteres.</p>
        {error && <p style={s.error}>{error}</p>}
      </div>
    </Modal>
  )
}

function Campo({ label, valor, onChange, ver, autoFocus }) {
  return (
    <div style={s.campoWrap}>
      <label style={s.lbl}>{label}</label>
      <input
        type={ver ? 'text' : 'password'}
        value={valor}
        onChange={e => onChange(e.target.value)}
        autoFocus={autoFocus}
        autoComplete="off"
        style={s.input}
      />
    </div>
  )
}

const s = {
  wrap:      { display: 'flex', flexDirection: 'column', gap: 10 },
  divider:   { borderTop: '1px solid var(--gl-border)', margin: '2px 0' },
  campoWrap: { display: 'flex', flexDirection: 'column', gap: 3 },
  lbl:       { fontSize: 10, fontWeight: 600, color: 'var(--gl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:     { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 7, color: 'var(--gl-text-primary)', fontSize: 13, padding: '8px 10px', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  verBtn:    { display: 'flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--gl-text-secondary)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: '2px 0' },
  hint:      { fontSize: 11, color: 'var(--gl-text-muted)', margin: '2px 0 0' },
  error:     { fontSize: 12, color: 'var(--gl-fault)', margin: '4px 0 0', lineHeight: 1.4, fontWeight: 600 },
  okBox:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '12px 0' },
  okTxt:     { fontSize: 13, color: 'var(--gl-text-primary)', margin: 0, textAlign: 'center' },
}
