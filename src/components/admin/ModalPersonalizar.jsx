// Modal "Personalizar app" — solo admin. Permite reordenar/ocultar/renombrar
// el menú principal y las pestañas del centro, y ajustar la marca
// (nombre, color, logo). Guarda en config/app (Firestore).
import { useState } from 'react'
import { X, Check, RotateCcw, Image as ImageIcon } from 'lucide-react'
import { t } from '../../theme/tokens'
import { useAppConfig } from '../../hooks/useAppConfig'
import ListaOrdenable from './ListaOrdenable'

function fileADataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function ModalPersonalizar({ onCerrar }) {
  const { tabs, nav, branding, guardarConfig } = useAppConfig()
  const [navDraft, setNavDraft]   = useState(nav)
  const [tabsDraft, setTabsDraft] = useState(tabs)
  const [marca, setMarca]         = useState(branding)
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    setGuardando(true)
    try {
      await guardarConfig({
        nav:  navDraft.map(({ id, label, hidden, order }) => ({ id, label, hidden, order })),
        tabs: tabsDraft.map(({ id, label, hidden, order }) => ({ id, label, hidden, order })),
        branding: marca,
      })
      onCerrar()
    } catch (e) {
      console.error('No se pudo guardar la personalización', e)
      alert('No se pudo guardar. ¿Tienes rol de administrador?')
      setGuardando(false)
    }
  }

  const subirLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileADataURL(file)
    setMarca((m) => ({ ...m, logoDataUrl: dataUrl }))
  }

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <span style={s.title}>Personalizar app</span>
          <button className="gl-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div style={s.body}>
          {/* ---- Marca ---- */}
          <Seccion titulo="Marca">
            <label style={s.lbl}>Nombre de la app</label>
            <input value={marca.appName} onChange={(e) => setMarca((m) => ({ ...m, appName: e.target.value }))}
              style={s.textInput} placeholder="GL App" />

            <label style={{ ...s.lbl, marginTop: 12 }}>Color de marca</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={marca.brandColor || '#2563eb'}
                onChange={(e) => setMarca((m) => ({ ...m, brandColor: e.target.value }))}
                style={s.color} aria-label="Color de marca" />
              <span style={{ fontSize: 12, color: t.textSecondary }}>{marca.brandColor || 'color del tema'}</span>
              {marca.brandColor && (
                <button onClick={() => setMarca((m) => ({ ...m, brandColor: '' }))} style={s.reset} title="Usar color del tema">
                  <RotateCcw size={13} /> Restablecer
                </button>
              )}
            </div>

            <label style={{ ...s.lbl, marginTop: 12 }}>Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={s.logoBox}>
                <img src={marca.logoDataUrl || '/logo.png'} alt="logo" style={s.logoImg} />
              </div>
              <label style={s.upload}>
                <ImageIcon size={14} /> Cambiar logo
                <input type="file" accept="image/*" onChange={subirLogo} style={{ display: 'none' }} />
              </label>
              {marca.logoDataUrl && (
                <button onClick={() => setMarca((m) => ({ ...m, logoDataUrl: '' }))} style={s.reset} title="Usar logo original">
                  <RotateCcw size={13} /> Original
                </button>
              )}
            </div>
          </Seccion>

          {/* ---- Menú principal ---- */}
          <Seccion titulo="Menú principal" sub="Arrastra para reordenar · ojo para ocultar · escribe para renombrar">
            <ListaOrdenable items={navDraft} onChange={setNavDraft} />
          </Seccion>

          {/* ---- Pestañas del centro ---- */}
          <Seccion titulo="Pestañas del centro" sub="Arrastra para reordenar · ojo para ocultar · escribe para renombrar">
            <ListaOrdenable items={tabsDraft} onChange={setTabsDraft} />
          </Seccion>
        </div>

        <div style={s.footer}>
          <button className="gl-btn gl-btn--secondary gl-btn--md" onClick={onCerrar}>Cancelar</button>
          <button className="gl-btn gl-btn--primary gl-btn--md" onClick={guardar} disabled={guardando}>
            <Check size={16} /> {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Seccion({ titulo, sub, children }) {
  return (
    <div style={s.seccion}>
      <div style={s.secTitulo}>{titulo}</div>
      {sub && <div style={s.secSub}>{sub}</div>}
      {children}
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'var(--gl-scrim)', zIndex: 9300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal:   { background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '90dvh', display: 'flex', flexDirection: 'column' },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--gl-border)' },
  title:   { fontSize: 15, fontWeight: 700, color: 'var(--gl-text-primary)' },
  body:    { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 18 },
  seccion: { display: 'flex', flexDirection: 'column' },
  secTitulo: { fontSize: 13, fontWeight: 700, color: 'var(--gl-text-primary)', marginBottom: 2 },
  secSub:  { fontSize: 11, color: 'var(--gl-text-muted)', marginBottom: 10 },
  lbl:     { fontSize: 11, color: 'var(--gl-text-secondary)', fontWeight: 500, marginBottom: 5, display: 'block' },
  textInput: { width: '100%', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, color: 'var(--gl-text-primary)', fontSize: 13, padding: '9px 11px', outline: 'none', fontFamily: 'inherit' },
  color:   { width: 44, height: 32, border: '1px solid var(--gl-border)', borderRadius: 8, background: 'none', cursor: 'pointer', padding: 2 },
  reset:   { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid var(--gl-border)', borderRadius: 7, color: 'var(--gl-text-secondary)', fontSize: 11, padding: '4px 8px', cursor: 'pointer' },
  logoBox: { width: 44, height: 44, borderRadius: 10, background: '#fff', padding: 4, flexShrink: 0, border: '1px solid var(--gl-border)' },
  logoImg: { width: '100%', height: '100%', objectFit: 'contain' },
  upload:  { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--gl-brand-tint)', border: '1px solid var(--gl-brand-soft)', color: 'var(--gl-brand-soft)', borderRadius: 8, fontSize: 12, fontWeight: 600, padding: '7px 11px', cursor: 'pointer' },
  footer:  { display: 'flex', gap: 8, padding: 16, borderTop: '1px solid var(--gl-border)', justifyContent: 'flex-end' },
}
