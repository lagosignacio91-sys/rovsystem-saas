import { NavLink, useNavigate } from 'react-router-dom'
import { Map, Building2, Package } from 'lucide-react'

const NAV = [
  { to: '/mapa',      icon: Map,       label: 'Mapa' },
  { to: '/centros',   icon: Building2, label: 'Centros' },
  { to: '/despachos', icon: Package,   label: 'Despachos' },
]

export default function SidebarDemo({ cliente }) {
  const navigate = useNavigate()

  return (
    <aside style={s.sidebar}>
      <div style={s.brand} onClick={() => navigate('/mapa')} title="Volver al mapa">
        <div style={s.brandLogo}>⬡</div>
        <div>
          <div style={s.brandName}>RovSystem</div>
          <div style={s.brandSub}>by HyperionX</div>
        </div>
      </div>

      <div style={s.empresa}>
        <div style={s.empresaLabel}>EMPRESA</div>
        <div style={s.empresaNombre}>{cliente || 'Demo Empresa S.A.'}</div>
      </div>

      <nav style={s.nav}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({ ...s.navItem, ...(isActive ? s.navActive : {}) })}
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={s.footer}>
        <div style={s.footerDot} />
        <span style={s.footerText}>MODO DEMO</span>
      </div>
    </aside>
  )
}

const s = {
  sidebar:      { width: 200, flexShrink: 0, background: 'var(--gl-bg-surface)', borderRight: '1px solid var(--gl-border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 },
  brand:        { display: 'flex', alignItems: 'center', gap: 10, padding: '18px 16px 14px', borderBottom: '1px solid var(--gl-border)', cursor: 'pointer' },
  brandLogo:    { fontSize: 22, color: 'var(--gl-brand)', lineHeight: 1 },
  brandName:    { fontSize: 13, fontWeight: 700, color: 'var(--gl-text-primary)', letterSpacing: '-0.02em' },
  brandSub:     { fontSize: 10, color: 'var(--gl-text-muted)', letterSpacing: '0.03em' },
  empresa:      { padding: '12px 16px', borderBottom: '1px solid var(--gl-border)' },
  empresaLabel: { fontSize: 9, fontWeight: 700, color: 'var(--gl-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 },
  empresaNombre:{ fontSize: 12, fontWeight: 600, color: 'var(--gl-accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  nav:          { flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2 },
  navItem:      { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, color: 'var(--gl-text-secondary)', fontSize: 13, fontWeight: 500, transition: 'background 0.15s' },
  navActive:    { background: 'var(--gl-brand-tint)', color: 'var(--gl-brand-soft)' },
  footer:       { padding: '12px 16px', borderTop: '1px solid var(--gl-border)', display: 'flex', alignItems: 'center', gap: 8 },
  footerDot:    { width: 7, height: 7, borderRadius: '50%', background: 'var(--gl-accent)', boxShadow: '0 0 6px var(--gl-accent)' },
  footerText:   { fontSize: 10, fontWeight: 700, color: 'var(--gl-text-muted)', letterSpacing: '0.06em' },
}
