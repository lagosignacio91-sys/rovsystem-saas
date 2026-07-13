import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Download, Share, CheckCircle2, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { t } from '../theme/tokens'
import ThemeToggle from '../components/kit/ThemeToggle'

export default function Login() {
  const { signIn } = useAuth()
  const { instalable, instalada, esIOS, instalar } = useInstallPrompt()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [verPass, setVerPass]   = useState(false)
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [verAyudaIOS, setVerAyudaIOS] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await signIn(email, password)
    if (error) {
      setError('Correo o clave incorrectos. Verifica tus datos e intenta de nuevo.')
    }
    setLoading(false)
  }

  const passError = !!error

  return (
    <div style={s.wrapper}>
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}><ThemeToggle /></div>

      <div style={s.form}>
        <div style={s.head}>
          <div style={s.logoWrap}>
            <img src="/hyperionx-symbol.png" alt="HyperionX" style={s.logo}
              onError={(e) => { e.currentTarget.src = '/logo.png' }} />
          </div>
          <h1 style={s.title}>ROVsystem <span style={s.titleSub}>/ HyperionX</span></h1>
          <p style={s.sub}>Licenciado para GL Robótica</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={s.inputBox(false)}>
            <Mail size={16} color="rgba(255,255,255,0.45)" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" required style={s.input} />
          </div>

          <div style={s.inputBox(passError)}>
            <Lock size={16} color={passError ? '#ff6b6b' : 'rgba(255,255,255,0.45)'} />
            <input type={verPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" required style={s.input} />
            <button type="button" onClick={() => setVerPass(v => !v)} style={s.eyeBtn} aria-label={verPass ? 'Ocultar' : 'Mostrar'}>
              {verPass ? <EyeOff size={16} color="rgba(255,255,255,0.45)" /> : <Eye size={16} color="rgba(255,255,255,0.45)" />}
            </button>
          </div>

          {error && (
            <div style={s.errorBox}>
              <AlertCircle size={14} color="#ff6b6b" style={{ flexShrink: 0 }} />
              <span style={{ color: '#ff6b6b', fontSize: 12 }}>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} style={s.submitBtn}>
            {loading ? 'Ingresando...' : <>Ingresar <ArrowRight size={15} /></>}
          </button>
        </form>

        {/* Instalar app (PWA) */}
        {!instalada && (instalable || esIOS) && (
          <div style={s.installWrap}>
            {instalable && (
              <button type="button" onClick={instalar} style={s.installBtn}>
                <Download size={15} /> Instalar app en este equipo
              </button>
            )}
            {!instalable && esIOS && (
              <button type="button" onClick={() => setVerAyudaIOS(true)} style={s.installBtn}>
                <Download size={15} /> Instalar app en el iPhone
              </button>
            )}
            <p style={s.installHint}>Quedará como una app, sin abrir el navegador.</p>
          </div>
        )}

        {instalada && (
          <div style={s.instaladaBox}>
            <CheckCircle2 size={14} color="rgba(255,255,255,0.5)" /> App instalada en este equipo
          </div>
        )}

        <p style={s.legalLinks}>
          <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={s.legalLink}>Política de Privacidad</a>
          {' · '}
          <a href="/terminos" target="_blank" rel="noopener noreferrer" style={s.legalLink}>Términos de Uso</a>
        </p>
      </div>

      {verAyudaIOS && (
        <div style={s.iosOverlay} onClick={() => setVerAyudaIOS(false)}>
          <div style={s.iosCard} onClick={e => e.stopPropagation()}>
            <div style={s.iosHead}>
              <span style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>Instalar en iPhone</span>
              <button onClick={() => setVerAyudaIOS(false)} className="gl-icon-btn" style={{ padding: 2 }}><X size={18} /></button>
            </div>
            <ol style={s.iosList}>
              <li>Toca el botón <Share size={14} style={{ verticalAlign: 'middle' }} /> <b>Compartir</b> en la barra de Safari.</li>
              <li>Desliza y elige <b>“Agregar a inicio”</b>.</li>
              <li>Confirma con <b>Agregar</b>. El ícono de RovSystem quedará en tu pantalla.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  wrapper: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden', padding: 20,
    background: `url('/fifish-ego.jpg') center/cover no-repeat`,
  },
  form: {
    position: 'relative', zIndex: 1, width: '100%', maxWidth: 340,
  },
  head:    { textAlign: 'center', marginBottom: 28 },
  logoWrap:{ width: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' },
  logo:    {
    width: '100%', height: 'auto', objectFit: 'contain', display: 'block',
    filter: [
      'drop-shadow(0 1px 0px rgba(255,255,255,0.25))',
      'drop-shadow(0 4px 8px rgba(0,0,0,0.8))',
      'drop-shadow(0 12px 32px rgba(0,0,0,0.6))',
      'drop-shadow(0 0 24px rgba(180,30,30,0.35))',
    ].join(' '),
    transform: 'perspective(400px) rotateX(6deg) scale(1.05)',
    transformOrigin: 'center bottom',
  },
  title:   { color: 'rgba(255,255,255,0.55)', fontSize: 32, fontWeight: 700, margin: '0 0 4px', textShadow: '0 2px 12px rgba(0,0,0,0.6)', letterSpacing: '-0.5px' },
  titleSub:{ color: 'rgba(255,255,255,0.55)', fontWeight: 400, fontSize: 22 },
  sub:     { color: '#000', margin: 0, fontSize: 13, fontWeight: 600 },
  inputBox: (err) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(0,0,0,0.35)',
    border: `1px solid ${err ? '#ff6b6b' : 'rgba(255,255,255,0.18)'}`,
    borderRadius: 10, padding: '12px 14px',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: err ? '0 0 0 2px rgba(255,107,107,0.3)' : 'none',
  }),
  input:   { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 15, minWidth: 0 },
  eyeBtn:  { background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' },
  errorBox:{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.4)', borderRadius: 8, padding: '8px 11px' },
  submitBtn: {
    marginTop: 4, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    color: '#fff', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
    transition: 'background 0.2s',
  },
  installWrap: { marginTop: 20, textAlign: 'center' },
  installBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' },
  installHint: { fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: '8px 0 0' },
  instaladaBox: { marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  iosOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  iosCard: { background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, width: '100%', maxWidth: 340, padding: 18 },
  iosHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  iosList: { margin: 0, paddingLeft: 20, color: t.textSecondary, fontSize: t.textSm, lineHeight: 1.7 },
  legalLinks: { marginTop: 18, textAlign: 'center', fontSize: 11, color: '#000' },
  legalLink:  { color: '#000', textDecoration: 'underline', textUnderlineOffset: 2 },
}
