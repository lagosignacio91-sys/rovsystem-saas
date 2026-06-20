import { useNavigate } from 'react-router-dom'

export default function LoginDemo({ cliente }) {
  const navigate = useNavigate()

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>⬡</div>
        <div style={s.titulo}>RovSystem</div>
        <div style={s.sub}>Sistema de Gestión ROV · Acuicultura</div>
        <div style={s.by}>by <strong>HyperionX</strong></div>

        {cliente && (
          <div style={s.clienteBadge}>
            Demo preparado para <strong>{cliente}</strong>
          </div>
        )}

        <button style={s.btn} onClick={() => navigate('/mapa')}>
          ENTRAR AL DEMO
        </button>

        <p style={s.disclaimer}>
          Entorno de demostración con datos ficticios.<br />
          No contiene información real de clientes.
        </p>
      </div>
    </div>
  )
}

const s = {
  wrap:         { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gl-bg-base)', padding: 16 },
  card:         { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 360, width: '100%' },
  logo:         { fontSize: 56, color: 'var(--gl-brand)', lineHeight: 1, marginBottom: 4, filter: 'drop-shadow(0 0 20px rgba(37,99,235,0.6))' },
  titulo:       { fontSize: 32, fontWeight: 800, color: 'var(--gl-text-primary)', letterSpacing: '-0.03em' },
  sub:          { fontSize: 13, color: 'var(--gl-text-secondary)', textAlign: 'center' },
  by:           { fontSize: 12, color: 'var(--gl-text-muted)' },
  clienteBadge: { marginTop: 8, padding: '8px 16px', background: 'var(--gl-brand-tint)', border: '1px solid var(--gl-brand)', borderRadius: 50, fontSize: 12, color: 'var(--gl-brand-soft)', textAlign: 'center' },
  btn:          { marginTop: 20, width: '100%', padding: '14px 0', background: 'var(--gl-brand)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '0.06em', cursor: 'pointer', boxShadow: '0 0 20px rgba(37,99,235,0.5)' },
  disclaimer:   { marginTop: 16, fontSize: 11, color: 'var(--gl-text-muted)', textAlign: 'center', lineHeight: 1.6 },
}
