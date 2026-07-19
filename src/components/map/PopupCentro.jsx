import { useState } from 'react'
import { AlertOctagon, Wrench, LifeBuoy, CheckCircle2, X, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react'
import { useResumenCentro } from '../../hooks/useResumenCentro'
import { t } from '../../theme/tokens'
import { EstadoBadge } from '../kit'

// Meta visual por categoría (icono + color de la severidad dominante del grupo).
const CAT_META = {
  ROV:          { icon: AlertOctagon, color: t.fault },
  Herramientas: { icon: Wrench,       color: t.low ?? '#eab308' },
  Esenciales:   { icon: LifeBuoy,     color: t.low ?? '#eab308' },
}

export default function PopupCentro({ centro, centrosConFaltantes, onAbrir, onCerrar }) {
  const { grupos, total } = useResumenCentro(centro)
  const [expandidos, setExpandidos] = useState({}) // { [categoria]: bool }

  const toggle = (cat) => setExpandidos(e => ({ ...e, [cat]: !e[cat] }))

  return (
    <div className="gl-glass" style={s.wrapper} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
      <div style={s.header}>
        <div style={{ minWidth: 0 }}>
          <div style={s.nombre}>{centro.nombre}</div>
          <div style={{ marginTop: 5 }}><EstadoBadge estado={centro.estado} tieneFaltante={centrosConFaltantes?.has(centro.id)} /></div>
        </div>
        <button onClick={e => { e.stopPropagation(); onCerrar() }} className="gl-icon-btn" style={{ padding: 4 }} aria-label="Cerrar"><X size={15} /></button>
      </div>

      {total > 0 ? (
        <div style={s.scroll}>
          {grupos.map(({ categoria, items }) => {
            const meta = CAT_META[categoria] ?? { icon: AlertOctagon, color: t.fault }
            const Icono = meta.icon
            const abierto = !!expandidos[categoria]
            return (
              <div key={categoria} style={{ marginBottom: 6 }}>
                <button onClick={() => toggle(categoria)} style={s.grupoHeader}>
                  {abierto ? <ChevronDown size={13} color={t.textMuted} /> : <ChevronRight size={13} color={t.textMuted} />}
                  <Icono size={13} color={meta.color} />
                  <span style={s.grupoTitulo}>{categoria}</span>
                  <span style={{ ...s.contador, background: `${meta.color}22`, color: meta.color, borderColor: `${meta.color}55` }}>{items.length}</span>
                </button>
                {abierto && (
                  <div style={s.grupoItems}>
                    {items.map((it, i) => (
                      <div key={i} style={{ ...s.item, borderColor: it.severidad === 'falla' ? t.fault : (t.low ?? '#eab308') }}>
                        <span style={s.itemTipo}>{it.titulo}</span>
                        <span style={s.itemDetalle}>{it.detalle}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={s.okMsg}><CheckCircle2 size={14} /> Sin alertas activas</div>
      )}

      <button onClick={e => { e.stopPropagation(); onAbrir(centro) }} className="gl-btn gl-btn--primary gl-btn--md" style={{ width: '100%', marginTop: 8 }}>
        Ver centro completo <ArrowRight size={15} />
      </button>
    </div>
  )
}

const s = {
  wrapper:      { minWidth: 250, maxWidth: 300, borderRadius: t.radiusLg, padding: 13, boxShadow: t.shadowLg },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  nombre:       { color: t.textPrimary, fontSize: t.textSm, fontWeight: 700 },
  scroll:       { maxHeight: 240, overflowY: 'auto', margin: '2px -2px 0', padding: '0 2px' },
  grupoHeader:  { display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusSm, padding: '6px 8px', cursor: 'pointer', textAlign: 'left' },
  grupoTitulo:  { flex: 1, color: t.textPrimary, fontSize: 11, fontWeight: 700 },
  contador:     { fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '1px 7px', border: '1px solid', flexShrink: 0 },
  grupoItems:   { display: 'flex', flexDirection: 'column', gap: 3, marginTop: 3, paddingLeft: 6 },
  item:         { background: t.bgInput, borderLeft: '2px solid', borderRadius: t.radiusSm, padding: '5px 8px', display: 'flex', flexDirection: 'column', gap: 2 },
  itemTipo:     { color: t.textSecondary, fontSize: 10, fontWeight: 600 },
  itemDetalle:  { color: t.textPrimary, fontSize: 11 },
  okMsg:        { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: t.ok, fontSize: t.textSm, margin: '4px 0 8px' },
}
