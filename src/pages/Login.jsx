import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Download, Share, CheckCircle2, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useAppConfig } from '../hooks/useAppConfig'
import { t } from '../theme/tokens'
import ThemeToggle from '../components/kit/ThemeToggle'

export default function Login() {
  const { signIn } = useAuth()
  const { branding } = useAppConfig()
  const cliente = branding.appName || 'GL Robótica'
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
      // Mensaje genérico para todos los errores de credenciales — evita enumeración de usuarios
      setError('Correo o clave incorrectos. Verifica tus datos e intenta de nuevo.')
    }
    setLoading(false)
  }

  const passError = !!error

  return (
    <div style={s.wrapper}>
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}><ThemeToggle /></div>

      <div className="gl-glass" style={s.card}>
        <div style={s.head}>
          <div style={s.logoWrap}>
            <img src="/hyperionx-symbol.png" alt="HyperionX" style={s.logo}
              onError={(e) => { e.currentTarget.src = '/logo.png' }} />
          </div>
          <h1 className="gl-display" style={s.title}>RovSystem</h1>
          <p className="gl-label" style={s.sub}>Licenciado para {cliente}</p>
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

        {/* Instalar app (PWA) */}
        {!instalada && (instalable || esIOS) && (
          <div style={s.installWrap}>
            {instalable && (
              <button type="button" onClick={instalar} style={s.installBtn}>
                <Download size={16} /> Instalar app en este equipo
              </button>
            )}
            {!instalable && esIOS && (
              <button type="button" onClick={() => setVerAyudaIOS(true)} style={s.installBtn}>
                <Download size={16} /> Instalar app en el iPhone
              </button>
            )}
            <p style={s.installHint}>Quedará como una app, sin abrir el navegador.</p>
          </div>
        )}

        {instalada && (
          <div style={s.instaladaBox}>
            <CheckCircle2 size={15} color={t.ok} /> App instalada en este equipo
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
    background: `linear-gradient(rgba(3,7,15,0.45), rgba(3,7,15,0.68)), url('/fifish-ego.jpg') center/cover no-repeat, ${t.bgBase}`,
  },
  card:    {
    position: 'relative', zIndex: 1, borderRadius: t.radiusXl, padding: 32, width: '100%', maxWidth: 380,
    boxShadow: t.shadowLg,
    // Login translúcido: se ve el E-Go de fondo a través del vidrio esmerilado.
    background: 'rgba(6,13,26,0.40)',
    backdropFilter: 'blur(20px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
    border: '1px solid rgba(255,255,255,0.12)',
  },
  head:    { textAlign: 'center', marginBottom: 24 },
  logoWrap:{ width: 128, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' },
  logo:    { width: '100%', height: 'auto', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.55))' },
  title:   { color: t.textPrimary, fontSize: 30, fontWeight: 700, margin: '0 0 6px' },
  sub:     { color: t.accentSoft, margin: 0 },
  label:   { color: t.textSecondary, fontSize: t.textXs, fontWeight: 500, display: 'block', marginBottom: 5 },
  inputBox: (err) => ({ display: 'flex', alignItems: 'center', gap: 8, background: t.bgInput, border: `1px solid ${err ? t.fault : t.border}`, borderRadius: t.radiusMd, padding: '10px 12px', boxShadow: err ? `0 0 0 3px ${t.faultTint}` : 'none' }),
  input:   { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.textPrimary, fontSize: t.textBase, minWidth: 0 },
  errorBox:{ display: 'flex', alignItems: 'center', gap: 7, background: t.faultTint, border: `1px solid ${t.fault}`, borderRadius: t.radiusMd, padding: '8px 11px' },
  installWrap: { marginTop: 18, paddingTop: 16, borderTop: `1px solid ${t.border}`, textAlign: 'center' },
  installBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: t.brandTint, border: `1px solid ${t.brandSoft}`, color: t.brandSoft, borderRadius: t.radiusMd, padding: '11px', fontSize: t.textSm, fontWeight: 600, cursor: 'pointer' },
  installHint: { fontSize: t.textXs, color: t.textMuted, margin: '8px 0 0' },
  instaladaBox: { marginTop: 18, paddingTop: 16, borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: t.textXs, color: t.textMuted },
  iosOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  iosCard: { background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, width: '100%', maxWidth: 340, padding: 18 },
  iosHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  iosList:    { margin: 0, paddingLeft: 20, color: t.textSecondary, fontSize: t.textSm, lineHeight: 1.7 },
  legalLinks: { marginTop: 16, textAlign: 'center', fontSize: 11, color: t.textMuted },
  legalLink:  { color: t.textMuted, textDecoration: 'underline', textUnderlineOffset: 2 },
}
