import { useState, useEffect, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { db } from '../../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { Trash2, X, Gamepad2, Users } from 'lucide-react'
import { t } from '../../theme/tokens'
import { EstadoBadge, Modal, Button } from '../kit'
import { useAppConfig } from '../../hooks/useAppConfig'
import { ICONOS_TAB } from '../../config/appDefaults'
import TabROV from '../tabs/TabROV'
import TabOperador from '../tabs/TabOperador'
import TabInventario from '../tabs/TabInventario'
import TabBitacora from '../tabs/TabBitacora'
import PanelDespacho from '../dispatch/PanelDespacho'
import TabEntregaTurno from '../tabs/TabEntregaTurno'

// Registro id → componente de pestaña (no serializable, vive en código).
const TAB_COMPONENTES = {
  operator:   (p) => <TabOperador {...p} />,
  rov:        (p) => <TabROV {...p} />,
  inventario: (p) => <TabInventario {...p} />,
  despacho:   (p) => <PanelDespacho {...p} />,
  turno:      (p) => <TabEntregaTurno {...p} />,
  bitacora:   (p) => <TabBitacora {...p} />,
}

// El operador gestiona despacho/turno/bitácora desde las páginas del menú lateral, no desde
// este panel — se saca de raíz (no depende de la configuración de permisos por pestaña).
const OCULTAS_OPERADOR = ['despacho', 'turno', 'bitacora']
// El taller (supervisor) no debe ver bitácoras diarias ni turno (ya se entiende por el panel izquierdo);
// solo ve operador, rov, inventario y despacho.
const OCULTAS_SUPERVISOR = ['bitacora', 'turno']

export default memo(function PanelCentro({ centro, onCerrar, onEliminar, sincronizarEstado, actualizarCentro, role, uid, teamId }) {
  const { tabs, permiso } = useAppConfig()
  const tabsVisibles = tabs.filter(
    (tb) => !tb.hidden && TAB_COMPONENTES[tb.id] && permiso(tb.id, role) !== 'hidden'
      && !(role === 'operador' && OCULTAS_OPERADOR.includes(tb.id))
      && !(role === 'supervisor' && OCULTAS_SUPERVISOR.includes(tb.id)),
  )
  const [tabActiva, setTabActiva]   = useState(tabsVisibles[0]?.id ?? 'operator')
  // En modo "solo ver", pasamos un rol sin permisos de edición a la pestaña:
  // todos sus controles (que exigen admin/operador) quedan ocultos sin tocar cada tab.
  const rolEfectivo = permiso(tabActiva, role) === 'view' ? 'lector' : role
  const [operadores, setOperadores]   = useState({ op1: {}, op2: {} })
  const [estadoActual, setEstadoActual] = useState(centro.estado)
  const [aEliminar, setAEliminar]     = useState(false)
  const [expanded, setExpanded]       = useState(false)
  const [teams, setTeams]             = useState([])
  const [asignandoTeam, setAsignandoTeam] = useState(false)

  const toggleExpanded = useCallback(() => setExpanded(v => !v), [])

  // Teams fijos Team 01–11
  useEffect(() => {
    if (role !== 'admin') return
    setTeams(Array.from({ length: 11 }, (_, i) => ({
      uid:    `team${String(i + 1).padStart(2, '0')}`,
      nombre: `Team ${String(i + 1).padStart(2, '0')}`,
    })))
  }, [role])

  const handleAsignarTeam = async (team) => {
    if (actualizarCentro) await actualizarCentro(centro.id, { teamAsignado: team || null })
    setAsignandoTeam(false)
  }

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

  // Compatibilidad: la sincronización guarda en `lista` (array); formato antiguo usa op1/op2.
  const listaOps  = operadores.lista ?? [operadores.op1, operadores.op2].filter(Boolean)
  const opEnFaena = listaOps.find(op => op?.estado === 'faena' && op?.nombre)

  return (
    <div className={`gl-panel-centro${expanded ? ' panel-expanded' : ''}`} style={styles.panel}>
      {/* Drag handle — solo visible en móvil, hace toggle del panel */}
      <div className="gl-drag-handle" onClick={toggleExpanded} role="button" aria-label={expanded ? 'Colapsar' : 'Expandir'} />

      <div style={styles.header} onClick={(e) => { if (e.currentTarget === e.target) toggleExpanded() }}>
        <div style={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={toggleExpanded}>
          <h2 className="gl-display" style={styles.nombre}>{centro.nombre}</h2>
          <div style={{ marginTop: 4 }}><EstadoBadge estado={estadoActual} /></div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
          {role === 'admin' && (
            <>
              {asignandoTeam ? (
                <select
                  defaultValue={centro.teamAsignado ?? ''}
                  onChange={e => handleAsignarTeam(e.target.value)}
                  onBlur={() => setAsignandoTeam(false)}
                  autoFocus
                  style={{ fontSize: 11, background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 6, color: 'var(--gl-text-primary)', padding: '3px 6px', maxWidth: 130 }}
                >
                  <option value="">— Sin team —</option>
                  {teams.map(tm => (
                    <option key={tm.uid} value={tm.uid}>{tm.nombre || tm.uid}</option>
                  ))}
                </select>
              ) : (
                <button className="gl-icon-btn" onClick={() => setAsignandoTeam(true)} aria-label="Asignar team" title={`Team: ${teams.find(t => t.uid === centro.teamAsignado)?.nombre ?? 'Sin asignar'}`}>
                  <Users size={16} />
                </button>
              )}
              <button className="gl-icon-btn" onClick={() => setAEliminar(true)} aria-label="Eliminar centro" style={{ color: t.fault }}><Trash2 size={17} /></button>
            </>
          )}
          {onCerrar && (
            <button className="gl-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
          )}
        </div>
      </div>

      {opEnFaena && (
        <div style={styles.opFaena}>
          {opEnFaena.foto
            ? <img src={opEnFaena.foto} alt={opEnFaena.nombre} style={styles.opFoto} />
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
              tabIndex={0} role="tab" aria-selected={active}
              style={{ ...styles.tab, color: active ? t.brandSoft : t.textMuted, borderBottom: `2px solid ${active ? t.brand : 'transparent'}` }}>
              {Icon && <Icon size={17} strokeWidth={2} />}
              <span className="gl-tab-label" style={{ fontSize: 9, letterSpacing: '0.04em', fontWeight: 600 }}>{label}</span>
            </button>
          )
        })}
      </div>

      {/* Contenido de la pestaña activa. Se renderiza con un motion.div "keyed"
          (sin AnimatePresence): al cambiar `tabActiva`, React desmonta el tab
          anterior y monta el nuevo, que corre su animación de entrada. NO se usa
          `mode="wait"`: ese modo difería el montaje del tab entrante hasta que el
          saliente completara su animación de salida (onExitComplete), handoff que
          quedaba bloqueado por el re-render de ~1s del layout (ver useReloj/T-01),
          dejando el contenido congelado en la primera pestaña. */}
      <motion.div
        key={tabActiva}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        style={styles.contenido}
      >
        {TAB_COMPONENTES[tabActiva]?.({ centro, role: rolEfectivo, uid, teamId, sincronizarEstado })}
      </motion.div>

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
})

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
