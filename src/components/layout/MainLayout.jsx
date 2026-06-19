import { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Menu, X, Clock, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useCentros } from '../../hooks/useCentros'
import { useDespachosGlobal } from '../../hooks/useDespachosGlobal'
import { useAppConfig } from '../../hooks/useAppConfig'
import { useEmpresas } from '../../hooks/useEmpresas'
import { NAV_META } from '../../config/appDefaults'
import { t } from '../../theme/tokens'
import { useReloj } from '../../hooks/useReloj'
import ThemeToggle from '../kit/ThemeToggle'
import SelectorEmpresa from '../ui/SelectorEmpresa'
import ModalPersonalizar from '../admin/ModalPersonalizar'
import { ToastProvider, toast } from '../ui/Toast'
import './layout.css'

export default function MainLayout() {
  const { user, role, teamId, empresaId, nombre, signOut } = useAuth()
  const { nav, branding }       = useAppConfig()
  const centrosState            = useCentros()

  const onNuevaSolicitud = useCallback((d) => {
    toast.solicitud(`Nueva solicitud de ${d.centroNombre ?? 'un centro'}`)
  }, [])
  const onDespachoCambia = useCallback((d) => {
    if (role === 'operador' && (d.estado === 'enviado' || d.estado === 'parcial')) {
      toast.despacho(`Despacho en camino a ${d.centroNombre ?? 'tu centro'}`)
    }
  }, [role])

  const { pendientes } = useDespachosGlobal({ role, teamId, onNuevaSolicitud, onDespachoCambia })
  const { empresas }            = useEmpresas()
  const [empresaActiva, setEmpresaActiva] = useState(null)
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [personalizar, setPersonalizar]   = useState(false)
  const { horaStr, fechaStr }   = useReloj()
  const location                = useLocation()

  // Para operadores: auto-aplicar la empresa que les corresponde (sin que puedan cambiarla)
  useEffect(() => {
    if (role === 'operador' && empresaId && empresas.length > 0 && !empresaActiva) {
      const emp = empresas.find(e => e.id === empresaId)
      if (emp) setEmpresaActiva(emp)
    }
  }, [role, empresaId, empresas, empresaActiva])

  const usuarioLabel = nombre || user?.email?.split('@')[0] || ''
  const inicial = (usuarioLabel[0] ?? '?').toUpperCase()
  const badges  = { despachos: pendientes.length }

  // Solo ítems visibles, ya ordenados; combina datos de config + meta de código.
  // Filtra además por rol: un ítem con `roles` solo se muestra si el rol actual está incluido.
  const navVisible = nav
    .filter((n) => NAV_META[n.id] && (!n.hidden || !!NAV_META[n.id].roles))
    .filter((n) => !NAV_META[n.id].roles || NAV_META[n.id].roles.includes(role))
    .map((n) => ({ ...NAV_META[n.id], id: n.id, label: n.label }))

  const navActual = navVisible.find((n) => n.id === location.pathname)
  const titulo    = navActual ? navActual.label : (branding.appName || 'GL Robótica')

  const cambiarEmpresa = (e) => { setEmpresaActiva(e); setDrawerOpen(false) }

  const navItems = (onClick) => navVisible.map(({ to, label, icon: Icon, end, badgeKey, id }) => (
    <div key={id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <NavLink to={to} end={end} onClick={onClick}
        className={({ isActive }) => `gl-nav-item ${isActive ? 'active' : ''}`}
        style={{ flex: 1 }}>
        <Icon size={19} strokeWidth={2} />
        <span style={{ flex: 1 }}>{label}</span>
        {badgeKey && badges[badgeKey] > 0 && <span className="gl-nav-badge">{badges[badgeKey]}</span>}
      </NavLink>
      {role === 'admin' && (
        <button
          className="gl-icon-btn gl-nav-config-btn"
          onClick={(e) => { e.stopPropagation(); setPersonalizar(true) }}
          title="Personalizar app"
          aria-label="Configurar"
          style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: 4, opacity: 0, flexShrink: 0 }}>
          <SlidersHorizontal size={12} />
        </button>
      )}
    </div>
  ))

  return (
    <div className="gl-shell">
      {/* Scrim móvil */}
      <div className={`gl-drawer-scrim ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />

      {/* Sidebar / Drawer */}
      <aside className={`gl-sidebar ${drawerOpen ? 'open' : ''}`}>
        <div style={brandBox}>
          <div style={logoWrap}><img src={branding.logoDataUrl || '/logo.png'} alt="GL" style={logoImg} /></div>
          <div style={{ lineHeight: 1.25 }}>
            <div className="gl-display" style={{ fontSize: t.textBase, fontWeight: 600, color: t.textPrimary }}>{branding.appName || 'GL Robótica'}</div>
            <div className="gl-label" style={{ fontSize: 10, color: t.accentSoft }}>Aysén · Chile</div>
          </div>
          <button className="gl-icon-btn gl-menu-btn" style={{ marginLeft: 'auto' }} onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú"><X size={18} /></button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: t.space3 }}>
          {navItems(() => setDrawerOpen(false))}
        </nav>

        <div style={userBox}>
          <div style={avatar}>{inicial}</div>
          <div style={{ flex: 1, lineHeight: 1.25, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuarioLabel}</div>
            <div style={{ fontSize: 9, color: t.textMuted, textTransform: 'capitalize' }}>{role ?? '—'}</div>
          </div>
          <button className="gl-icon-btn" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={16} /></button>
        </div>
      </aside>

      {/* Columna principal */}
      <div className="gl-main">
        <header className="gl-topbar">
          <button className="gl-icon-btn gl-menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Abrir menú"><Menu size={20} /></button>
          <div className="gl-display" style={{ fontSize: t.textLg, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{titulo}</div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
            {role === 'admin'
              ? <SelectorEmpresa empresaActiva={empresaActiva} onCambiar={cambiarEmpresa} role={role} />
              : empresaActiva && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.brandSoft, background: t.brandTint, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '4px 10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                    {empresaActiva.nombre}
                  </span>
                )
            }
          </div>
          <div className="gl-topbar-clock" style={relojBox}>
            <Clock size={14} color={t.brandSoft} />
            <div style={{ lineHeight: 1.1 }}>
              <div className="gl-mono" style={{ fontSize: 13, fontWeight: 600, color: t.accentSoft, textShadow: '0 0 10px var(--gl-accent-tint)' }}>{horaStr}</div>
              <div style={{ fontSize: 9, color: t.textMuted, textTransform: 'capitalize' }}>{fechaStr}</div>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className="gl-content">
          <Outlet context={{ ...centrosState, role, uid: user?.uid, teamId, empresaActiva }} />
        </main>

        {/* Bottom nav móvil */}
        <nav className="gl-bottomnav">
          {navVisible.map(({ to, label, icon: Icon, end, badgeKey, id }) => (
            <NavLink key={id} to={to} end={end}
              className={({ isActive }) => `gl-bottomnav-item ${isActive ? 'active' : ''}`}>
              <Icon size={20} strokeWidth={2} />
              <span>{label}</span>
              {badgeKey && badges[badgeKey] > 0 && <span className="gl-dot" />}
            </NavLink>
          ))}
        </nav>
      </div>

      {personalizar && <ModalPersonalizar onCerrar={() => setPersonalizar(false)} />}
      <ToastProvider />
    </div>
  )
}

const brandBox = { display: 'flex', alignItems: 'center', gap: 9, padding: '2px 4px 12px', borderBottom: `1px solid ${t.border}` }
const logoWrap = { width: 34, height: 34, borderRadius: 10, background: '#fff', padding: 3, flexShrink: 0 }
const logoImg  = { width: '100%', height: '100%', objectFit: 'contain', borderRadius: 7 }
const userBox  = { marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: `1px solid ${t.border}` }
const avatar   = { width: 30, height: 30, borderRadius: '50%', background: t.brandTint, color: t.brandSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }
const relojBox = { display: 'flex', alignItems: 'center', gap: 7, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '5px 10px', flexShrink: 0 }
