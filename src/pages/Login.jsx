import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { t } from '../theme/tokens'
import ThemeToggle from '../components/kit/ThemeToggle'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [verPass, setVerPass]   = useState(false)
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await signIn(email, password)
    if (error) {
      const code = error.code ?? ''
      if (code.includes('wrong-password')) setError('Clave incorrecta. Verifica tus datos e intenta de nuevo.')
      else if (code.includes('user-not-found') || code.includes('invalid-email')) setError('Correo no registrado.')
      else setError('Correo o clave incorrectos.')
    }
    setLoading(false)
  }

  const passError = error?.toLowerCase().includes('clave')

  return (
    <div style={s.wrapper}>
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}><ThemeToggle /></div>

      <div style={s.card}>
        <div style={s.head}>
          <div style={s.logoWrap}><img src="/logo.png" alt="GL Robótica Submarina" style={s.logo} /></div>
          <h1 style={s.title}>GL App</h1>
          <p style={s.sub}>Robótica Submarina · Aysén</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={s.label}>Correo electrónico</label>
            <div style={s.inputBox(false)}>
              <Mail size={16} color={t.textMuted} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@empresa.cl" required style={s.input} />
            </div>
          </div>

          <div>
            <label style={s.label}>Contraseña</label>
            <div style={s.inputBox(passError)}>
              <Lock size={16} color={passError ? t.fault : t.textMuted} />
              <input type={verPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={s.input} />
              <button type="button" onClick={() => setVerPass(v => !v)} className="gl-icon-btn" style={{ padding: 2 }} aria-label={verPass ? 'Ocultar' : 'Mostrar'}>
                {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={s.errorBox}>
              <AlertCircle size={16} color={t.fault} style={{ flexShrink: 0 }} />
              <span style={{ color: t.fault, fontSize: t.textXs }}>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="gl-btn gl-btn--primary gl-btn--lg" style={{ marginTop: 4 }}>
            {loading ? 'Ingresando...' : <>Ingresar <ArrowRight size={16} /></>}
          </button>
        </form>
      </div>
    </div>
  )
}

const s = {
  wrapper: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden', padding: 20,
    background: `linear-gradient(rgba(6,13,26,0.55), rgba(6,13,26,0.78)), url('/login-bg.jpg') center/cover no-repeat, ${t.bgBase}`,
  },
  card:    { position: 'relative', zIndex: 1, background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusXl, padding: 32, width: '100%', maxWidth: 380, boxShadow: t.shadowLg },
  head:    { textAlign: 'center', marginBottom: 24 },
  logoWrap:{ width: 84, height: 84, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', padding: 8, boxShadow: t.shadowMd },
  logo:    { width: '100%', height: '100%', objectFit: 'contain' },
  title:   { color: t.textPrimary, fontFamily: "'Sora', sans-serif", fontSize: 30, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' },
  sub:     { color: t.brandSoft, fontSize: t.textSm, fontWeight: 500, margin: 0, letterSpacing: '0.02em' },
  label:   { color: t.textSecondary, fontSize: t.textXs, fontWeight: 500, display: 'block', marginBottom: 5 },
  inputBox: (err) => ({ display: 'flex', alignItems: 'center', gap: 8, background: t.bgInput, border: `1px solid ${err ? t.fault : t.border}`, borderRadius: t.radiusMd, padding: '10px 12px', boxShadow: err ? `0 0 0 3px ${t.faultTint}` : 'none' }),
  input:   { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.textPrimary, fontSize: t.textBase, minWidth: 0 },
  errorBox:{ display: 'flex', alignItems: 'center', gap: 7, background: t.faultTint, border: `1px solid ${t.fault}`, borderRadius: t.radiusMd, padding: '8px 11px' },
}
