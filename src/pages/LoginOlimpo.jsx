import { useState, useEffect } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import '../styles/olimpo.css'

export default function LoginOlimpo() {
  const { signIn, signOut, role, user } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [verPass,  setVerPass]  = useState(false)
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [waitingForRole, setWaitingForRole] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  // Después del login, espera a que llegue el rol y verifica acceso
  useEffect(() => {
    if (!waitingForRole || !user || role === null) return
    if (role !== 'owner' && role !== 'ventas') {
      signOut()
      setError('Acceso no autorizado. Este panel es exclusivo para cuentas HyperionX.')
    }
    setWaitingForRole(false)
  }, [role, user, waitingForRole])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      const code = signInError.code ?? ''
      if (code.includes('wrong-password') || code.includes('invalid-credential')) {
        setError('Correo o clave incorrectos.')
      } else if (code.includes('user-not-found') || code.includes('invalid-email')) {
        setError('Correo no registrado en este panel.')
      } else {
        setError('No se pudo iniciar sesión. Intenta de nuevo.')
      }
      setLoading(false)
      return
    }
    // signIn OK — esperar a que useAuth cargue el rol desde Firestore
    setWaitingForRole(true)
    setLoading(false)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!resetEmail) return
    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setResetSent(true)
    } catch {
      setError('No se encontró una cuenta con ese correo.')
      setShowReset(false)
    }
  }

  return (
    <div className="hx-olimpo" style={s.wrapper}>
      <div style={s.card}>

        <div style={s.head}>
          <img src="/hyperionx-hx.png" alt="HyperionX" style={s.logo}
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <h1 style={s.title}>OLIMPO</h1>
          <p style={s.sub}>PANEL MAESTRO · HYPERIONX</p>
        </div>

        {!showReset ? (
          <>
            <form onSubmit={handleSubmit} style={s.form}>
              <div>
                <label style={s.label}>Correo electrónico</label>
                <div style={s.inputBox(false)}>
                  <Mail size={16} style={{ color: 'var(--hx-muted)', flexShrink: 0 }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="correo@hyperionx.tech"
                    required
                    style={s.input}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label style={s.label}>Contraseña</label>
                <div style={s.inputBox(false)}>
                  <Lock size={16} style={{ color: 'var(--hx-muted)', flexShrink: 0 }} />
                  <input
                    type={verPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={s.input}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setVerPass(v => !v)}
                    style={s.eyeBtn}
                    aria-label={verPass ? 'Ocultar' : 'Mostrar'}
                  >
                    {verPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={s.errorBox}>
                  <AlertCircle size={15} style={{ color: 'var(--hx-accent)', flexShrink: 0 }} />
                  <span style={s.errorText}>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || waitingForRole}
                style={s.btn}
              >
                {(loading || waitingForRole) ? 'Verificando...' : <><span>Ingresar</span><ArrowRight size={16} /></>}
              </button>
            </form>

            <button
              type="button"
              onClick={() => { setShowReset(true); setResetEmail(email); setError(null) }}
              style={s.forgotBtn}
            >
              ¿Olvidaste tu clave?
            </button>
          </>
        ) : resetSent ? (
          <div style={s.resetSuccessBox}>
            <CheckCircle2 size={28} style={{ color: 'var(--hx-green)', marginBottom: 10 }} />
            <p style={{ color: 'var(--hx-text)', fontSize: 14, margin: '0 0 6px' }}>Correo enviado</p>
            <p style={{ color: 'var(--hx-text-dim)', fontSize: 12, margin: '0 0 18px' }}>
              Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu clave.
            </p>
            <button onClick={() => { setShowReset(false); setResetSent(false) }} style={s.backBtn}>
              Volver al login
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} style={s.form}>
            <p style={{ color: 'var(--hx-text-dim)', fontSize: 13, margin: '0 0 16px' }}>
              Ingresa tu correo HyperionX y te enviaremos un enlace para restablecer tu clave.
            </p>
            <div>
              <label style={s.label}>Correo electrónico</label>
              <div style={s.inputBox(false)}>
                <Mail size={16} style={{ color: 'var(--hx-muted)', flexShrink: 0 }} />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="correo@hyperionx.tech"
                  required
                  style={s.input}
                  autoFocus
                />
              </div>
            </div>
            {error && (
              <div style={s.errorBox}>
                <AlertCircle size={15} style={{ color: 'var(--hx-accent)', flexShrink: 0 }} />
                <span style={s.errorText}>{error}</span>
              </div>
            )}
            <button type="submit" style={s.btn}>Enviar enlace</button>
            <button
              type="button"
              onClick={() => { setShowReset(false); setError(null) }}
              style={s.backBtn}
            >
              Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const s = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--hx-bg)',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: 'var(--hx-panel)',
    border: '1px solid var(--hx-border)',
    borderRadius: 14,
    padding: '36px 32px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
  },
  head: {
    textAlign: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 64,
    height: 64,
    objectFit: 'contain',
    display: 'block',
    margin: '0 auto 14px',
    filter: 'drop-shadow(0 0 12px rgba(204,16,32,0.4))',
  },
  title: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--hx-accent)',
    margin: '0 0 4px',
    letterSpacing: '0.08em',
  },
  sub: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.12em',
    color: 'var(--hx-muted)',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--hx-text-dim)',
    letterSpacing: '0.06em',
    marginBottom: 6,
  },
  inputBox: () => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--hx-border)',
    borderRadius: 8,
    padding: '10px 12px',
    transition: 'border-color 0.15s',
  }),
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--hx-text)',
    fontSize: 14,
    minWidth: 0,
    fontFamily: 'inherit',
  },
  eyeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--hx-muted)',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    background: 'rgba(204,16,32,0.10)',
    border: '1px solid rgba(204,16,32,0.28)',
    borderRadius: 8,
    padding: '9px 11px',
  },
  errorText: {
    color: 'var(--hx-red-soft)',
    fontSize: 12,
    lineHeight: 1.5,
  },
  btn: {
    marginTop: 4,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'var(--hx-accent)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.04em',
    padding: '12px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  forgotBtn: {
    display: 'block',
    width: '100%',
    marginTop: 14,
    background: 'none',
    border: 'none',
    color: 'var(--hx-muted)',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
    padding: 0,
  },
  backBtn: {
    display: 'block',
    width: '100%',
    marginTop: 8,
    background: 'none',
    border: '1px solid var(--hx-border)',
    borderRadius: 8,
    color: 'var(--hx-text-dim)',
    fontSize: 13,
    cursor: 'pointer',
    padding: '10px',
  },
  resetSuccessBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    paddingTop: 8,
  },
}
