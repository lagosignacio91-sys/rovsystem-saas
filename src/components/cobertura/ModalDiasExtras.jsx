import { CalendarClock } from 'lucide-react'
import { Modal, Button } from '../kit'
import { t } from '../../theme/tokens'

function fmt(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${String(y).slice(2)}`
}

// Historial de días extras (coberturas) de un operador. Reusable para el propio operador
// y para el admin (recibe la lista de coberturas del usuario).
export default function ModalDiasExtras({ nombre, coberturas = [], onCerrar }) {
  const lista = [...coberturas].reverse() // más recientes primero

  return (
    <Modal open title={`Días extras${nombre ? ' — ' + nombre : ''}`} onClose={onCerrar} maxWidth={420}
      footer={<Button variant="secondary" size="lg" onClick={onCerrar}>Cerrar</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lista.length === 0 && (
          <div style={{ textAlign: 'center', color: t.textMuted, padding: '28px 0', fontSize: t.textSm }}>
            <CalendarClock size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
            <div>Sin coberturas registradas.</div>
          </div>
        )}
        {lista.map((c, i) => {
          const enCurso = c?.hasta == null
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: t.bgInput, border: `1px solid ${enCurso ? t.ok : t.border}`, borderRadius: t.radiusMd, padding: '9px 12px' }}>
              <CalendarClock size={15} color={enCurso ? t.ok : t.textMuted} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary, textTransform: 'capitalize' }}>{c.centroNombre || '—'}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>
                  {fmt(c.desde)} {enCurso ? '· en curso' : `→ ${fmt(c.hasta)}`}
                </div>
              </div>
              {enCurso && <span style={{ fontSize: 10, fontWeight: 700, color: t.ok, background: t.okTint, borderRadius: t.radiusFull, padding: '2px 8px' }}>Cubriendo</span>}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
