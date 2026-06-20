import { useState } from 'react'
import { Clock, Truck, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { DESPACHOS } from '../data/despachos'

const ESTADO_CONFIG = {
  pendiente: { icon: Clock,         color: '#eab308', tint: 'rgba(234,179,8,0.12)',   label: 'Pendiente',  btnLabel: 'Marcar Enviado',   next: 'enviado' },
  enviado:   { icon: Truck,         color: '#3b82f6', tint: 'rgba(59,130,246,0.12)',  label: 'En camino',  btnLabel: 'Confirmar Recibido', next: 'recibido' },
  recibido:  { icon: CheckCircle,   color: '#22c55e', tint: 'rgba(34,197,94,0.12)',   label: 'Recibido',   btnLabel: null,                next: null },
}

const FILTROS = [
  { key: 'todos',     label: 'Todos' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'enviado',   label: 'En camino' },
  { key: 'recibido',  label: 'Recibidos' },
]

function formatFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function DespachoCard({ despacho, onCambiarEstado }) {
  const [abierto, setAbierto] = useState(false)
  const cfg = ESTADO_CONFIG[despacho.estado]
  const Icon = cfg.icon

  return (
    <div style={{ ...s.card, borderColor: cfg.color + '40', background: `linear-gradient(135deg, var(--gl-bg-surface) 0%, ${cfg.tint} 100%)` }}>
      <div style={s.cardHeader} onClick={() => setAbierto(!abierto)}>
        <div style={s.cardLeft}>
          <div style={{ ...s.estadoIcon, background: cfg.tint, color: cfg.color }}>
            <Icon size={16} />
          </div>
          <div>
            <div style={s.cardEmpresa}>{despacho.empresa} · {despacho.centroNombre}</div>
            <div style={s.cardItems}>
              {despacho.items.map((item, i) => (
                <span key={i}>{item.nombre} ×{item.cantidad}{i < despacho.items.length - 1 ? ', ' : ''}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={s.cardRight}>
          <span style={{ ...s.badge, background: cfg.tint, color: cfg.color, border: `1px solid ${cfg.color}50` }}>
            {cfg.label}
          </span>
          {abierto ? <ChevronUp size={14} color="#5f7290" /> : <ChevronDown size={14} color="#5f7290" />}
        </div>
      </div>

      {abierto && (
        <div style={s.cardBody}>
          <div style={s.detalle}>
            <div style={s.detalleRow}>
              <span style={s.detalleLabel}>Solicitado por</span>
              <span style={s.detalleVal}>{despacho.solicitadoPor}</span>
            </div>
            <div style={s.detalleRow}>
              <span style={s.detalleLabel}>Creado</span>
              <span style={s.detalleVal}>{formatFecha(despacho.creadoEn)}</span>
            </div>
            {despacho.enviadoEn && (
              <div style={s.detalleRow}>
                <span style={s.detalleLabel}>Enviado</span>
                <span style={s.detalleVal}>{formatFecha(despacho.enviadoEn)}</span>
              </div>
            )}
            {despacho.transportista && (
              <div style={s.detalleRow}>
                <span style={s.detalleLabel}>Transportista</span>
                <span style={s.detalleVal}>{despacho.transportista}</span>
              </div>
            )}
            {despacho.comentario && (
              <div style={{ ...s.detalleRow, flexDirection: 'column', gap: 3 }}>
                <span style={s.detalleLabel}>Comentario</span>
                <span style={{ ...s.detalleVal, textAlign: 'left', fontSize: 11, color: 'var(--gl-text-secondary)', lineHeight: 1.5 }}>{despacho.comentario}</span>
              </div>
            )}
            {despacho.recibidoEn && (
              <div style={s.detalleRow}>
                <span style={s.detalleLabel}>Recibido</span>
                <span style={s.detalleVal}>{formatFecha(despacho.recibidoEn)}</span>
              </div>
            )}
            {despacho.observacion && (
              <div style={s.detalleRow}>
                <span style={s.detalleLabel}>Observación</span>
                <span style={s.detalleVal}>{despacho.observacion}</span>
              </div>
            )}
          </div>

          {cfg.btnLabel && (
            <button style={{ ...s.btnAccion, background: cfg.tint, color: cfg.color, border: `1px solid ${cfg.color}50` }} onClick={() => onCambiarEstado(despacho.id, cfg.next)}>
              <Icon size={14} />
              {cfg.btnLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function DespachosDemo() {
  const [filtro, setFiltro] = useState('todos')
  const [despachos, setDespachos] = useState(DESPACHOS)

  const cambiarEstado = (id, next) => {
    setDespachos(prev => prev.map(d => d.id === id ? { ...d, estado: next } : d))
  }

  const lista = filtro === 'todos' ? despachos : despachos.filter(d => d.estado === filtro)

  const conteo = { pendiente: 0, enviado: 0, recibido: 0 }
  despachos.forEach(d => { conteo[d.estado] = (conteo[d.estado] ?? 0) + 1 })

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.titulo}>Despachos</h1>
          <p style={s.sub}>Gestión de solicitudes y envíos a centros</p>
        </div>
      </div>

      <div style={s.filtros}>
        {FILTROS.map(f => {
          const count = f.key === 'todos' ? despachos.length : (conteo[f.key] ?? 0)
          const active = filtro === f.key
          return (
            <button key={f.key} onClick={() => setFiltro(f.key)} style={{ ...s.filtroBtn, ...(active ? s.filtroActive : {}) }}>
              {f.label}
              <span style={{ ...s.cnt, ...(active ? s.cntActive : {}) }}>{count}</span>
            </button>
          )
        })}
      </div>

      <div style={s.lista}>
        {lista.length === 0
          ? <p style={{ color: 'var(--gl-text-muted)', fontSize: 13, textAlign: 'center', padding: 40 }}>Sin despachos en esta categoría.</p>
          : lista.map(d => <DespachoCard key={d.id} despacho={d} onCambiarEstado={cambiarEstado} />)
        }
      </div>
    </div>
  )
}

const s = {
  page:        { padding: 24, maxWidth: 800, margin: '0 auto' },
  header:      { marginBottom: 20 },
  titulo:      { fontSize: 22, fontWeight: 800, color: 'var(--gl-text-primary)', marginBottom: 2 },
  sub:         { fontSize: 13, color: 'var(--gl-text-muted)' },
  filtros:     { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  filtroBtn:   { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: 50, fontSize: 12, fontWeight: 500, color: 'var(--gl-text-secondary)', cursor: 'pointer' },
  filtroActive:{ background: 'var(--gl-brand-tint)', border: '1px solid var(--gl-brand)', color: 'var(--gl-brand-soft)' },
  cnt:         { background: 'var(--gl-bg-hover)', padding: '0 7px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: 'var(--gl-text-muted)' },
  cntActive:   { background: 'var(--gl-brand)', color: '#fff' },
  lista:       { display: 'flex', flexDirection: 'column', gap: 10 },
  card:        { border: '1px solid', borderRadius: 12, overflow: 'hidden' },
  cardHeader:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '14px 16px', cursor: 'pointer', userSelect: 'none' },
  cardLeft:    { display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 },
  estadoIcon:  { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, flexShrink: 0 },
  cardEmpresa: { fontSize: 12, fontWeight: 700, color: 'var(--gl-text-primary)', marginBottom: 3 },
  cardItems:   { fontSize: 11, color: 'var(--gl-text-muted)', lineHeight: 1.5, maxWidth: 400 },
  cardRight:   { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  badge:       { padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600 },
  cardBody:    { padding: '0 16px 16px', borderTop: '1px solid var(--gl-border)' },
  detalle:     { display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' },
  detalleRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  detalleLabel:{ fontSize: 11, color: 'var(--gl-text-muted)', flexShrink: 0 },
  detalleVal:  { fontSize: 12, color: 'var(--gl-text-secondary)', fontWeight: 500, textAlign: 'right' },
  btnAccion:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
}
