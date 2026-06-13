import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Search, MapPin, ChevronRight, Building2 } from 'lucide-react'
import { t, ESTADO_META } from '../theme/tokens'
import { EstadoBadge } from '../components/kit'
import PanelCentro from '../components/ui/PanelCentro'

export default function CentrosPage() {
  const { centros, eliminarCentro, sincronizarEstado, role, empresaActiva } = useOutletContext()
  const [busca, setBusca]               = useState('')
  const [centroActivo, setCentroActivo] = useState(null)

  let lista = empresaActiva ? centros.filter(c => c.empresaId === empresaActiva.id) : centros
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '9px 13px', marginBottom: t.space4 }}>
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
            return (
              <button key={c.id} onClick={() => setCentroActivo(c)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer',
                  background: t.bgElevated, border: `1px solid ${t.border}`, borderLeft: `3px solid ${meta.dot}`,
                  borderRadius: t.radiusMd, padding: '12px 14px', transition: `border-color ${t.durFast} ${t.ease}` }}>
                <MapPin size={18} color={t.textMuted} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary }}>{c.nombre}</div>
                  <div style={{ fontSize: t.textXs, color: t.textMuted, marginTop: 1 }}>{c.empresaNombre ?? 'Sin empresa'}</div>
                </div>
                <EstadoBadge estado={c.estado} />
                <ChevronRight size={16} color={t.textMuted} style={{ flexShrink: 0 }} />
              </button>
            )
          })}
        </div>
      </div>

      {centroVivo && (
        <div className="panel-slide" style={{ position: 'absolute', top: 0, right: 0, height: '100%', zIndex: 1000 }}>
          <PanelCentro centro={centroVivo} role={role} sincronizarEstado={sincronizarEstado}
            onCerrar={() => setCentroActivo(null)} onEliminar={handleEliminar} />
        </div>
      )}
    </div>
  )
}
