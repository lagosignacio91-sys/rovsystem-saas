// Modal "Personalizar app" — solo admin. Permite reordenar/ocultar/renombrar
// el menú principal y las pestañas del centro, y ajustar la marca
// (nombre, color, logo). Guarda en config/app (Firestore).
import { useState } from 'react'
import { X, Check, RotateCcw, Image as ImageIcon, Plus } from 'lucide-react'
import { t } from '../../theme/tokens'
import { useAppConfig } from '../../hooks/useAppConfig'
import { generarId, NIVELES_PERMISO, NIVEL_LABEL } from '../../config/appDefaults'
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
  const { tabs, nav, branding, listas, permisos, camposOperador, guardarConfig } = useAppConfig()
  const [navDraft, setNavDraft]   = useState(nav)
  const [tabsDraft, setTabsDraft] = useState(tabs)
  const [marca, setMarca]         = useState(branding)
  const [inspDraft, setInspDraft] = useState(listas.inspeccionRov)
  const [permDraft, setPermDraft] = useState(permisos)
  const [opDraft, setOpDraft]     = useState(camposOperador)
  const [nuevaSeccion, setNuevaSeccion] = useState('')
  const [guardando, setGuardando] = useState(false)

  const agregarSeccion = () => {
    const txt = nuevaSeccion.trim()
    if (!txt) return
    setInspDraft((l) => [...l, { id: generarId(txt), label: txt }])
    setNuevaSeccion('')
  }

  const setPermiso = (tabId, role, nivel) =>
    setPermDraft((p) => ({ ...p, [tabId]: { ...p[tabId], [role]: nivel } }))

  const guardar = async () => {
    setGuardando(true)
    try {
      await guardarConfig({
        nav:  navDraft.map(({ id, label, hidden, order }) => ({ id, label, hidden, order })),
        tabs: tabsDraft.map(({ id, label, hidden, order }) => ({ id, label, hidden, order })),
        branding: marca,
        listas: { inspeccionRov: inspDraft.map(({ id, label }) => ({ id, label })) },
        permisos: permDraft,
        camposOperador: opDraft.map(({ id, label, hidden, order }) => ({ id, label, hidden, order })),
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

          {/* ---- Secciones de inspección ROV ---- */}
          <Seccion titulo="Secciones de inspección (turno)" sub="Lo que el operador revisa en cada equipo · arrastra, renombra o elimina">
            <ListaOrdenable items={inspDraft} onChange={setInspDraft} conOcultar={false} conEliminar />
            <div style={s.addRow}>
              <input value={nuevaSeccion} onChange={(e) => setNuevaSeccion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && agregarSeccion()}
                placeholder="Nueva sección de inspección…" style={s.textInput} />
              <button onClick={agregarSeccion} style={s.addBtn} aria-label="Agregar sección"><Plus size={16} /></button>
            </div>
          </Seccion>

          {/* ---- Campos del operador ---- */}
          <Seccion titulo="Campos del operador" sub="Arrastra para reordenar · ojo para ocultar · escribe para renombrar (el nombre va siempre en la cabecera)">
            <ListaOrdenable items={opDraft} onChange={setOpDraft} />
          </Seccion>

          {/* ---- Permisos por pestaña ---- */}
          <Seccion titulo="Permisos por pestaña" sub="Qué puede hacer cada rol en cada pestaña del centro">
            <div style={s.permHead}>
              <span style={{ flex: 1 }} />
              <span style={s.permCol}>Operador</span>
              <span style={s.permCol}>Admin</span>
            </div>
            {tabsDraft.map((tab) => (
              <div key={tab.id} style={s.permRow}>
                <span style={s.permName}>{tab.label}</span>
                <select value={permDraft[tab.id]?.operador ?? 'edit'} onChange={(e) => setPermiso(tab.id, 'operador', e.target.value)} style={s.select}>
                  {NIVELES_PERMISO.map((n) => <option key={n} value={n}>{NIVEL_LABEL[n]}</option>)}
                </select>
                <select value={permDraft[tab.id]?.admin ?? 'edit'} onChange={(e) => setPermiso(tab.id, 'admin', e.target.value)} style={s.select}>
                  {NIVELES_PERMISO.filter((n) => n !== 'hidden').map((n) => <option key={n} value={n}>{NIVEL_LABEL[n]}</option>)}
                </select>
              </div>
            ))}
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
  addRow:  { display: 'flex', gap: 8, marginTop: 8 },
  addBtn:  { background: 'var(--gl-brand)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 12px', flexShrink: 0 },
  permHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  permCol: { width: 92, textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--gl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  permRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: '1px solid var(--gl-border)' },
  permName: { flex: 1, fontSize: 13, color: 'var(--gl-text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  select:  { width: 92, flexShrink: 0, background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 7, color: 'var(--gl-text-primary)', fontSize: 12, padding: '6px 6px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' },
  footer:  { display: 'flex', gap: 8, padding: 16, borderTop: '1px solid var(--gl-border)', justifyContent: 'flex-end' },
}
