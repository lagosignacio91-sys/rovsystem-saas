import { useResumenCentro } from '../../hooks/useResumenCentro'

const STATUS_COLORS = {
  OK:              '#22c55e',
  LOW_STOCK:       '#eab308',
  EQUIPMENT_FAULT: '#ef4444',
  DISPATCH_ONWAY:  '#3b82f6',
  NO_OPERATOR:     '#6b7280',
}

const STATUS_LABELS = {
  OK:              '🟢 OK',
  LOW_STOCK:       '🟡 Stock bajo',
  EQUIPMENT_FAULT: '🔴 Falla de equipo',
  DISPATCH_ONWAY:  '🔵 Despacho en camino',
  NO_OPERATOR:     '⚫ Sin operador',
}

export default function PopupCentro({ centro, onAbrir, onCerrar }) {
  const { fallas, solicitudes } = useResumenCentro(centro.id)

  return (
    <div
      style={styles.wrapper}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <div style={styles.header}>
        <div>
          <div style={styles.nombre}>{centro.nombre}</div>
          <div style={{ ...styles.estado, color: STATUS_COLORS[centro.estado] }}>
            {STATUS_LABELS[centro.estado] ?? centro.estado}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onCerrar() }}
          style={styles.btnCerrar}
        >✕</button>
      </div>

      {fallas.length > 0 && (
        <div style={styles.seccion}>
          <div style={styles.seccionTitulo}>⚠️ Fallas de equipo</div>
          {fallas.map((f, i) => (
            <div key={i} style={styles.itemFalla}>
              <span style={styles.itemTipo}>{f.equipo} — {f.campo}</span>
              <span style={styles.itemDetalle}>{f.razon}</span>
            </div>
          ))}
        </div>
      )}

      {solicitudes.length > 0 && (
        <div style={styles.seccion}>
          <div style={styles.seccionTitulo}>📦 Solicitudes pendientes</div>
          {solicitudes.map((s, i) => (
            <div key={i} style={styles.itemSolicitud}>
              <span style={styles.itemTipo}>{s.tipo}</span>
              <span style={styles.itemDetalle}>{s.nombre} — Cant: {s.cantidad}</span>
            </div>
          ))}
        </div>
      )}

      {fallas.length === 0 && solicitudes.length === 0 && (
        <div style={styles.okMsg}>✅ Sin alertas activas</div>
      )}

      <button
        onClick={e => { e.stopPropagation(); onAbrir(centro) }}
        style={styles.btnAbrir}
      >
        Ver centro completo →
      </button>
    </div>
  )
}

const styles = {
  wrapper:       {
    minWidth: '230px', maxWidth: '290px',
    background: '#0f172a',
    border: '1px solid #1e3a5f',
    borderRadius: '12px',
    padding: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
    fontFamily: 'inherit',
  },
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' },
  nombre:        { color: '#f1f5f9', fontSize: '14px', fontWeight: '700' },
  estado:        { fontSize: '12px', fontWeight: '600', marginTop: '2px' },
  btnCerrar:     {
    background: '#1e293b', border: '1px solid #334155', color: '#94a3b8',
    borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px', flexShrink: 0,
  },
  seccion:       { marginBottom: '8px' },
  seccionTitulo: { color: '#64748b', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' },
  itemFalla:     { background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '6px', padding: '5px 8px', marginBottom: '3px', display: 'flex', flexDirection: 'column', gap: '2px' },
  itemSolicitud: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '5px 8px', marginBottom: '3px', display: 'flex', flexDirection: 'column', gap: '2px' },
  itemTipo:      { color: '#94a3b8', fontSize: '10px', fontWeight: '600' },
  itemDetalle:   { color: '#f1f5f9', fontSize: '11px' },
  okMsg:         { color: '#22c55e', fontSize: '12px', marginBottom: '8px', textAlign: 'center' },
  btnAbrir:      { width: '100%', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginTop: '4px' },
}