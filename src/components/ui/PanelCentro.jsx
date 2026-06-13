import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import TabROV from '../tabs/TabROV'
import TabHerramientas from '../tabs/TabHerramientas'
import TabOperador from '../tabs/TabOperador'
import TabInsumos from '../tabs/TabInsumos'
import PanelDespacho from '../dispatch/PanelDespacho'

const TABS = [
  { id: 'operator', label: 'Operador' },
  { id: 'rov',      label: 'Equipos ROV' },
  { id: 'tools',    label: 'Herramientas' },
  { id: 'supplies', label: 'Insumos' },
  { id: 'despacho', label: '📦 Despacho' },
]

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

export default function PanelCentro({ centro, onCerrar, onEliminar, onEstadoCambio, sincronizarEstado, role }) {
  const [tabActiva, setTabActiva]   = useState('operator')
  const [operadores, setOperadores] = useState({ op1: {}, op2: {} })
  const [estadoActual, setEstadoActual] = useState(centro.estado)

  useEffect(() => {
    setEstadoActual(centro.estado)
  }, [centro.estado])

  useEffect(() => {
    const ref   = doc(db, 'centros', centro.id, 'datos', 'operadores')
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setOperadores(snap.data())
      else setOperadores({ op1: {}, op2: {} })
    })
    return () => unsub()
  }, [centro.id])

  // Escuchar cambios de estado en tiempo real
  useEffect(() => {
    const ref   = doc(db, 'centros', centro.id)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setEstadoActual(snap.data().estado)
    })
    return () => unsub()
  }, [centro.id])

  const opEnFaena = [operadores.op1, operadores.op2].find(op => op?.estado === 'faena' && op?.nombre)

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.headerIzq}>
          <h2 style={styles.nombre}>{centro.nombre}</h2>
          <span style={{ ...styles.estado, color: STATUS_COLORS[estadoActual] }}>
            {STATUS_LABELS[estadoActual] ?? estadoActual}
          </span>
        </div>

        {opEnFaena && (
          <div style={styles.opFaenaBox}>
            {opEnFaena.foto
              ? <img src={opEnFaena.foto} alt="op" style={styles.opFoto} />
              : <div style={styles.opFotoVacia}>👤</div>
            }
            <div style={styles.opInfo}>
              <div style={styles.opNombre}>{opEnFaena.nombre}</div>
              <div style={styles.opCorreo}>{opEnFaena.correoCorp || opEnFaena.correoPersonal || '—'}</div>
              <div style={styles.opEstado}>🎮 En faena</div>
            </div>
          </div>
        )}

        <div style={styles.headerBtns}>
          {role === 'admin' && (
            <button onClick={() => onEliminar(centro.id)} style={styles.btnEliminar} title="Eliminar centro">🗑️</button>
          )}
          <button onClick={onCerrar} style={styles.btnCerrar}>✕</button>
        </div>
      </div>

      <div style={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTabActiva(t.id)}
            style={{ ...styles.tab, ...(tabActiva === t.id ? styles.tabActiva : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.contenido}>
        {tabActiva === 'rov'      && <TabROV          centro={centro} role={role} sincronizarEstado={sincronizarEstado} />}
        {tabActiva === 'tools'    && <TabHerramientas centro={centro} role={role} sincronizarEstado={sincronizarEstado} />}
        {tabActiva === 'operator' && <TabOperador     centro={centro} role={role} />}
        {tabActiva === 'supplies' && <TabInsumos      centro={centro} role={role} sincronizarEstado={sincronizarEstado} />}
        {tabActiva === 'despacho' && <PanelDespacho   centro={centro} role={role} sincronizarEstado={sincronizarEstado} />}
      </div>
    </div>
  )
}

const styles = {
  panel:       { position: 'absolute', top: 0, right: 0, width: '420px', height: '100%', background: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', zIndex: 1000, boxShadow: '-4px 0 20px rgba(0,0,0,0.4)' },
  header:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #334155', gap: '8px' },
  headerIzq:   { display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 },
  nombre:      { color: '#f1f5f9', fontSize: '15px', fontWeight: '700', margin: 0 },
  estado:      { fontSize: '12px', fontWeight: '500' },
  opFaenaBox:  { display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: '10px', padding: '6px 10px', flex: 1, maxWidth: '160px' },
  opFoto:      { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #22c55e', flexShrink: 0 },
  opFotoVacia: { width: '36px', height: '36px', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', border: '2px solid #22c55e', flexShrink: 0 },
  opInfo:      { display: 'flex', flexDirection: 'column', gap: '1px', overflow: 'hidden' },
  opNombre:    { color: '#f1f5f9', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  opCorreo:    { color: '#64748b', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  opEstado:    { color: '#22c55e', fontSize: '10px', fontWeight: '600' },
  headerBtns:  { display: 'flex', gap: '8px', flexShrink: 0 },
  btnEliminar: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px' },
  btnCerrar:   { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '16px' },
  tabs:        { display: 'flex', borderBottom: '1px solid #334155', overflowX: 'auto' },
  tab:         { flex: 1, padding: '12px 6px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '11px', fontWeight: '500', borderBottom: '2px solid transparent', whiteSpace: 'nowrap' },
  tabActiva:   { color: '#3b82f6', borderBottom: '2px solid #3b82f6' },
  contenido:   { flex: 1, overflowY: 'auto', padding: '20px' },
}