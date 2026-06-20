import { useState } from 'react'
import { LogOut, TrendingUp, TrendingDown, Users, Smartphone, Building2,
         AlertCircle, CheckCircle2, Clock, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useOlimpo } from '../hooks/useOlimpo'
import { useGLMetrics } from '../hooks/useGLMetrics'
import { t } from '../theme/tokens'

const clp = (n) =>
  (n ?? 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

const mesActual = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const anioActual = () => String(new Date().getFullYear())

// ---- Sub-componentes pequeños ----

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? t.textPrimary }}>{value}</div>
      <div style={{ fontSize: 12, color: t.textMuted, marginTop: 3 }}>{label}</div>
    </div>
  )
}

function MetricBox({ label, value, icon, color }) {
  return (
    <div style={{ background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 4 }}>
        <span style={{ color: color ?? t.textMuted }}>{icon}</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: color ?? t.textPrimary }}>{value}</span>
      </div>
      <div style={{ fontSize: 11, color: t.textMuted }}>{label}</div>
    </div>
  )
}

function InfoBox({ title, icon, children, borderColor }) {
  return (
    <div style={{ background: t.bgSurface, border: `1px solid ${borderColor ?? t.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600, fontSize: 13, color: t.textSecondary }}>
        {icon} {title}
      </div>
      {children}
    </div>
  )
}

function FieldInput({ label, value, type = 'text', onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ color: t.textSecondary, fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        style={{ width: '100%', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textPrimary, fontSize: 13, padding: '8px 10px', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  )
}

const ESTADO_BADGE = {
  activa:     { label: 'Activa',      color: '#22c55e' },
  aviso:      { label: 'Aviso pago',  color: '#f59e0b' },
  suspendida: { label: 'Suspendida',  color: '#ef4444' },
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'clientes',  label: 'Clientes'  },
  { id: 'ingresos',  label: 'Ingresos'  },
  { id: 'gastos',    label: 'Gastos'    },
]

export default function OlimpoPage() {
  const { signOut, nombre } = useAuth()
  const { clientes, pagos, gastos, cargando, registrarPago, registrarGasto, actualizarCliente, eliminarPago, eliminarGasto } = useOlimpo()

  const [tab, setTab]           = useState('dashboard')
  const [modalPago, setModalPago]   = useState(false)
  const [modalGasto, setModalGasto] = useState(false)
  const [guardando, setGuardando]   = useState(false)
  const [formPago, setFormPago]     = useState({ mes: mesActual(), monto: 1000000, metodo: 'transferencia', referencia: '', nota: '' })
  const [formGasto, setFormGasto]   = useState({ categoria: 'firebase', descripcion: '', monto: 0, esRecurrente: false })

  const cliente = clientes[0] ?? null
  const glMetrics = useGLMetrics(cliente?.empresaId)

  const mes  = mesActual()
  const anio = anioActual()
  const hoy  = new Date()

  const ingresosMes  = pagos.filter(p => p.mes === mes) .reduce((s, p) => s + (p.monto ?? 0), 0)
  const gastosMes    = gastos.filter(g => g.mes === mes) .reduce((s, g) => s + (g.monto ?? 0), 0)
  const ingresosAnio = pagos.filter(p => p.mes?.startsWith(anio)) .reduce((s, p) => s + (p.monto ?? 0), 0)
  const gastosAnio   = gastos.filter(g => g.mes?.startsWith(anio)).reduce((s, g) => s + (g.monto ?? 0), 0)

  const diaVenc = cliente?.diaVencimiento ?? 19
  let proximoVenc = new Date(hoy.getFullYear(), hoy.getMonth(), diaVenc)
  if (proximoVenc <= hoy) proximoVenc = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaVenc)
  const diasVenc = Math.ceil((proximoVenc - hoy) / 86400000)

  const alertasGastos = gastos.filter(g => {
    if (!g.proximoVencimiento) return false
    const dias = Math.ceil((new Date(g.proximoVencimiento) - hoy) / 86400000)
    return dias >= 0 && dias <= 30
  })

  const handleRegistrarPago = async () => {
    setGuardando(true)
    await registrarPago({ ...formPago, clienteId: cliente?.id ?? 'gl-robotica', fecha: new Date().toISOString() })
    setModalPago(false)
    setFormPago({ mes: mesActual(), monto: 1000000, metodo: 'transferencia', referencia: '', nota: '' })
    setGuardando(false)
  }

  const handleRegistrarGasto = async () => {
    setGuardando(true)
    const proximoVencimiento = formGasto.esRecurrente
      ? new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate()).toISOString()
      : null
    await registrarGasto({ ...formGasto, mes, fecha: new Date().toISOString(), ...(proximoVencimiento ? { proximoVencimiento } : {}) })
    setModalGasto(false)
    setFormGasto({ categoria: 'firebase', descripcion: '', monto: 0, esRecurrente: false })
    setGuardando(false)
  }

  return (
    <div style={{ minHeight: '100dvh', background: t.bgBase, color: t.textPrimary, display: 'flex', flexDirection: 'column', fontFamily: t.fontSans }}>

      {/* Header propio */}
      <header style={{ background: t.bgSurface, borderBottom: `1px solid ${t.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 14, height: 60, flexShrink: 0 }}>
        <img src="/hyperionx-symbol.png" alt="HX" style={{ height: 34, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
          onError={e => { e.currentTarget.style.display = 'none' }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, lineHeight: 1 }}>HyperionX · Olimpo</div>
          <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: '0.05em' }}>PANEL DE CONTROL MAESTRO</div>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: t.textSecondary, display: 'none' }}>{nombre}</span>
        <button onClick={signOut} style={{ background: 'none', border: `1px solid ${t.border}`, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, borderRadius: 8, padding: '6px 12px' }}>
          <LogOut size={14} /> Salir
        </button>
      </header>

      {/* Tabs */}
      <div style={{ background: t.bgSurface, borderBottom: `1px solid ${t.border}`, display: 'flex', padding: '0 20px', flexShrink: 0 }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            style={{ background: 'none', border: 'none', color: tab === tb.id ? t.brand : t.textMuted, borderBottom: `2px solid ${tab === tb.id ? t.brand : 'transparent'}`, padding: '12px 16px', cursor: 'pointer', fontSize: 14, fontWeight: tab === tb.id ? 600 : 400, transition: 'all 0.15s', fontFamily: 'inherit' }}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, padding: '24px 20px', maxWidth: 860, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* === DASHBOARD === */}
        {tab === 'dashboard' && (
          <div className="fade-in">
            <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 18 }}>
              {new Date().toLocaleString('es-CL', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 22 }}>
              <StatCard label="Ingresos del mes"        value={clp(ingresosMes)}                      color="#22c55e" />
              <StatCard label="Gastos del mes"          value={clp(gastosMes)}                        color="#ef4444" />
              <StatCard label="Margen neto del mes"     value={clp(ingresosMes - gastosMes)}          color={ingresosMes - gastosMes >= 0 ? '#22c55e' : '#ef4444'} />
              <StatCard label="Margen acumulado año"    value={clp(ingresosAnio - gastosAnio)}        color={ingresosAnio - gastosAnio >= 0 ? '#22c55e' : '#ef4444'} />
            </div>

            {/* Próximo cobro */}
            <InfoBox title="Próximo cobro" icon={<Clock size={15} color={t.brand} />}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, color: t.textPrimary }}>
                  <b>{cliente?.nombre ?? 'GL Robótica'}</b>
                  <span style={{ color: t.textMuted }}> · {clp(cliente?.planMensual ?? 1000000)} · vence {proximoVenc.toLocaleDateString('es-CL')}</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: diasVenc <= 5 ? '#f59e0b' : t.brand }}>
                  {diasVenc} días
                </span>
              </div>
            </InfoBox>

            {/* Alertas de vencimiento */}
            {alertasGastos.length > 0 && (
              <InfoBox title={`${alertasGastos.length} gasto(s) próximos a vencer`} icon={<AlertCircle size={15} color="#f59e0b" />} borderColor="rgba(245,158,11,0.35)">
                {alertasGastos.map(g => (
                  <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: t.textSecondary, borderBottom: `1px solid ${t.border}` }}>
                    <span>{g.descripcion}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                      {Math.ceil((new Date(g.proximoVencimiento) - hoy) / 86400000)} días
                    </span>
                  </div>
                ))}
              </InfoBox>
            )}

            {cargando && <p style={{ color: t.textMuted, fontSize: 13 }}>Cargando datos…</p>}
          </div>
        )}

        {/* === CLIENTES === */}
        {tab === 'clientes' && (
          <div className="fade-in">
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 18, color: t.textPrimary }}>Clientes</h2>

            {cargando && <p style={{ color: t.textMuted, fontSize: 13 }}>Cargando…</p>}

            {!cargando && !cliente && (
              <p style={{ color: t.textMuted, fontSize: 13 }}>
                No hay clientes configurados. Crea el documento <code style={{ background: t.bgInput, borderRadius: 4, padding: '2px 5px' }}>hxOlimpo/gl-robotica</code> en Firestore.
              </p>
            )}

            {cliente && (
              <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24 }}>
                {/* Encabezado del cliente */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary }}>{cliente.nombre}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 3 }}>
                      Plan: {clp(cliente.planMensual ?? 1000000)} / mes · vence el día {cliente.diaVencimiento ?? 19}
                    </div>
                  </div>
                  {(() => {
                    const b = ESTADO_BADGE[cliente.estado ?? 'activa'] ?? ESTADO_BADGE.activa
                    return (
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 99, color: b.color, background: `${b.color}18`, border: `1px solid ${b.color}44` }}>
                        {b.label}
                      </span>
                    )
                  })()}
                </div>

                {/* Métricas de uso */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Uso actual</div>
                  {glMetrics.cargando ? (
                    <p style={{ fontSize: 12, color: t.textMuted }}>Cargando métricas…</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
                      <MetricBox label="Admin"     value={glMetrics.porRol.admin}       icon={<Users size={13} />} />
                      <MetricBox label="Supervisor" value={glMetrics.porRol.supervisor} icon={<Users size={13} />} />
                      <MetricBox label="Operador"   value={glMetrics.porRol.operador}   icon={<Users size={13} />} />
                      <MetricBox label="Con móvil"  value={glMetrics.movilesHabilitados} icon={<Smartphone size={13} />} color={t.brand} />
                      <MetricBox label="Centros"    value={glMetrics.totalCentros}       icon={<Building2 size={13} />} />
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
                  <button onClick={() => setModalPago(true)} style={btnPrimary}>
                    <Plus size={14} /> Registrar pago
                  </button>
                  <div>
                    <label style={{ fontSize: 11, color: t.textMuted, display: 'block', marginBottom: 4 }}>Estado del cliente</label>
                    <select
                      value={cliente.estado ?? 'activa'}
                      onChange={e => actualizarCliente(cliente.id, { estado: e.target.value }, cliente.empresaId)}
                      style={{ background: t.bgInput, border: `1px solid ${t.border}`, color: t.textSecondary, borderRadius: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <option value="activa">Activa</option>
                      <option value="aviso">Aviso de pago</option>
                      <option value="suspendida">Suspendida</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === INGRESOS === */}
        {tab === 'ingresos' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>Ingresos</h2>
              <button onClick={() => setModalPago(true)} style={btnPrimary}><Plus size={14} /> Registrar pago</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <StatCard label="Este mes" value={clp(ingresosMes)}  color="#22c55e" />
              <StatCard label="Este año" value={clp(ingresosAnio)} color="#22c55e" />
            </div>

            <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {pagos.length === 0
                ? <div style={{ padding: 24, color: t.textMuted, fontSize: 13 }}>Sin pagos registrados aún.</div>
                : [...pagos].sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? '')).map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: `1px solid ${t.border}`, fontSize: 13 }}>
                      <CheckCircle2 size={15} color="#22c55e" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: t.textPrimary, fontWeight: 600 }}>{clp(p.monto)}</div>
                        <div style={{ color: t.textMuted, fontSize: 11 }}>
                          {p.mes} · {p.metodo}{p.referencia ? ` · Ref: ${p.referencia}` : ''}
                          {p.nota ? ` · ${p.nota}` : ''}
                        </div>
                      </div>
                      <div style={{ color: t.textMuted, fontSize: 11 }}>
                        {p.fecha ? new Date(p.fecha).toLocaleDateString('es-CL') : '—'}
                      </div>
                      <button onClick={() => eliminarPago(p.id)} title="Eliminar" style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* === GASTOS === */}
        {tab === 'gastos' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>Gastos</h2>
              <button onClick={() => setModalGasto(true)} style={btnPrimary}><Plus size={14} /> Agregar gasto</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <StatCard label="Este mes" value={clp(gastosMes)}  color="#ef4444" />
              <StatCard label="Este año" value={clp(gastosAnio)} color="#ef4444" />
            </div>

            <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {gastos.length === 0
                ? <div style={{ padding: 24, color: t.textMuted, fontSize: 13 }}>Sin gastos registrados aún.</div>
                : [...gastos].sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? '')).map(g => {
                    const catColor = { firebase: '#f97316', vercel: '#888', dominio: '#8b5cf6', otro: t.textMuted }[g.categoria] ?? t.textMuted
                    return (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: `1px solid ${t.border}`, fontSize: 13 }}>
                        <span style={{ background: `${catColor}20`, color: catColor, border: `1px solid ${catColor}40`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                          {g.categoria}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: t.textPrimary, fontWeight: 600 }}>{clp(g.monto)}</div>
                          <div style={{ color: t.textMuted, fontSize: 11 }}>
                            {g.descripcion} · {g.mes}{g.esRecurrente ? ' · recurrente' : ''}
                          </div>
                        </div>
                        {g.proximoVencimiento && (
                          <span style={{ fontSize: 11, color: '#f59e0b', flexShrink: 0 }}>
                            vence {new Date(g.proximoVencimiento).toLocaleDateString('es-CL')}
                          </span>
                        )}
                        <button onClick={() => eliminarGasto(g.id)} title="Eliminar" style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )
                  })
              }
            </div>
          </div>
        )}
      </div>

      {/* Modal: Registrar pago */}
      {modalPago && (
        <div style={overlay} onClick={() => setModalPago(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: t.textPrimary, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Registrar pago</h3>
            <FieldInput label="Mes (YYYY-MM)"          value={formPago.mes}        onChange={v => setFormPago(f => ({ ...f, mes: v }))} />
            <FieldInput label="Monto (CLP)"            value={formPago.monto}      onChange={v => setFormPago(f => ({ ...f, monto: Number(v) }))} type="number" />
            <FieldInput label="Referencia (N° transf.)" value={formPago.referencia} onChange={v => setFormPago(f => ({ ...f, referencia: v }))} />
            <FieldInput label="Nota"                   value={formPago.nota}       onChange={v => setFormPago(f => ({ ...f, nota: v }))} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setModalPago(false)} style={btnSecondary}>Cancelar</button>
              <button onClick={handleRegistrarPago} disabled={guardando} style={{ ...btnPrimary, flex: 2, justifyContent: 'center' }}>
                {guardando ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar gasto */}
      {modalGasto && (
        <div style={overlay} onClick={() => setModalGasto(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: t.textPrimary, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Agregar gasto</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={{ color: t.textSecondary, fontSize: 12, display: 'block', marginBottom: 4 }}>Categoría</label>
              <select value={formGasto.categoria} onChange={e => setFormGasto(f => ({ ...f, categoria: e.target.value }))}
                style={{ width: '100%', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textPrimary, fontSize: 13, padding: '8px 10px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}>
                <option value="firebase">Firebase</option>
                <option value="vercel">Vercel</option>
                <option value="dominio">Dominio (Donweb)</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <FieldInput label="Descripción" value={formGasto.descripcion} onChange={v => setFormGasto(f => ({ ...f, descripcion: v }))} />
            <FieldInput label="Monto (CLP)" value={formGasto.monto}       onChange={v => setFormGasto(f => ({ ...f, monto: Number(v) }))} type="number" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', marginBottom: 16, fontSize: 13, color: t.textSecondary }}>
              <input type="checkbox" checked={formGasto.esRecurrente} onChange={e => setFormGasto(f => ({ ...f, esRecurrente: e.target.checked }))}
                style={{ accentColor: t.brand, width: 16, height: 16 }} />
              Gasto recurrente / anual (alerta 30 días antes)
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalGasto(false)} style={btnSecondary}>Cancelar</button>
              <button onClick={handleRegistrarGasto} disabled={guardando} style={{ ...btnPrimary, flex: 2, justifyContent: 'center' }}>
                {guardando ? 'Guardando…' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Estilos compartidos ----
const btnPrimary   = { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }
const btnSecondary = { flex: 1, background: 'transparent', border: `1px solid var(--gl-border)`, color: 'var(--gl-text-secondary)', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }
const overlay      = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }
const modal        = { background: 'var(--gl-bg-elevated)', border: `1px solid var(--gl-border)`, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }
