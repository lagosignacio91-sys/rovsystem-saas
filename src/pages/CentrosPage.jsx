import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Search, MapPin, ChevronRight, Building2 } from 'lucide-react'
import { t, ESTADO_META } from '../theme/tokens'
import { logoEmpresa } from '../lib/empresaLogos'
import { EstadoBadge } from '../components/kit'
import PanelCentro from '../components/ui/PanelCentro'

const ESTADOS_FILTRO = [
  { key: null,               label: 'Todos',         dot: null },
  { key: 'OK',               label: 'Operativo',     dot: '#22c55e' },
  { key: 'LOW_STOCK',        label: 'Stock bajo',    dot: '#eab308' },
  { key: 'EQUIPMENT_FAULT',  label: 'Falla equipo',  dot: '#ef4444' },
  { key: 'DISPATCH_ONWAY',   label: 'En camino',     dot: '#3b82f6' },
  { key: 'NO_OPERATOR',      label: 'Sin operador',  dot: '#6b7280' },
]

export default function CentrosPage() {
  const { centros, eliminarCentro, sincronizarEstado, role, empresaActiva } = useOutletContext()
  const [busca, setBusca]               = useState('')
  const [filtroEstado, setFiltroEstado] = useState(null)
  const [centroActivo, setCentroActivo] = useState(null)

  const base = empresaActiva ? centros.filter(c => c.empresaId === empresaActiva.id) : centros

  // Conteos para los chips (siempre sobre la base sin filtro de estado)
  const conteos = ESTADOS_FILTRO.slice(1).reduce((acc, f) => {
    acc[f.key] = base.filter(c => c.estado === f.key).length
    return acc
  }, {})

  let lista = filtroEstado ? base.filter(c => c.estado === filtroEstado) : base
  if (busca.trim()) {
    const q = busca.toLowerCase()
    lista = lista.filter(c => c.nombre?.toLowerCase().includes(q) || c.empresaNombre?.toLowerCase().includes(q))
  }
  lista = [...lista].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''))

  const centroVivo = centroActivo ? centros.find(c => c.id === centroActivo.id) ?? centroActivo : null
  const handleEliminar = async (id) => { await eliminarCentro(id); setCentroActivo(null) }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: t.space5 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Stats / filtro por estado */}
        <div className="gl-stats-row">
          {ESTADOS_FILTRO.map(f => {
            const active  = filtroEstado === f.key
            const count   = f.key === null ? base.length : (conteos[f.key] ?? 0)
            if (f.key !== null && count === 0) return null
            return (
              <button key={String(f.key)} className={`gl-stat-chip${active ? ' active' : ''}`}
                onClick={() => setFiltroEstado(active ? null : f.key)}
                style={active ? { color: f.dot ?? t.brand, borderColor: f.dot ?? t.brand, background: f.dot ? `${f.dot}18` : t.brandTint } : {}}>
                {f.dot && <span className="gl-stat-dot" style={{ background: f.dot }} />}
                {f.label} <span style={{ opacity: 0.65 }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Buscador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '10px 13px', marginBottom: t.space4, minHeight: 44 }}>
          <Search size={16} color={t.textMuted} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar centro o empresa..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.textPrimary, fontSize: t.textSm }} />
          <span style={{ fontSize: t.textXs, color: t.textMuted }}>{lista.length}</span>
        </div>

        {lista.length === 0 && (
          <div style={{ textAlign: 'center', color: t.textMuted, padding: '48px 0', fontSize: t.textSm }}>
            <Building2 size={32} style={{ opacity: 0.5, marginBottom: 8 }} /><div>Sin centros para mostrar.</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lista.map(c => {
            const meta = ESTADO_META[c.estado] ?? ESTADO_META.NO_OPERATOR
            const logo = logoEmpresa(c.empresaNombre)
            return (
              <button key={c.id} className="gl-list-row" onClick={() => setCentroActivo(c)}
                style={{ borderLeft: `3px solid ${meta.dot}` }}>
                <MapPin size={18} color={t.textMuted} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary }}>{c.nombre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    {logo && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 20, background: '#fff', borderRadius: 4, padding: '2px 5px', flexShrink: 0 }}>
                        <img src={logo.src} alt={logo.alt} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </span>
                    )}
                    <span style={{ fontSize: t.textXs, color: t.textMuted }}>{c.empresaNombre ?? 'Sin empresa'}</span>
                  </div>
                </div>
                <EstadoBadge estado={c.estado} />
                <ChevronRight size={16} color={t.textMuted} style={{ flexShrink: 0 }} />
              </button>
            )
          })}
        </div>
      </div>

      {centroVivo && (
        <div className="panel-slide gl-panel-wrapper gl-panel-wrapper--page" style={{ position: 'absolute', top: 0, right: 0, height: '100%', zIndex: 1000 }}>
          <PanelCentro centro={centroVivo} role={role} sincronizarEstado={sincronizarEstado}
            onCerrar={() => setCentroActivo(null)} onEliminar={handleEliminar} />
        </div>
      )}
    </div>
  )
}
