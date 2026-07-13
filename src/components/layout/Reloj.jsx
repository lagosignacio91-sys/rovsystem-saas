import { Clock } from 'lucide-react'
import { t } from '../../theme/tokens'
import { useReloj } from '../../hooks/useReloj'

// Widget del reloj AISLADO (T-01). Consume useReloj internamente para que su
// re-render por segundo quede contenido acá y NO propague a MainLayout ni, por
// ende, al Outlet context / páginas / mapa. Antes MainLayout consumía useReloj y
// re-renderizaba todo el árbol ~1 vez por segundo.
export default function Reloj() {
  const { horaStr, fechaStr } = useReloj()
  return (
    <div className="gl-topbar-clock" style={relojBox}>
      <Clock size={14} color={t.brandSoft} />
      <div style={{ lineHeight: 1.1 }}>
        <div className="gl-mono" style={{ fontSize: 13, fontWeight: 600, color: t.accentSoft, textShadow: '0 0 10px var(--gl-accent-tint)' }}>{horaStr}</div>
        <div style={{ fontSize: 9, color: t.textMuted, textTransform: 'capitalize' }}>{fechaStr}</div>
      </div>
    </div>
  )
}

const relojBox = { display: 'flex', alignItems: 'center', gap: 7, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '5px 10px', flexShrink: 0 }
