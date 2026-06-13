import { AlertOctagon, Package, CheckCircle2, X, ArrowRight } from 'lucide-react'
import { useResumenCentro } from '../../hooks/useResumenCentro'
import { t } from '../../theme/tokens'
import { EstadoBadge } from '../kit'

export default function PopupCentro({ centro, onAbrir, onCerrar }) {
  const { fallas, solicitudes } = useResumenCentro(centro.id)

  return (
    <div style={s.wrapper} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
      <div style={s.header}>
        <div style={{ minWidth: 0 }}>
          <div style={s.nombre}>{centro.nombre}</div>
          <div style={{ marginTop: 5 }}><EstadoBadge estado={centro.estado} /></div>
        </div>
        <button onClick={e => { e.stopPropagation(); onCerrar() }} className="gl-icon-btn" style={{ padding: 4 }} aria-label="Cerrar"><X size={15} /></button>
      </div>

      {fallas.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={s.seccionTitulo}><AlertOctagon size={11} color={t.fault} /> Fallas de equipo</div>
          {fallas.map((f, i) => (
            <div key={i} style={s.itemFalla}>
              <span style={s.itemTipo}>{f.equipo} — {f.campo}</span>
              <span style={s.itemDetalle}>{f.razon}</span>
            </div>
          ))}
        </div>
      )}

      {solicitudes.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={s.seccionTitulo}><Package size={11} color={t.dispatch} /> Solicitudes pendientes</div>
          {solicitudes.map((sol, i) => (
            <div key={i} style={s.itemSolicitud}>
              <span style={s.itemTipo}>{sol.tipo}</span>
              <span style={s.itemDetalle}>{sol.nombre} — Cant: {sol.cantidad}</span>
            </div>
          ))}
        </div>
      )}

      {fallas.length === 0 && solicitudes.length === 0 && (
        <div style={s.okMsg}><CheckCircle2 size={14} /> Sin alertas activas</div>
      )}

      <button onClick={e => { e.stopPropagation(); onAbrir(centro) }} className="gl-btn gl-btn--primary gl-btn--md" style={{ width: '100%', marginTop: 4 }}>
        Ver centro completo <ArrowRight size={15} />
      </button>
    </div>
  )
}

const s = {
  wrapper:       { minWidth: 240, maxWidth: 290, background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, padding: 13, boxShadow: t.shadowLg },
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  nombre:        { color: t.textPrimary, fontSize: t.textSm, fontWeight: 700 },
  seccionTitulo: { display: 'flex', alignItems: 'center', gap: 5, color: t.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 },
  itemFalla:     { background: t.faultTint, border: `1px solid ${t.fault}`, borderRadius: t.radiusSm, padding: '5px 8px', marginBottom: 3, display: 'flex', flexDirection: 'column', gap: 2 },
  itemSolicitud: { background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusSm, padding: '5px 8px', marginBottom: 3, display: 'flex', flexDirection: 'column', gap: 2 },
  itemTipo:      { color: t.textSecondary, fontSize: 10, fontWeight: 600 },
  itemDetalle:   { color: t.textPrimary, fontSize: 11 },
  okMsg:         { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: t.ok, fontSize: t.textSm, marginBottom: 8 },
}
