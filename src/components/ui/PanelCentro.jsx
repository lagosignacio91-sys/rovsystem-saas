import { useState, useEffect, useCallback } from 'react'
import { db } from '../../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { Trash2, X, Gamepad2 } from 'lucide-react'
import { t } from '../../theme/tokens'
import { EstadoBadge, Modal, Button } from '../kit'
import { useAppConfig } from '../../hooks/useAppConfig'
import { ICONOS_TAB } from '../../config/appDefaults'
import TabROV from '../tabs/TabROV'
import TabHerramientas from '../tabs/TabHerramientas'
import TabOperador from '../tabs/TabOperador'
import TabInsumos from '../tabs/TabInsumos'
import PanelDespacho from '../dispatch/PanelDespacho'
import TabEntregaTurno from '../tabs/TabEntregaTurno'

// Registro id → componente de pestaña (no serializable, vive en código).
const TAB_COMPONENTES = {
  operator: (p) => <TabOperador {...p} />,
  rov:      (p) => <TabROV {...p} />,
  tools:    (p) => <TabHerramientas {...p} />,
  supplies: (p) => <TabInsumos {...p} />,
  despacho: (p) => <PanelDespacho {...p} />,
  turno:    (p) => <TabEntregaTurno {...p} />,
}

export default function PanelCentro({ centro, onCerrar, onEliminar, sincronizarEstado, role, uid }) {
  const { tabs } = useAppConfig()
  const tabsVisibles = tabs.filter((tb) => !tb.hidden && TAB_COMPONENTES[tb.id])
  const [tabActiva, setTabActiva]   = useState(tabsVisibles[0]?.id ?? 'operator')
  const [operadores, setOperadores] = useState({ op1: {}, op2: {} })
  const [estadoActual, setEstadoActual] = useState(centro.estado)
  const [aEliminar, setAEliminar]   = useState(false)
  const [expanded, setExpanded]     = useState(false)

  const toggleExpanded = useCallback(() => setExpanded(v => !v), [])

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

  // Si la pestaña activa quedó oculta/eliminada por el admin, saltar a la primera visible.
  useEffect(() => {
    if (tabsVisibles.length && !tabsVisibles.some((tb) => tb.id === tabActiva)) {
      setTabActiva(tabsVisibles[0].id)
    }
  }, [tabsVisibles, tabActiva])

  const opEnFaena = [operadores.op1, operadores.op2].find(op => op?.estado === 'faena' && op?.nombre)

  return (
    <div className={`gl-panel-centro${expanded ? ' panel-expanded' : ''}`} style={styles.panel}>
      {/* Drag handle — solo visible en móvil, hace toggle del panel */}
      <div className="gl-drag-handle" onClick={toggleExpanded} role="button" aria-label={expanded ? 'Colapsar' : 'Expandir'} />

      <div style={styles.header} onClick={(e) => { if (e.currentTarget === e.target) toggleExpanded() }}>
        <div style={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={toggleExpanded}>
          <h2 style={styles.nombre}>{centro.nombre}</h2>
          <div style={{ marginTop: 4 }}><EstadoBadge estado={estadoActual} /></div>
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

      <div className="gl-panel-tabs-bar" style={styles.tabs}>
        {tabsVisibles.map(({ id, label }) => {
          const Icon = ICONOS_TAB[id]
          const active = tabActiva === id
          return (
            <button key={id} className="gl-tab-btn" onClick={() => { setTabActiva(id); setExpanded(true) }}
              style={{ ...styles.tab, color: active ? t.brandSoft : t.textMuted, borderBottom: `2px solid ${active ? t.brand : 'transparent'}` }}>
              {Icon && <Icon size={17} strokeWidth={2} />}
              <span className="gl-tab-label" style={{ fontSize: 9 }}>{label}</span>
            </button>
          )
        })}
      </div>

      <div style={styles.contenido}>
        {TAB_COMPONENTES[tabActiva]?.({ centro, role, uid, sincronizarEstado })}
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
