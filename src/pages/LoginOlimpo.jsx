import { useState, useEffect } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'

export default function LoginOlimpo() {
  const { signIn, signOut, role, user } = useAuth()
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [showPass,       setShowPass]       = useState(false)
  const [error,          setError]          = useState(null)
  const [loading,        setLoading]        = useState(false)
  const [waitingForRole, setWaitingForRole] = useState(false)
  const [view,           setView]           = useState('login') // 'login' | 'reset' | 'sent'
  const [resetEmail,     setResetEmail]     = useState('')

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
    setWaitingForRole(true)
    setLoading(false)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!resetEmail) return
    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setView('sent')
    } catch {
      setError('No se encontró una cuenta con ese correo.')
      setView('login')
    }
  }

  const loginTheme = localStorage.getItem('app-theme') || 'gold'

  return (
    <>
      <style>{CSS}</style>
      <div className={`hxl-root${loginTheme === 'gold' ? ' gold' : ''}`}>
        <div className="hxl-overlay" />
        <div className="hxl-col">
        <div className="hxl-col-inner">

          {/* LOGO */}
          <div className="hxl-logo-wrap hxl-fade-up" style={{ animationDelay: '0.05s' }}>
            <img
              src="/olimpo-logo.png"
              alt="HyperionX"
              className="hxl-logo"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </div>

          {/* SUBTITLE */}
          <div className="hxl-subtitle-wrap hxl-fade-up" style={{ animationDelay: '0.10s' }}>
            <p className="hxl-subtitle">Panel Maestro · HyperionX</p>
          </div>

          {/* ── STATE: LOGIN ── */}
          {view === 'login' && (
            <div className="hxl-fade-up" style={{ animationDelay: '0.15s' }}>
              <form onSubmit={handleSubmit}>
                <div className="hxl-field">
                  <span className="hxl-field-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </span>
                  <input
                    className="hxl-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Correo electrónico"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="hxl-field">
                  <span className="hxl-field-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                  <input
                    className="hxl-input"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" className="hxl-field-icon-right" onClick={() => setShowPass(v => !v)}>
                    {showPass ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>

                {error && (
                  <div className="hxl-error hxl-fade-up">
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" className="hxl-btn" disabled={loading || waitingForRole}>
                  {(loading || waitingForRole) ? 'Verificando...' : 'Ingresar'}
                </button>
              </form>

              <div className="hxl-forgot-wrap">
                <button
                  type="button"
                  className="hxl-forgot"
                  onClick={() => { setView('reset'); setResetEmail(email); setError(null) }}
                >
                  ¿Olvidaste tu clave?
                </button>
              </div>
            </div>
          )}

          {/* ── STATE: RESET ── */}
          {view === 'reset' && (
            <div className="hxl-fade-up">
              <p className="hxl-reset-desc">Ingresa tu correo y te enviaremos un enlace para restablecer tu clave.</p>
              <form onSubmit={handleReset}>
                <div className="hxl-field">
                  <span className="hxl-field-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </span>
                  <input
                    className="hxl-input"
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="Correo electrónico"
                    autoFocus
                    required
                  />
                </div>
                <button type="submit" className="hxl-btn">Enviar enlace</button>
                <button
                  type="button"
                  className="hxl-btn hxl-btn-ghost"
                  onClick={() => { setView('login'); setError(null) }}
                >
                  Cancelar
                </button>
              </form>
            </div>
          )}

          {/* ── STATE: SENT ── */}
          {view === 'sent' && (
            <div className="hxl-sent hxl-fade-up">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.80)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="hxl-check-pop">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <path d="m9 11 3 3L22 4"/>
              </svg>
              <h2 className="hxl-sent-title">ENLACE ENVIADO</h2>
              <p className="hxl-sent-desc">Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu clave.</p>
              <button
                type="button"
                className="hxl-btn hxl-btn-ghost"
                onClick={() => { setView('login'); setResetEmail('') }}
              >
                Volver al login
              </button>
            </div>
          )}

        </div>
        </div>

        <div className="hxl-footer">
          <a href="/politica-de-privacidad" className="hxl-footer-link">Política de Privacidad</a>
          <span className="hxl-footer-sep">·</span>
          <a href="/terminos-de-uso" className="hxl-footer-link">Términos de Uso</a>
        </div>
      </div>
    </>
  )
}

const CSS = `
  @keyframes hxlFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes hxlCheckPop {
    0%   { opacity: 0; transform: scale(.3); }
    65%  { transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }

  .hxl-root {
    position: fixed;
    inset: 0;
    overflow-y: auto;
    background: #000 url('/olimpo-bg.jpg') center center / contain no-repeat;
    font-family: 'Inter', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Tema dorado (default de Olimpo) — mantiene imagen de fondo */
  .hxl-root.gold .hxl-overlay { background: rgba(247,247,245,0.60); }
  .hxl-root.gold .hxl-subtitle { color: rgba(17,17,17,0.42); }
  .hxl-root.gold .hxl-input { color: #111; border-bottom-color: rgba(0,0,0,0.18); }
  .hxl-root.gold .hxl-input::placeholder { color: rgba(17,17,17,0.32); }
  .hxl-root.gold .hxl-input:focus { border-bottom-color: #96720a; }
  .hxl-root.gold .hxl-input:-webkit-autofill {
    -webkit-text-fill-color: #111;
    -webkit-box-shadow: 0 0 0 40px #f7f7f5 inset;
  }
  .hxl-root.gold .hxl-field-icon { color: rgba(17,17,17,0.30); }
  .hxl-root.gold .hxl-field-icon-right { color: rgba(17,17,17,0.30); }
  .hxl-root.gold .hxl-field-icon-right:hover { color: rgba(17,17,17,0.70); }
  .hxl-root.gold .hxl-btn {
    border-color: rgba(150,114,10,0.55);
    color: #96720a;
  }
  .hxl-root.gold .hxl-btn:hover { background: rgba(150,114,10,0.06); border-color: #96720a; }
  .hxl-root.gold .hxl-btn-ghost { border-color: rgba(17,17,17,0.15); color: rgba(17,17,17,0.45); }
  .hxl-root.gold .hxl-btn-ghost:hover { border-color: rgba(17,17,17,0.35); color: rgba(17,17,17,0.75); }
  .hxl-root.gold .hxl-forgot { color: rgba(17,17,17,0.35); }
  .hxl-root.gold .hxl-forgot:hover { color: rgba(17,17,17,0.70); }
  .hxl-root.gold .hxl-error { border-left-color: #96720a; }
  .hxl-root.gold .hxl-error span { color: rgba(185,28,28,0.90); }
  .hxl-root.gold .hxl-reset-desc { color: rgba(17,17,17,0.42); }
  .hxl-root.gold .hxl-sent-title { color: #111; }
  .hxl-root.gold .hxl-sent-desc { color: rgba(17,17,17,0.40); }
  .hxl-root.gold .hxl-logo { filter: none; opacity: 1; }
  .hxl-root.gold svg[stroke="rgba(255,255,255,.80)"] { stroke: #111; }

  .hxl-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: rgba(0,0,0,.48);
  }
  .hxl-col {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
    width: 360px;
    max-width: calc(100vw - 48px);
    text-align: center;
  }
  .hxl-col-inner {
    animation: hxlFadeUp .8s cubic-bezier(.16,1,.3,1) both;
  }
  .hxl-fade-up {
    animation: hxlFadeUp .6s ease both;
  }

  /* LOGO */
  .hxl-logo-wrap { text-align: center; margin-bottom: 20px; }
  .hxl-logo {
    width: 110px;
    height: auto;
    display: inline-block;
    filter: brightness(1.8) contrast(1.05) drop-shadow(0 2px 18px rgba(255,255,255,.18)) drop-shadow(0 0 8px rgba(0,0,0,.55));
    opacity: .90;
  }

  /* SUBTITLE */
  .hxl-subtitle-wrap { text-align: center; margin-bottom: 32px; }
  .hxl-subtitle {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    font-weight: 400;
    letter-spacing: .32em;
    color: rgba(255,255,255,.38);
    margin: 0;
    text-transform: uppercase;
  }

  /* INPUTS */
  .hxl-field { position: relative; margin-bottom: 20px; }
  .hxl-field-icon {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255,255,255,.32);
    pointer-events: none;
    display: flex;
    align-items: center;
  }
  .hxl-field-icon-right {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(255,255,255,.32);
    padding: 4px;
    display: flex;
    align-items: center;
    transition: color .15s;
  }
  .hxl-field-icon-right:hover { color: rgba(255,255,255,.70); }
  .hxl-input {
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(255,255,255,.22);
    outline: none;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 300;
    padding: 10px 28px 10px 28px;
    letter-spacing: .02em;
    transition: border-color .2s;
  }
  .hxl-input::placeholder { color: rgba(255,255,255,.32); font-size: 13px; letter-spacing: .06em; }
  .hxl-input:focus { border-bottom-color: rgba(255,255,255,.70); }
  .hxl-input:-webkit-autofill {
    -webkit-text-fill-color: #fff;
    -webkit-box-shadow: 0 0 0 40px #000 inset;
  }

  /* ERROR */
  .hxl-error {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    border-left: 2px solid #cc1020;
    padding: 8px 12px;
    margin-bottom: 24px;
  }
  .hxl-error span {
    color: rgba(248,113,113,.90);
    font-size: 12px;
    line-height: 1.55;
    letter-spacing: .01em;
  }

  /* BUTTONS */
  .hxl-btn {
    width: 100%;
    background: transparent;
    border: 1px solid rgba(255,255,255,.55);
    color: #fff;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: .22em;
    padding: 14px;
    cursor: pointer;
    text-transform: uppercase;
    transition: background .18s, border-color .18s;
    border-radius: 0;
    margin-top: 8px;
    display: block;
  }
  .hxl-btn:hover { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.85); }
  .hxl-btn:disabled { opacity: .5; cursor: not-allowed; }
  .hxl-btn-ghost {
    border-color: rgba(255,255,255,.15);
    color: rgba(255,255,255,.45);
    font-size: 13px;
    font-weight: 400;
    letter-spacing: .18em;
    margin-top: 12px;
  }
  .hxl-btn-ghost:hover { border-color: rgba(255,255,255,.35); color: rgba(255,255,255,.75); }

  /* FORGOT */
  .hxl-forgot-wrap { text-align: center; margin-top: 22px; }

  .hxl-footer {
    margin-top: 28px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .hxl-footer-link {
    font-size: 11px;
    letter-spacing: 0.04em;
    color: rgba(255,255,255,0.35);
    text-decoration: none;
    transition: color .2s;
  }
  .hxl-footer-link:hover { color: rgba(255,255,255,0.70); }
  .hxl-footer-sep { color: rgba(255,255,255,0.20); font-size: 11px; }

  .hxl-root.gold .hxl-footer-link { color: rgba(17,17,17,0.30); }
  .hxl-root.gold .hxl-footer-link:hover { color: rgba(17,17,17,0.65); }
  .hxl-root.gold .hxl-footer-sep { color: rgba(17,17,17,0.15); }
  .hxl-forgot {
    background: none;
    border: none;
    color: rgba(255,255,255,.35);
    font-family: 'Inter', sans-serif;
    font-size: 11.5px;
    cursor: pointer;
    letter-spacing: .04em;
    text-decoration: underline;
    text-underline-offset: 3px;
    padding: 0;
    transition: color .15s;
  }
  .hxl-forgot:hover { color: rgba(255,255,255,.70); }

  /* RESET */
  .hxl-reset-desc {
    color: rgba(255,255,255,.42);
    font-size: 13px;
    line-height: 1.7;
    margin: 0 0 32px;
    font-weight: 300;
  }

  /* SENT */
  .hxl-sent { text-align: center; }
  .hxl-check-pop { margin-bottom: 24px; animation: hxlCheckPop .5s cubic-bezier(.16,1,.3,1) both; }
  .hxl-sent-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 26px;
    font-weight: 500;
    letter-spacing: .10em;
    color: #fff;
    margin: 0 0 10px;
  }
  .hxl-sent-desc {
    color: rgba(255,255,255,.40);
    font-size: 13px;
    line-height: 1.7;
    margin: 0 0 32px;
    font-weight: 300;
  }
`
