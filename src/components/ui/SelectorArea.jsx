import { MapPinned } from 'lucide-react'
import { AREAS } from '../../config/appDefaults'
import { t } from '../../theme/tokens'

// Selector global de área (zona): Todas / Aysén / Cisne. Filtra el mapa y las
// páginas que ya filtran por empresa. Lo ven admin y supervisor (el operador no).
// `areaActiva` es 'todas' | 'aysen' | 'cisne'.
export default function SelectorArea({ areaActiva = 'todas', onCambiar }) {
  const chip = (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
    borderRadius: t.radiusFull, border: `1px solid ${active ? t.brand : t.border}`,
    background: active ? t.brandTint : 'transparent',
    color: active ? t.brandSoft : t.textSecondary,
    cursor: 'pointer', fontSize: t.textSm, fontWeight: 500, whiteSpace: 'nowrap',
    transition: `all ${t.durFast} ${t.ease}`,
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', maxWidth: '100%', padding: '2px' }}>
      <button onClick={() => onCambiar('todas')} style={chip(areaActiva === 'todas')} title="Todas las áreas">
        <MapPinned size={14} /> Todas
      </button>
      {AREAS.map(a => (
        <button key={a.id} onClick={() => onCambiar(a.id)} style={chip(areaActiva === a.id)} title={a.label}>
          {a.label}
        </button>
      ))}
    </div>
  )
}
