import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { t } from '../theme/tokens'
import { validarEmail } from '../lib/validaciones'

export default function CompletarPerfilPage({ onGuardar }) {
  const navigate  = useNavigate()
  const [correo, setCorreo]     = useState('')
  const [error, setError]       = useState('')
  const [cargando, setCargando] = useState(false)

  const handleGuardar = async () => {
    const valor = correo.trim()
    if (!validarEmail(valor)) { setError('Ingresa un correo válido'); return }
    setError('')
    setCargando(true)
    await onGuardar(valor)
    navigate('/', { replace: true })
  }

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <div style={s.header}>
          <Mail size={22} color={t.brand} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h1 style={s.titulo}>Completa tu perfil</h1>
            <p style={s.subtitulo}>Necesitamos tu correo personal para contactarte fuera del correo corporativo.</p>
          </div>
        </div>

        <input
          type="email"
          value={correo}
          onChange={(e) => { setCorreo(e.target.value); setError('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleGuardar() }}
          placeholder="tu.correo@gmail.com"
          autoFocus
          style={s.input}
        />
        {error && <p style={s.error}>{error}</p>}

        <button
          onClick={handleGuardar}
          disabled={cargando}
          className="gl-btn gl-btn--primary gl-btn--lg"
          style={{ marginTop: 16 }}
        >
          {cargando ? 'Guardando...' : 'Guardar y continuar'}
        </button>
      </div>
    </div>
  )
}

const s = {
  wrapper: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px 16px', background: t.bgBase,
  },
  card: {
    width: '100%', maxWidth: 440, background: t.bgElevated,
    border: `1px solid ${t.border}`, borderRadius: t.radiusXl,
    padding: '28px 32px', display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20,
    paddingBottom: 16, borderBottom: `1px solid ${t.border}`,
  },
  titulo:    { color: t.textPrimary, fontSize: 17, fontWeight: 700, margin: '0 0 5px' },
  subtitulo: { color: t.textMuted, fontSize: t.textXs, margin: 0, lineHeight: 1.5 },
  input: {
    background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radiusMd,
    padding: '11px 14px', fontSize: t.textSm, color: t.textPrimary, outline: 'none',
  },
  error: { color: '#ef4444', fontSize: t.textXs, margin: '8px 0 0' },
}
