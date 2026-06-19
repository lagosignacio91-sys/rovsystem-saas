import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, AlertCircle, Trash2, AlertTriangle } from 'lucide-react'
import { Button, Modal } from '../components/kit'
import { useIsMobile } from '../hooks/useIsMobile'
import { t } from '../theme/tokens'
import { useAuth } from '../hooks/useAuth'
import { useBodegaCentral } from '../hooks/useBodegaCentral'
import { useDespachosGlobal } from '../hooks/useDespachosGlobal'
import ModalAgregarEquipo from '../components/bodega/ModalAgregarEquipo'
import ModalCambiarEstado from '../components/bodega/ModalCambiarEstado'
import ModalAgregarRepuesto from '../components/bodega/ModalAgregarRepuesto'
import ModalAgregarHerramientaInsumo from '../components/bodega/ModalAgregarHerramientaInsumo'
import ModalDespacho from '../components/bodega/ModalDespacho'

const MODELOS_EQUIPOS = ['DTG3', 'DTG2', 'Pivot', 'V6Plus', 'V6Expert', 'E-Go']

const ESTADO_COLOR = {
  disponible: { bg: 'var(--gl-ok-tint)', text: 'var(--gl-ok)', label: 'Disponible' },
  bajo_stock: { bg: 'var(--gl-low-tint)', text: 'var(--gl-low)', label: 'Bajo Stock' },
  agotado:    { bg: 'var(--gl-fault-tint)', text: 'var(--gl-fault)', label: 'Agotado' },
}

function SectionHeader({ title, onAdd, addLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${t.border}` }}>
      <span style={{ fontWeight: 700, fontSize: t.textBase, color: t.textPrimary }}>{title}</span>
      {onAdd && (
        <button onClick={onAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: t.brand, color: t.textOnBrand, border: 'none', borderRadius: t.radiusMd, cursor: 'pointer', fontSize: t.textSm, fontWeight: 600 }}>
          <Plus size={14} /> {addLabel}
        </button>
      )}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, marginBottom: 16, overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

function ModelRow({ modelo, eq, onAgregar, onCambiarEstado, onEliminarUnidad, pedirConfirm }) {
  const [expanded, setExpanded] = useState(false)
  const operativos = eq?.totalOperativos ?? 0
  const conFalla   = eq?.totalConFalla ?? 0
  const unidades   = (eq?.unidades ?? []).filter(u => u.estado === 'operativo')

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${t.border}` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {expanded ? <ChevronDown size={16} color={t.textMuted} /> : <ChevronRight size={16} color={t.textMuted} />}
          <span style={{ fontWeight: 600, color: t.textPrimary, fontSize: t.textSm }}>{modelo}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: t.textXs }}>
          <span style={{ color: 'var(--gl-ok)', fontWeight: 700 }}>{operativos} operativos</span>
          {conFalla > 0 && <span style={{ color: 'var(--gl-fault)', fontWeight: 700 }}>{conFalla} con falla</span>}
        </div>
      </button>

      {expanded && (
        <div style={{ background: t.bgBase, padding: '8px 16px 12px' }}>
          {unidades.length === 0 ? (
            <p style={{ fontSize: t.textXs, color: t.textMuted, padding: '8px 0' }}>Sin unidades operativas</p>
          ) : (
            unidades.map((u, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', marginBottom: 6, background: t.bgSurface, borderRadius: t.radiusSm, border: `1px solid var(--gl-ok-tint)` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: t.textXs, color: 'var(--gl-ok)', fontWeight: 700 }}>✓</span>
                  <span style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary }}>{u.serial}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => onCambiarEstado({ modelo, ...u })}
                    style={{ fontSize: t.textXs, color: 'var(--gl-fault)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Marcar con falla
                  </button>
                  <button
                    onClick={() => pedirConfirm(`¿Eliminar ${modelo} — ${u.serial} de la bodega?`, () => onEliminarUnidad(modelo, u.serial))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', alignItems: 'center', padding: 2 }}
                    title="Eliminar unidad"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
          <button
            onClick={() => onAgregar(modelo)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: t.textXs, color: t.brand, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            <Plus size={12} /> Agregar unidad {modelo}
          </button>
        </div>
      )}
    </div>
  )
}

function RepuestoModelRow({ modelo, repuestos, onEditarCantidad, onEliminarRepuesto, pedirConfirm }) {
  const [expanded, setExpanded] = useState(false)
  const reps = repuestos.filter(r => r.modeloEquipo === modelo)

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${t.border}` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {expanded ? <ChevronDown size={16} color={t.textMuted} /> : <ChevronRight size={16} color={t.textMuted} />}
          <span style={{ fontWeight: 600, color: t.textPrimary, fontSize: t.textSm }}>{modelo}</span>
        </div>
        <span style={{ fontSize: t.textXs, color: t.textMuted }}>{reps.length} items</span>
      </button>

      {expanded && (
        <div style={{ background: t.bgBase, padding: '8px 16px 12px' }}>
          {reps.length === 0 ? (
            <p style={{ fontSize: t.textXs, color: t.textMuted, padding: '8px 0' }}>Sin repuestos registrados</p>
          ) : (
            reps.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', marginBottom: 6, background: t.bgSurface, borderRadius: t.radiusSm, border: `1px solid ${t.border}` }}>
                <span style={{ fontSize: t.textSm, color: t.textPrimary, fontWeight: 600 }}>{r.nombre}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => onEditarCantidad(r.id, -1)} style={{ width: 24, height: 24, border: `1px solid ${t.border}`, borderRadius: t.radiusSm, background: t.bgElevated, cursor: 'pointer', color: 'var(--gl-fault)', fontWeight: 700, fontSize: 14 }}>−</button>
                  <span style={{ fontSize: t.textSm, fontWeight: 700, color: t.textPrimary, minWidth: 24, textAlign: 'center' }}>{r.cantidad}</span>
                  <button onClick={() => onEditarCantidad(r.id, +1)} style={{ width: 24, height: 24, border: `1px solid ${t.border}`, borderRadius: t.radiusSm, background: t.bgElevated, cursor: 'pointer', color: 'var(--gl-ok)', fontWeight: 700, fontSize: 14 }}>+</button>
                  <button
                    onClick={() => pedirConfirm(`¿Eliminar repuesto "${r.nombre}"?`, () => onEliminarRepuesto(r.id))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', alignItems: 'center', padding: 2 }}
                    title="Eliminar repuesto"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function BodegaVirtualPage() {
  const { role, loading: authLoading } = useAuth()
  const isMobile = useIsMobile()
  const {
    equipos, repuestos, herramientasInsumos,
    agregarEquipo, cambiarEstadoEquipo, eliminarUnidadEquipo,
    agregarRepuesto, editarRepuestoCantidad, eliminarRepuesto,
    agregarHerramientaInsumo, editarHerramientaInsumo, eliminarHerramientaInsumo,
    descontarStockDespacho,
  } = useBodegaCentral()

  const { pendientes: _despachosPendientes, marcarEnviado: marcarDespachoEnviado } = useDespachosGlobal()
  const despachosPendientes = _despachosPendientes.filter(d => d.estado === 'pendiente')

  const [modalAgregarEquipo,    setModalAgregarEquipo]    = useState(false)
  const [modeloPre,             setModeloPre]             = useState(null)
  const [modalCambiarEstado,    setModalCambiarEstado]    = useState(false)
  const [modalAgregarRepuesto,  setModalAgregarRepuesto]  = useState(false)
  const [modalAgregarHI,        setModalAgregarHI]        = useState(false)
  const [modalDespacho,         setModalDespacho]         = useState(false)
  const [equipoSel,             setEquipoSel]             = useState(null)
  const [solicitudSel,          setSolicitudSel]          = useState(null)
  const [confirm,               setConfirm]               = useState(null)  // { msg, onOk }
  const [stockWarning,          setStockWarning]          = useState(null)  // { solicitud, items con ✗ }

  const pedirConfirm = (msg, onOk) => setConfirm({ msg, onOk })

  if (authLoading) return null

  if (role !== 'supervisor') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--gl-fault)' }}>
        <AlertCircle size={32} />
        <p style={{ fontSize: t.textSm }}>No tienes permisos para acceder a la bodega virtual.</p>
      </div>
    )
  }

  const equiposEnReparacion = equipos.flatMap(e =>
    (e.unidades || []).filter(u => u.estado === 'conFalla').map(u => ({ ...u, modelo: e.modelo, equipoId: e.id }))
  )

  const getFlag = (nombre, cantNecesaria) => {
    const n = nombre?.toLowerCase()
    const enBodega = [...repuestos, ...herramientasInsumos].find(b => b.nombre?.toLowerCase() === n)
    if (!enBodega) return null
    if (enBodega.cantidad === 0) return { label: '✗', color: 'var(--gl-fault)' }
    if (enBodega.cantidad < cantNecesaria) return { label: '⚠', color: 'var(--gl-low)' }
    return { label: '✓', color: 'var(--gl-ok)' }
  }

  const abrirDespacho = (d) => {
    const solicitudMapeada = {
      id: d.id,
      itemsSolicitados: (d.items || []).map(item => ({
        itemId: item.id?.toString() || item.nombre,
        nombre: item.nombre,
        cantidad: item.cantidadEnviada ?? item.cantidadSolicitada ?? item.cantidad ?? 1,
        tipo: item.tipo?.toLowerCase(),
      })),
      centroNombre: d.centroNombre,
      fechaSolicitud: d.creadoEn,
    }
    // C3: advertir si algún ítem no tiene stock suficiente
    const sinStock = solicitudMapeada.itemsSolicitados.filter(item => {
      const flag = getFlag(item.nombre, item.cantidad)
      return flag && flag.label === '✗'
    })
    if (sinStock.length > 0) {
      setStockWarning({ solicitud: solicitudMapeada, sinStock })
    } else {
      setSolicitudSel(solicitudMapeada)
      setModalDespacho(true)
    }
  }

  const handleDespachar = async (despachoId, itemsDespachados, comentario, fotos, transportista) => {
    await marcarDespachoEnviado(despachoId, itemsDespachados, {
      fotosDespacho:      fotos,
      comentarioDespacho: comentario,
      transportista,
    })
    await descontarStockDespacho(itemsDespachados)
  }

  const handleAbrirAgregarEquipo = (modeloDefault = null) => {
    setModeloPre(modeloDefault)
    setModalAgregarEquipo(true)
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: t.space5, background: t.bgBase }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <h1 style={{ fontSize: t.textXl, fontWeight: 800, color: t.textPrimary, marginBottom: t.space5 }}>
          Bodega Virtual
        </h1>

        {/* ── EQUIPOS ROV ── */}
        <Card>
          <SectionHeader title="📦 Equipos ROV" onAdd={() => handleAbrirAgregarEquipo()} addLabel="Agregar Equipo" />
          {MODELOS_EQUIPOS.map(modelo => (
            <ModelRow
              key={modelo}
              modelo={modelo}
              eq={equipos.find(e => e.id === modelo)}
              onAgregar={handleAbrirAgregarEquipo}
              onCambiarEstado={(eq) => { setEquipoSel(eq); setModalCambiarEstado(true) }}
              onEliminarUnidad={eliminarUnidadEquipo}
              pedirConfirm={pedirConfirm}
            />
          ))}
        </Card>

        {/* ── EN REPARACIÓN ── */}
        {equiposEnReparacion.length > 0 && (
          <Card style={{ borderLeft: `3px solid var(--gl-fault)` }}>
            <SectionHeader title="🔧 En Reparación" />
            {equiposEnReparacion.map((eq, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${t.border}`, background: 'var(--gl-fault-tint)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: t.textSm, color: t.textPrimary }}>
                    {eq.modelo} — {eq.serial}
                  </div>
                  <div style={{ fontSize: t.textXs, color: t.textSecondary, marginTop: 2 }}>
                    Falla: {eq.detallesFalla || '—'}
                  </div>
                  {eq.desde && (
                    <div style={{ fontSize: t.textXs, color: t.textMuted, marginTop: 2 }}>
                      Desde: {new Date(eq.desde).toLocaleDateString('es-CL')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => { setEquipoSel(eq); setModalCambiarEstado(true) }}
                    style={{ padding: '6px 12px', background: 'var(--gl-ok)', color: '#fff', border: 'none', borderRadius: t.radiusMd, cursor: 'pointer', fontSize: t.textXs, fontWeight: 700 }}
                  >
                    Marcar Operativo
                  </button>
                  <button
                    onClick={() => pedirConfirm(`¿Eliminar ${eq.modelo} — ${eq.serial} de la bodega?`, () => eliminarUnidadEquipo(eq.modelo, eq.serial))}
                    style={{ background: 'none', border: `1px solid var(--gl-fault)`, borderRadius: t.radiusSm, cursor: 'pointer', color: 'var(--gl-fault)', padding: '5px 7px', display: 'flex', alignItems: 'center' }}
                    title="Eliminar equipo"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* ── REPUESTOS ── */}
        <Card>
          <SectionHeader title="⚙️ Repuestos" onAdd={() => setModalAgregarRepuesto(true)} addLabel="Agregar Repuesto" />
          {MODELOS_EQUIPOS.map(modelo => (
            <RepuestoModelRow
              key={modelo}
              modelo={modelo}
              repuestos={repuestos}
              onEditarCantidad={editarRepuestoCantidad}
              onEliminarRepuesto={eliminarRepuesto}
              pedirConfirm={pedirConfirm}
            />
          ))}
        </Card>

        {/* ── HERRAMIENTAS / INSUMOS ── */}
        <Card>
          <SectionHeader title="🛠️ Herramientas / Insumos" onAdd={() => setModalAgregarHI(true)} addLabel="Agregar Item" />
          {herramientasInsumos.length === 0 ? (
            <p style={{ fontSize: t.textSm, color: t.textMuted, padding: '16px' }}>No hay items registrados</p>
          ) : isMobile ? (
            // Móvil: tarjetas apiladas, sin scroll horizontal
            <div>
              {herramientasInsumos.map(item => {
                const est = ESTADO_COLOR[item.estado] || ESTADO_COLOR.disponible
                return (
                  <div key={item.id} style={{ borderBottom: `1px solid ${t.border}`, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: t.textPrimary, fontSize: t.textSm }}>{item.nombre}</div>
                        <div style={{ color: t.textSecondary, fontSize: t.textXs, marginTop: 2 }}>{item.categoria}</div>
                      </div>
                      <button
                        onClick={() => pedirConfirm(`¿Eliminar "${item.nombre}"?`, () => eliminarHerramientaInsumo(item.id))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40, minHeight: 40, flexShrink: 0 }}
                        title="Eliminar item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                      <span style={{ padding: '2px 8px', borderRadius: t.radiusFull, fontSize: t.textXs, fontWeight: 700, background: est.bg, color: est.text }}>
                        {est.label}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => editarHerramientaInsumo(item.id, -1)} style={{ width: 40, height: 40, border: `1px solid ${t.border}`, borderRadius: t.radiusSm, background: t.bgElevated, cursor: 'pointer', color: 'var(--gl-fault)', fontWeight: 700, fontSize: 18 }}>−</button>
                        <span style={{ fontWeight: 700, color: t.textPrimary, minWidth: 28, textAlign: 'center', fontSize: t.textBase }}>{item.cantidad}</span>
                        <button onClick={() => editarHerramientaInsumo(item.id, +1)} style={{ width: 40, height: 40, border: `1px solid ${t.border}`, borderRadius: t.radiusSm, background: t.bgElevated, cursor: 'pointer', color: 'var(--gl-ok)', fontWeight: 700, fontSize: 18 }}>+</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: t.textSm }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}`, background: t.bgElevated }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', color: t.textSecondary, fontWeight: 600 }}>Nombre</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', color: t.textSecondary, fontWeight: 600 }}>Categoría</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center', color: t.textSecondary, fontWeight: 600 }}>Cantidad</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', color: t.textSecondary, fontWeight: 600 }}>Estado</th>
                    <th style={{ padding: '10px 8px', width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {herramientasInsumos.map(item => {
                    const est = ESTADO_COLOR[item.estado] || ESTADO_COLOR.disponible
                    return (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: t.textPrimary }}>{item.nombre}</td>
                        <td style={{ padding: '10px 16px', color: t.textSecondary, fontSize: t.textXs }}>{item.categoria}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <button onClick={() => editarHerramientaInsumo(item.id, -1)} style={{ width: 22, height: 22, border: `1px solid ${t.border}`, borderRadius: t.radiusSm, background: t.bgElevated, cursor: 'pointer', color: 'var(--gl-fault)', fontWeight: 700 }}>−</button>
                            <span style={{ fontWeight: 700, color: t.textPrimary, minWidth: 24, textAlign: 'center' }}>{item.cantidad}</span>
                            <button onClick={() => editarHerramientaInsumo(item.id, +1)} style={{ width: 22, height: 22, border: `1px solid ${t.border}`, borderRadius: t.radiusSm, background: t.bgElevated, cursor: 'pointer', color: 'var(--gl-ok)', fontWeight: 700 }}>+</button>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: t.radiusFull, fontSize: t.textXs, fontWeight: 700, background: est.bg, color: est.text }}>
                            {est.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <button
                            onClick={() => pedirConfirm(`¿Eliminar "${item.nombre}"?`, () => eliminarHerramientaInsumo(item.id))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', alignItems: 'center', margin: '0 auto' }}
                            title="Eliminar item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── SOLICITUDES PENDIENTES ── */}
        {despachosPendientes.length > 0 && (
          <Card style={{ borderLeft: `3px solid var(--gl-dispatch)` }}>
            <SectionHeader title={`📬 Solicitudes Pendientes (${despachosPendientes.length})`} />
            {despachosPendientes.map(d => (
              <div key={d.id} style={{ padding: '14px 16px', borderBottom: `1px solid ${t.border}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: t.textSm, color: t.textPrimary }}>
                        {d.centroNombre || d.centroId}
                      </span>
                      <span style={{ fontSize: t.textXs, fontWeight: 600, color: 'var(--gl-dispatch)', background: 'var(--gl-border)', padding: '1px 6px', borderRadius: t.radiusFull }}>
                        {d.estado}
                      </span>
                    </div>
                    <div style={{ background: t.bgSurface, borderRadius: t.radiusSm, padding: '8px 12px' }}>
                      {(d.items || []).map((item, idx) => {
                        const qty = item.cantidadEnviada ?? item.cantidadSolicitada ?? item.cantidad ?? 1
                        const flag = getFlag(item.nombre, qty)
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: t.textXs, color: t.textPrimary, marginBottom: 2 }}>
                            {flag && <span style={{ fontWeight: 700, minWidth: 12, color: flag.color }}>{flag.label}</span>}
                            <span>• {item.nombre} × <strong>{qty}</strong></span>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ fontSize: t.textXs, color: t.textMuted, marginTop: 6 }}>
                      {d.creadoEn ? new Date(d.creadoEn).toLocaleDateString('es-CL') : '—'}
                    </div>
                  </div>
                  <button
                    onClick={() => abrirDespacho(d)}
                    style={{ padding: '8px 14px', background: 'var(--gl-ok)', color: '#fff', border: 'none', borderRadius: t.radiusMd, cursor: 'pointer', fontSize: t.textSm, fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    Despachar
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}

      </div>

      {/* MODALES */}
      <ModalAgregarEquipo
        isOpen={modalAgregarEquipo}
        onClose={() => { setModalAgregarEquipo(false); setModeloPre(null) }}
        onAgregar={agregarEquipo}
        modelos={MODELOS_EQUIPOS}
        modeloDefault={modeloPre}
      />
      <ModalCambiarEstado
        isOpen={modalCambiarEstado}
        onClose={() => { setModalCambiarEstado(false); setEquipoSel(null) }}
        equipo={equipoSel}
        onCambiar={cambiarEstadoEquipo}
      />
      <ModalAgregarRepuesto
        isOpen={modalAgregarRepuesto}
        onClose={() => setModalAgregarRepuesto(false)}
        onAgregar={agregarRepuesto}
        modelos={MODELOS_EQUIPOS}
      />
      <ModalAgregarHerramientaInsumo
        isOpen={modalAgregarHI}
        onClose={() => setModalAgregarHI(false)}
        onAgregar={agregarHerramientaInsumo}
      />
      <ModalDespacho
        isOpen={modalDespacho}
        onClose={() => { setModalDespacho(false); setSolicitudSel(null) }}
        solicitud={solicitudSel}
        onDespachar={handleDespachar}
      />

      {/* Modal confirmación (reemplaza window.confirm) */}
      {confirm && (
        <Modal open title="Confirmar" onClose={() => setConfirm(null)} maxWidth={320}
          footer={<>
            <Button variant="secondary" size="lg" onClick={() => setConfirm(null)}>Cancelar</Button>
            <Button variant="primary" size="lg" style={{ background: 'var(--gl-fault)' }}
              onClick={() => { confirm.onOk(); setConfirm(null) }}>Eliminar</Button>
          </>}>
          <p style={{ color: t.textSecondary, fontSize: t.textSm, margin: 0 }}>{confirm.msg}</p>
        </Modal>
      )}

      {/* Modal advertencia de stock insuficiente (C3) */}
      {stockWarning && (
        <Modal open title="Stock insuficiente" onClose={() => setStockWarning(null)} maxWidth={360}
          footer={<>
            <Button variant="secondary" size="lg" onClick={() => setStockWarning(null)}>Cancelar</Button>
            <Button size="lg" style={{ background: 'var(--gl-low)', color: '#000' }}
              onClick={() => { setSolicitudSel(stockWarning.solicitud); setModalDespacho(true); setStockWarning(null) }}>
              Despachar de todas formas
            </Button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gl-low)' }}>
              <AlertTriangle size={18} />
              <span style={{ fontWeight: 600, fontSize: t.textSm }}>Los siguientes ítems están agotados:</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {stockWarning.sinStock.map((item, i) => (
                <li key={i} style={{ fontSize: t.textSm, color: t.textPrimary, marginBottom: 4 }}>
                  {item.nombre} × {item.cantidad}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: t.textXs, color: t.textMuted, margin: 0 }}>
              Puedes despachar de todas formas si el stock se repondrá antes del envío, o cancelar para reponer primero.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
