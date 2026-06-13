import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Map, Building2, Package, Users, LogOut, Menu, X, Clock } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useCentros } from '../../hooks/useCentros'
import { useDespachosGlobal } from '../../hooks/useDespachosGlobal'
import { t } from '../../theme/tokens'
import { useReloj } from '../../hooks/useReloj'
import ThemeToggle from '../kit/ThemeToggle'
import SelectorEmpresa from '../ui/SelectorEmpresa'
import './layout.css'

const NAV = [
  { to: '/',            label: 'Mapa',       icon: Map,        end: true },
  { to: '/centros',     label: 'Centros',    icon: Building2 },
  { to: '/despachos',   label: 'Despachos',  icon: Package, badgeKey: 'despachos' },
  { to: '/operadores',  label: 'Operadores', icon: Users },
]

const TITULOS = {
  '/':            'Mapa de centros',
  '/centros':     'Centros',
  '/despachos':   'Despachos',
  '/operadores':  'Operadores',
}

export default function MainLayout() {
  const { user, role, signOut } = useAuth()
  const centrosState            = useCentros()
  const { pendientes }          = useDespachosGlobal()
  const [empresaActiva, setEmpresaActiva] = useState(null)
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const { horaStr, fechaStr }   = useReloj()
  const location                = useLocation()

  const usuario = user?.email?.split('@')[0] ?? ''
  const inicial = (usuario[0] ?? '?').toUpperCase()
  const titulo  = TITULOS[location.pathname] ?? 'GL Robótica'
  const badges  = { despachos: pendientes.length }

  const cambiarEmpresa = (e) => { setEmpresaActiva(e); setDrawerOpen(false) }

  const navItems = (onClick) => NAV.map(({ to, label, icon: Icon, end, badgeKey }) => (
    <NavLink key={to} to={to} end={end} onClick={onClick}
      className={({ isActive }) => `gl-nav-item ${isActive ? 'active' : ''}`}>
      <Icon size={19} strokeWidth={2} />
      <span>{label}</span>
      {badgeKey && badges[badgeKey] > 0 && <span className="gl-nav-badge">{badges[badgeKey]}</span>}
    </NavLink>
  ))

  return (
    <div className="gl-shell">
      {/* Scrim móvil */}
      <div className={`gl-drawer-scrim ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />

      {/* Sidebar / Drawer */}
      <aside className={`gl-sidebar ${drawerOpen ? 'open' : ''}`}>
        <div style={brandBox}>
          <div style={logoWrap}><img src="/logo.png" alt="GL" style={logoImg} /></div>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary }}>GL Robótica</div>
            <div style={{ fontSize: 10, color: t.brandSoft }}>Aysén · Chile</div>
          </div>
          <button className="gl-icon-btn gl-menu-btn" style={{ marginLeft: 'auto' }} onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú"><X size={18} /></button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: t.space3 }}>
          {navItems(() => setDrawerOpen(false))}
        </nav>

        <div style={userBox}>
          <div style={avatar}>{inicial}</div>
          <div style={{ flex: 1, lineHeight: 1.25, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario}</div>
            <div style={{ fontSize: 9, color: t.textMuted, textTransform: 'capitalize' }}>{role ?? '—'}</div>
          </div>
          <button className="gl-icon-btn" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={16} /></button>
        </div>
      </aside>

      {/* Columna principal */}
      <div className="gl-main">
        <header className="gl-topbar">
          <button className="gl-icon-btn gl-menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Abrir menú"><Menu size={20} /></button>
          <div style={{ fontSize: t.textBase, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>{titulo}</div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
            <SelectorEmpresa empresaActiva={empresaActiva} onCambiar={cambiarEmpresa} role={role} />
          </div>
          <div style={relojBox}>
            <Clock size={14} color={t.brandSoft} />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: t.brandSoft }}>{horaStr}</div>
              <div style={{ fontSize: 9, color: t.textMuted, textTransform: 'capitalize' }}>{fechaStr}</div>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className="gl-content">
          <Outlet context={{ ...centrosState, role, empresaActiva }} />
        </main>

        {/* Bottom nav móvil */}
        <nav className="gl-bottomnav">
          {NAV.map(({ to, label, icon: Icon, end, badgeKey }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `gl-bottomnav-item ${isActive ? 'active' : ''}`}>
              <Icon size={20} strokeWidth={2} />
              <span>{label}</span>
              {badgeKey && badges[badgeKey] > 0 && <span className="gl-dot" />}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

const brandBox = { display: 'flex', alignItems: 'center', gap: 9, padding: '2px 4px 12px', borderBottom: `1px solid ${t.border}` }
const logoWrap = { width: 34, height: 34, borderRadius: 10, background: '#fff', padding: 3, flexShrink: 0 }
const logoImg  = { width: '100%', height: '100%', objectFit: 'contain', borderRadius: 7 }
const userBox  = { marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: `1px solid ${t.border}` }
const avatar   = { width: 30, height: 30, borderRadius: '50%', background: t.brandTint, color: t.brandSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }
const relojBox = { display: 'flex', alignItems: 'center', gap: 7, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '5px 10px', flexShrink: 0 }
