import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import { t } from '../theme/tokens'
import { useAuth } from '../hooks/useAuth'
import { useBodegaCentral } from '../hooks/useBodegaCentral'
import { useIsMobile } from '../hooks/useIsMobile'

const MODELOS_EQUIPOS = ['DTG3', 'DTG2', 'Pivot', 'V6Plus', 'V6Expert', 'E-Go']

const ESTADO_COLOR = {
  disponible: { bg: 'var(--gl-ok-tint)',    text: 'var(--gl-ok)',    label: 'Disponible' },
  bajo_stock: { bg: 'var(--gl-low-tint)',   text: 'var(--gl-low)',   label: 'Bajo Stock' },
  agotado:    { bg: 'var(--gl-fault-tint)', text: 'var(--gl-fault)', label: 'Agotado' },
}

function Card({ children, style }) {
  return (
    <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, marginBottom: 16, overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${t.border}` }}>
      <span style={{ fontWeight: 700, fontSize: t.textBase, color: t.textPrimary }}>{title}</span>
    </div>
  )
}

function ModelRowReadOnly({ modelo, eq }) {
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

      {expanded && unidades.length > 0 && (
        <div style={{ background: t.bgBase, padding: '8px 16px 12px' }}>
          {unidades.map((u, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 6, background: t.bgSurface, borderRadius: t.radiusSm, border: `1px solid var(--gl-ok-tint)` }}>
              <span style={{ fontSize: t.textXs, color: 'var(--gl-ok)', fontWeight: 700 }}>✓</span>
              <span style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary }}>{u.serial}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RepuestoModelRowReadOnly({ modelo, repuestos }) {
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
                <span style={{ fontSize: t.textSm, fontWeight: 700, color: t.textPrimary, padding: '2px 10px', background: t.bgElevated, borderRadius: t.radiusSm, border: `1px solid ${t.border}` }}>
                  {r.cantidad}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function BodegaAdminPage() {
  const { role, loading: authLoading } = useAuth()
  const { equipos, repuestos, herramientasInsumos } = useBodegaCentral()
  const isMobile = useIsMobile()

  if (authLoading) return null

  if (role !== 'admin') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--gl-fault)' }}>
        <AlertCircle size={32} />
        <p style={{ fontSize: t.textSm }}>No tienes permisos para ver esta sección.</p>
      </div>
    )
  }

  const equiposEnReparacion = equipos.flatMap(e =>
    (e.unidades || []).filter(u => u.estado === 'conFalla').map(u => ({ ...u, modelo: e.modelo }))
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: t.space5, background: t.bgBase }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.space5 }}>
          <h1 style={{ fontSize: t.textXl, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Bodega Virtual</h1>
          <span style={{ fontSize: t.textXs, color: t.textMuted, background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusFull, padding: '3px 10px' }}>
            Solo lectura
          </span>
        </div>

        {/* Resumen rápido */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Equipos operativos', value: equipos.reduce((s, e) => s + (e.totalOperativos ?? 0), 0), color: 'var(--gl-ok)' },
            { label: 'En reparación',      value: equiposEnReparacion.length,                                color: 'var(--gl-fault)' },
            { label: 'Tipos repuestos',    value: repuestos.length,                                          color: t.brandSoft },
            { label: 'Herr./Insumos',      value: herramientasInsumos.length,                               color: t.textSecondary },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '12px 14px' }}>
              <div style={{ fontSize: t.textXl, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: t.textXs, color: t.textMuted, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Equipos ROV */}
        <Card>
          <SectionTitle title="📦 Equipos ROV" />
          {MODELOS_EQUIPOS.map(modelo => (
            <ModelRowReadOnly key={modelo} modelo={modelo} eq={equipos.find(e => e.id === modelo)} />
          ))}
        </Card>

        {/* En reparación */}
        {equiposEnReparacion.length > 0 && (
          <Card style={{ borderLeft: `3px solid var(--gl-fault)` }}>
            <SectionTitle title={`🔧 En Reparación (${equiposEnReparacion.length})`} />
            {equiposEnReparacion.map((eq, idx) => (
              <div key={idx} style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}`, background: 'var(--gl-fault-tint)' }}>
                <div style={{ fontWeight: 700, fontSize: t.textSm, color: t.textPrimary }}>{eq.modelo} — {eq.serial}</div>
                <div style={{ fontSize: t.textXs, color: t.textSecondary, marginTop: 2 }}>Falla: {eq.detallesFalla || '—'}</div>
                {eq.desde && (
                  <div style={{ fontSize: t.textXs, color: t.textMuted, marginTop: 2 }}>
                    Desde: {new Date(eq.desde).toLocaleDateString('es-CL')}
                  </div>
                )}
              </div>
            ))}
          </Card>
        )}

        {/* Repuestos */}
        <Card>
          <SectionTitle title="⚙️ Repuestos" />
          {MODELOS_EQUIPOS.map(modelo => (
            <RepuestoModelRowReadOnly key={modelo} modelo={modelo} repuestos={repuestos} />
          ))}
        </Card>

        {/* Herramientas / Insumos */}
        <Card>
          <SectionTitle title="🛠️ Herramientas / Insumos" />
          {herramientasInsumos.length === 0 ? (
            <p style={{ fontSize: t.textSm, color: t.textMuted, padding: '16px' }}>No hay items registrados</p>
          ) : isMobile ? (
            <div>
              {herramientasInsumos.map(item => {
                const est = ESTADO_COLOR[item.estado] || ESTADO_COLOR.disponible
                return (
                  <div key={item.id} style={{ borderBottom: `1px solid ${t.border}`, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: t.textPrimary, fontSize: t.textSm }}>{item.nombre}</div>
                      <div style={{ color: t.textSecondary, fontSize: t.textXs, marginTop: 2 }}>{item.categoria}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, color: t.textPrimary, fontSize: t.textBase }}>{item.cantidad}</span>
                      <span style={{ padding: '2px 8px', borderRadius: t.radiusFull, fontSize: t.textXs, fontWeight: 700, background: est.bg, color: est.text }}>
                        {est.label}
                      </span>
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
                  </tr>
                </thead>
                <tbody>
                  {herramientasInsumos.map(item => {
                    const est = ESTADO_COLOR[item.estado] || ESTADO_COLOR.disponible
                    return (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: t.textPrimary }}>{item.nombre}</td>
                        <td style={{ padding: '10px 16px', color: t.textSecondary, fontSize: t.textXs }}>{item.categoria}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: t.textPrimary }}>{item.cantidad}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: t.radiusFull, fontSize: t.textXs, fontWeight: 700, background: est.bg, color: est.text }}>
                            {est.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </div>
  )
}
