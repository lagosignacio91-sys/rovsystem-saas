import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Search, Mail, Phone, Gamepad2, Coffee, Users, AtSign } from 'lucide-react'
import { t } from '../theme/tokens'
import { useOperadoresGlobal } from '../hooks/useOperadoresGlobal'

function ContactoRow({ icon: Icon, valor, href }) {
  const base = { fontSize: 10, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }
  const txt  = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  if (!valor) {
    return <div style={{ ...base, color: t.textMuted }}><Icon size={13} style={{ flexShrink: 0 }} /><span style={txt}>—</span></div>
  }
  return (
    <a href={href} style={{ ...base, color: t.brandSoft, textDecoration: 'none' }}
      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
      <Icon size={13} style={{ flexShrink: 0 }} /><span style={txt}>{valor}</span>
    </a>
  )
}

export default function OperadoresPage() {
  const { centros, empresaActiva } = useOutletContext()
  const lista = empresaActiva ? centros.filter(c => c.empresaId === empresaActiva.id) : centros
  const { operadores, cargando } = useOperadoresGlobal(lista)
  const [busca, setBusca] = useState('')

  let ops = operadores
  if (busca.trim()) {
    const q = busca.toLowerCase()
    ops = ops.filter(o => o.nombre?.toLowerCase().includes(q) || o.centroNombre?.toLowerCase().includes(q))
  }
  ops = [...ops].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''))

  const enFaenaCount   = ops.filter(o => o.estado === 'faena').length
  const enDescansoCount = ops.filter(o => o.estado !== 'faena').length

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: t.space5 }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* Stats */}
        {!cargando && operadores.length > 0 && (
          <div className="gl-stats-row">
            <span className="gl-stat-chip active" style={{ color: '#22c55e', borderColor: '#22c55e', background: 'rgba(34,197,94,0.1)', cursor: 'default' }}>
              <span className="gl-stat-dot" style={{ background: '#22c55e' }} /> En faena <span style={{ opacity: 0.65 }}>{enFaenaCount}</span>
            </span>
            <span className="gl-stat-chip" style={{ cursor: 'default' }}>
              <span className="gl-stat-dot" style={{ background: '#6b7280' }} /> En descanso <span style={{ opacity: 0.65 }}>{enDescansoCount}</span>
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '10px 13px', marginBottom: t.space4, minHeight: 44 }}>
          <Search size={16} color={t.textMuted} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar operador o centro..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.textPrimary, fontSize: t.textSm }} />
          <span style={{ fontSize: t.textXs, color: t.textMuted }}>{ops.length}</span>
        </div>

        {cargando && <p style={{ color: t.textMuted, fontSize: t.textSm }}>Cargando...</p>}
        {!cargando && ops.length === 0 && (
          <div style={{ textAlign: 'center', color: t.textMuted, padding: '48px 0', fontSize: t.textSm }}>
            <Users size={32} style={{ opacity: 0.5, marginBottom: 8 }} /><div>Sin operadores registrados.</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 11 }}>
          {ops.map((o, i) => {
            const enFaena = o.estado === 'faena'
            const inicial = (o.nombre?.[0] ?? '?').toUpperCase()
            return (
              <div key={o.centroId + i} style={{ background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, padding: 13 }}>
                <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {o.foto
                      ? <img src={o.foto} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${enFaena ? t.ok : t.border}` }} />
                      : <div style={{ width: 44, height: 44, borderRadius: '50%', background: t.brandTint, color: t.brandSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, border: `2px solid ${enFaena ? t.ok : t.border}` }}>{inicial}</div>}
                    <span style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: enFaena ? t.ok : t.noop, border: `2px solid ${t.bgElevated}` }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.nombre}</div>
                    <div style={{ fontSize: 10, color: enFaena ? t.ok : t.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      {enFaena ? <Gamepad2 size={12} /> : <Coffee size={12} />}
                      <span>{enFaena ? 'En faena' : 'En descanso'}</span>
                      {enFaena && o.centroNombre && <span style={{ opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>· {o.centroNombre}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 11, paddingTop: 10, borderTop: `1px solid ${t.border}` }}>
                  <ContactoRow icon={Phone} valor={o.telefono} href={o.telefono ? `tel:${o.telefono.replace(/[^\d+]/g, '')}` : null} />
                  <ContactoRow icon={Mail} valor={o.correoPersonal} href={o.correoPersonal ? `mailto:${o.correoPersonal}` : null} />
                  <ContactoRow icon={AtSign} valor={o.correoCorp} href={o.correoCorp ? `mailto:${o.correoCorp}` : null} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
