import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { UserCog, Ship, Wrench, Box, Package, Trash2, X, Gamepad2 } from 'lucide-react'
import { t } from '../../theme/tokens'
import { EstadoBadge, Modal, Button } from '../kit'
import TabROV from '../tabs/TabROV'
import TabHerramientas from '../tabs/TabHerramientas'
import TabOperador from '../tabs/TabOperador'
import TabInsumos from '../tabs/TabInsumos'
import PanelDespacho from '../dispatch/PanelDespacho'

const TABS = [
  { id: 'operator', label: 'Operador',    icon: UserCog },
  { id: 'rov',      label: 'ROV',         icon: Ship },
  { id: 'tools',    label: 'Herram.',     icon: Wrench },
  { id: 'supplies', label: 'Insumos',     icon: Box },
  { id: 'despacho', label: 'Despacho',    icon: Package },
]

export default function PanelCentro({ centro, onCerrar, onEliminar, sincronizarEstado, role }) {
  const [tabActiva, setTabActiva]   = useState('operator')
  const [operadores, setOperadores] = useState({ op1: {}, op2: {} })
  const [estadoActual, setEstadoActual] = useState(centro.estado)
  const [aEliminar, setAEliminar]   = useState(false)

  useEffect(() => { setEstadoActual(centro.estado) }, [centro.estado])

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'centros', centro.id, 'datos', 'operadores'), (snap) => {
      setOperadores(snap.exists() ? snap.data() : { op1: {}, op2: {} })
    })
    return () => unsub()
  }, [centro.id])

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'centros', centro.id), (snap) => {
      if (snap.exists()) setEstadoActual(snap.data().estado)
    })
    return () => unsub()
  }, [centro.id])

  const opEnFaena = [operadores.op1, operadores.op2].find(op => op?.estado === 'faena' && op?.nombre)

  return (
    <div className="gl-panel-centro" style={styles.panel}>
      <div style={styles.header}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={styles.nombre}>{centro.nombre}</h2>
          <div style={{ marginTop: 6 }}><EstadoBadge estado={estadoActual} /></div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {role === 'admin' && (
            <button className="gl-icon-btn" onClick={() => setAEliminar(true)} aria-label="Eliminar centro" style={{ color: t.fault }}><Trash2 size={17} /></button>
          )}
          <button className="gl-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>
      </div>

      {opEnFaena && (
        <div style={styles.opFaena}>
          {opEnFaena.foto
            ? <img src={opEnFaena.foto} alt="" style={styles.opFoto} />
            : <div style={styles.opFotoVacia}>{(opEnFaena.nombre[0] ?? '?').toUpperCase()}</div>}
          <div style={{ minWidth: 0 }}>
            <div style={styles.opNombre}>{opEnFaena.nombre}</div>
            <div style={styles.opEstado}><Gamepad2 size={11} /> En faena</div>
          </div>
        </div>
      )}

      <div style={styles.tabs}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tabActiva === id
          return (
            <button key={id} onClick={() => setTabActiva(id)}
              style={{ ...styles.tab, color: active ? t.brandSoft : t.textMuted, borderBottom: `2px solid ${active ? t.brand : 'transparent'}` }}>
              <Icon size={17} strokeWidth={2} />
              <span style={{ fontSize: 9 }}>{label}</span>
            </button>
          )
        })}
      </div>

      <div style={styles.contenido}>
        {tabActiva === 'rov'      && <TabROV          centro={centro} role={role} sincronizarEstado={sincronizarEstado} />}
        {tabActiva === 'tools'    && <TabHerramientas centro={centro} role={role} sincronizarEstado={sincronizarEstado} />}
        {tabActiva === 'operator' && <TabOperador     centro={centro} role={role} />}
        {tabActiva === 'supplies' && <TabInsumos      centro={centro} role={role} sincronizarEstado={sincronizarEstado} />}
        {tabActiva === 'despacho' && <PanelDespacho   centro={centro} role={role} sincronizarEstado={sincronizarEstado} />}
      </div>

      {aEliminar && (
        <Modal open title="Eliminar centro" onClose={() => setAEliminar(false)} maxWidth={340}
          footer={<>
            <Button variant="secondary" size="lg" onClick={() => setAEliminar(false)}>Cancelar</Button>
            <Button variant="primary" size="lg" style={{ background: t.fault }} onClick={() => { setAEliminar(false); onEliminar(centro.id) }}>Eliminar</Button>
          </>}>
          <p style={{ color: t.textSecondary, fontSize: t.textSm, margin: 0, lineHeight: 1.5 }}>
            ¿Seguro que quieres eliminar <b style={{ color: t.textPrimary }}>{centro.nombre}</b>? Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  )
}

const styles = {
  panel:       { width: 420, maxWidth: '100vw', height: '100%', background: t.bgSurface, borderLeft: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', boxShadow: t.shadowLg },
  header:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${t.border}`, gap: 8 },
  nombre:      { color: t.textPrimary, fontSize: t.textBase, fontWeight: 600, margin: 0 },
  opFaena:     { display: 'flex', alignItems: 'center', gap: 9, background: t.bgInput, borderBottom: `1px solid ${t.border}`, padding: '8px 16px' },
  opFoto:      { width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${t.ok}`, flexShrink: 0 },
  opFotoVacia: { width: 34, height: 34, borderRadius: '50%', background: t.brandTint, color: t.brandSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, border: `2px solid ${t.ok}`, flexShrink: 0 },
  opNombre:    { color: t.textPrimary, fontSize: t.textXs, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  opEstado:    { color: t.ok, fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 },
  tabs:        { display: 'flex', borderBottom: `1px solid ${t.border}`, padding: '0 6px' },
  tab:         { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 2px', background: 'transparent', border: 'none', cursor: 'pointer', transition: `color ${t.durFast} ${t.ease}` },
  contenido:   { flex: 1, overflowY: 'auto', padding: t.space5 },
}
