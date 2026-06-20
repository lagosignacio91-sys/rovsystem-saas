import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import { CENTROS, ESTADO_META } from '../data/centros'

const FILTROS = [
  { key: 'todos',            label: 'Todos' },
  { key: 'OK',               label: 'Operativo' },
  { key: 'LOW_STOCK',        label: 'Stock bajo' },
  { key: 'EQUIPMENT_FAULT',  label: 'Falla' },
  { key: 'DISPATCH_ONWAY',   label: 'En camino' },
  { key: 'NO_OPERATOR',      label: 'Sin operador' },
]

function EstadoBadge({ estado }) {
  const m = ESTADO_META[estado]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 50, background: m.tint, border: `1px solid ${m.color}`, fontSize: 11, fontWeight: 600, color: m.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
      {m.label}
    </span>
  )
}

export default function CentrosDemo() {
  const [filtro, setFiltro] = useState('todos')
  const navigate = useNavigate()

  const lista = filtro === 'todos' ? CENTROS : CENTROS.filter(c => c.estado === filtro)

  const conteo = Object.fromEntries(
    Object.keys(ESTADO_META).map(k => [k, CENTROS.filter(c => c.estado === k).length])
  )

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.titulo}>Centros</h1>
          <p style={s.sub}>{CENTROS.length} centros monitoreados en tiempo real</p>
        </div>
      </div>

      {/* Filtros */}
      <div style={s.filtros}>
        {FILTROS.map(f => {
          const count = f.key === 'todos' ? CENTROS.length : (conteo[f.key] ?? 0)
          const active = filtro === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              style={{ ...s.filtroBtn, ...(active ? s.filtroActive : {}) }}
            >
              {f.label}
              {count > 0 && <span style={{ ...s.badge, ...(active ? s.badgeActive : {}) }}>{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div style={s.grid}>
        {lista.map(centro => {
          const m = ESTADO_META[centro.estado]
          return (
            <div key={centro.id} style={{ ...s.card, borderColor: m.color + '40' }}>
              <div style={s.cardTop}>
                <div style={s.cardInfo}>
                  <div style={s.cardEmpresa}>{centro.empresa}</div>
                  <div style={s.cardNombre}>{centro.nombre}</div>
                </div>
                <EstadoBadge estado={centro.estado} />
              </div>

              <div style={s.cardBody}>
                <div style={s.fila}>
                  <span style={s.filaLabel}>Operador</span>
                  <span style={s.filaVal}>
                    {centro.operador
                      ? <><span style={{ color: centro.operador.estado === 'faena' ? '#22c55e' : '#6b7280' }}>●</span> {centro.operador.nombre}</>
                      : <span style={{ color: '#6b7280' }}>Sin asignar</span>
                    }
                  </span>
                </div>
                <div style={s.fila}>
                  <span style={s.filaLabel}>ROV</span>
                  <span style={s.filaVal}>{centro.equipos.rov}</span>
                </div>
                <div style={s.fila}>
                  <span style={s.filaLabel}>Último despacho</span>
                  <span style={s.filaVal}>{centro.ultimoDespacho}</span>
                </div>
              </div>

              <button style={s.cardBtn} onClick={() => navigate('/despachos')}>
                <Package size={13} />
                Ver despachos
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s = {
  page:        { padding: 24, maxWidth: 1100, margin: '0 auto' },
  header:      { marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  titulo:      { fontSize: 22, fontWeight: 800, color: 'var(--gl-text-primary)', marginBottom: 2 },
  sub:         { fontSize: 13, color: 'var(--gl-text-muted)' },
  filtros:     { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  filtroBtn:   { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: 50, fontSize: 12, fontWeight: 500, color: 'var(--gl-text-secondary)', cursor: 'pointer', transition: 'all 0.15s' },
  filtroActive:{ background: 'var(--gl-brand-tint)', border: '1px solid var(--gl-brand)', color: 'var(--gl-brand-soft)' },
  badge:       { background: 'var(--gl-bg-hover)', padding: '1px 7px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: 'var(--gl-text-muted)' },
  badgeActive: { background: 'var(--gl-brand)', color: '#fff' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  card:        { background: 'var(--gl-bg-surface)', border: '1px solid', borderRadius: 12, overflow: 'hidden', transition: 'transform 0.15s' },
  cardTop:     { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px 10px' },
  cardInfo:    {},
  cardEmpresa: { fontSize: 10, fontWeight: 700, color: 'var(--gl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 },
  cardNombre:  { fontSize: 16, fontWeight: 700, color: 'var(--gl-text-primary)' },
  cardBody:    { padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid var(--gl-border)' },
  fila:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  filaLabel:   { fontSize: 11, color: 'var(--gl-text-muted)', flexShrink: 0 },
  filaVal:     { fontSize: 12, color: 'var(--gl-text-secondary)', fontWeight: 500, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 4 },
  cardBtn:     { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px 0', background: 'none', border: 'none', color: 'var(--gl-text-muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'color 0.15s' },
}
