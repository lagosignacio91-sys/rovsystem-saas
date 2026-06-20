import { useState, useEffect } from 'react'
import { LogOut, Target, Globe, TrendingUp, Package, Cpu, ChevronRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useHxData } from '../hooks/useHxData'
import { useClienteMetrics } from '../hooks/useClienteMetrics'
import '../styles/olimpo.css'

const SECCIONES = [
  { id: 'command',     label: 'COMMAND CENTER', Icon: Target     },
  { id: 'operaciones', label: 'OPERACIONES',    Icon: Globe      },
  { id: 'finanzas',    label: 'FINANZAS',       Icon: TrendingUp },
  { id: 'logistica',   label: 'LOGÍSTICA',      Icon: Package    },
  { id: 'sistemas',    label: 'SISTEMAS',        Icon: Cpu        },
]

const clp = (n) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(n ?? 0)

export default function OlimpoPage() {
  const { user, signOut } = useAuth()
  const [seccion, setSeccion] = useState('command')
  const [hora, setHora]       = useState('')
  const hxData                = useHxData()

  useEffect(() => {
    const tick = () => setHora(new Date().toLocaleTimeString('es-CL', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const email    = user?.email ?? ''
  const userTag  = email.split('@')[0]?.toUpperCase() ?? '---'
  const secActual = SECCIONES.find(s => s.id === seccion)

  return (
    <div className="hx-olimpo">
      {/* ─── SIDEBAR ────────────────────────────────── */}
      <aside className="hx-sidebar">
        <div className="hx-sidebar-brand">
          <div className="hx-hexagon">⬡</div>
          <div>
            <div className="hx-brand-name">HYPERIONX</div>
            <div className="hx-brand-sub">OLIMPO · v2.0</div>
          </div>
        </div>

        <div className="hx-sidebar-divider" />

        <nav className="hx-nav">
          {SECCIONES.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`hx-nav-item ${seccion === id ? 'active' : ''}`}
              onClick={() => setSeccion(id)}
            >
              <Icon size={13} strokeWidth={1.8} />
              <span>{label}</span>
              {seccion === id && <ChevronRight size={11} className="hx-nav-arrow" />}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />
        <div className="hx-sidebar-divider" />

        <div className="hx-sidebar-footer">
          <div className="hx-sys-status">
            <span className="hx-dot hx-dot-green" /> SYS ONLINE
          </div>
          <div className="hx-user-info">{userTag}</div>
          <button className="hx-logout-btn" onClick={signOut}>
            <LogOut size={12} /> LOGOUT
          </button>
        </div>
      </aside>

      {/* ─── MAIN ───────────────────────────────────── */}
      <div className="hx-main">
        <header className="hx-header">
          <div className="hx-header-title">{secActual?.label}</div>
          <div className="hx-header-right">
            <div className="hx-clock">{hora}</div>
            <div className="hx-sys-badge">
              <span className="hx-dot hx-dot-red hx-blink" /> SISTEMA ACTIVO
            </div>
          </div>
        </header>

        <main className="hx-content">
          {seccion === 'command'     && <CommandCenter hxData={hxData} />}
          {seccion === 'operaciones' && <Operaciones   hxData={hxData} />}
          {seccion === 'finanzas'    && <Finanzas  hxData={hxData} />}
          {seccion === 'logistica'   && <Logistica hxData={hxData} />}
          {seccion === 'sistemas'    && <Sistemas hxData={hxData} user={user} />}
        </main>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   COMMAND CENTER
═══════════════════════════════════════════════════════════════ */
function CommandCenter({ hxData }) {
  const { clientes, pagos, gastos, cargando, mesActual } = hxData
  const mes = mesActual()

  const ingresosMes = pagos.filter(p => p.mes === mes).reduce((s, p) => s + (p.monto ?? 0), 0)
  const gastosMes   = gastos.filter(g => g.mes === mes).reduce((s, g) => s + (g.monto ?? 0), 0)
  const margen  = ingresosMes - gastosMes
  const pct     = ingresosMes > 0 ? Math.round((margen / ingresosMes) * 100) : 0
  const color   = margen >= 0 ? 'var(--hx-green)' : 'var(--hx-red-soft)'
  const activos = clientes.filter(c => c.estado === 'activa').length
  const enAviso = clientes.filter(c => c.estado === 'aviso').length
  const proximoCobro = calcProximoCobro(clientes, pagos, mes)
  const alertas      = calcAlertas(gastos)
  const mesNombre    = new Date(mes + '-15').toLocaleString('es-CL', { month: 'long', year: 'numeric' })

  if (cargando) return <CargandoPlaceholder />

  return (
    <div className="hx-stack">
      <div className="hx-grid-2">
        <StatCard title="INGRESOS DEL MES" value={clp(ingresosMes)} sub={mesNombre.toUpperCase()} color="var(--hx-green)" />
        <StatCard title="GASTOS DEL MES"   value={clp(gastosMes)}   sub={mesNombre.toUpperCase()} color="var(--hx-red-soft)" />
      </div>

      <div className="hx-panel">
        <div className="hx-panel-title">MARGEN NETO DEL MES</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span className="hx-value" style={{ color, textShadow: `0 0 16px ${color}55` }}>{clp(margen)}</span>
          <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 13, color: 'var(--hx-muted)', letterSpacing: '0.06em' }}>{pct}%</span>
        </div>
        <div className="hx-progress-track">
          <div className="hx-progress-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color, boxShadow: `0 0 10px ${color}` }} />
        </div>
      </div>

      <div className="hx-grid-2">
        <div className="hx-panel">
          <div className="hx-panel-title">CLIENTES</div>
          <div style={{ display: 'flex', gap: 32, marginTop: 4 }}>
            <div>
              <div className="hx-value" style={{ color: 'var(--hx-green)', textShadow: '0 0 14px var(--hx-green-glow)' }}>{activos}</div>
              <div className="hx-label-sm">ACTIVOS</div>
            </div>
            <div>
              <div className="hx-value" style={{ color: enAviso > 0 ? 'var(--hx-amber)' : 'var(--hx-muted)' }}>{enAviso}</div>
              <div className="hx-label-sm">EN AVISO</div>
            </div>
          </div>
        </div>
        <ProximoCobro cobro={proximoCobro} />
      </div>

      <div className="hx-panel">
        <div className="hx-panel-title">ALERTAS DEL SISTEMA</div>
        {alertas.length === 0
          ? <div className="hx-empty" style={{ color: 'var(--hx-green)' }}>✓ &nbsp;SIN ALERTAS ACTIVAS</div>
          : alertas.map((a, i) => <div key={i} className="hx-alert-row amber">⚠ {a}</div>)
        }
      </div>
    </div>
  )
}

function calcProximoCobro(clientes, pagos, mes) {
  const hoy = new Date()
  return clientes
    .filter(c => c.estado === 'activa')
    .map(c => {
      const dia    = c.plan?.diaVencimiento ?? 1
      const pagado = pagos.some(p => p.clienteId === c.id && p.mes === mes)
      const fechaVenc = (pagado || hoy.getDate() > dia)
        ? new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia)
        : new Date(hoy.getFullYear(), hoy.getMonth(), dia)
      return { cliente: c, fechaVenc, diasRestantes: Math.ceil((fechaVenc - hoy) / 86400000), monto: c.plan?.tarifaBase ?? 0 }
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes)[0] ?? null
}

function calcAlertas(gastos) {
  const hoy = new Date()
  const lim = new Date(hoy.getTime() + 60 * 86400000)
  return gastos
    .filter(g => g.proximoVencimiento && new Date(g.proximoVencimiento) <= lim)
    .map(g => {
      const dias = Math.ceil((new Date(g.proximoVencimiento) - hoy) / 86400000)
      return dias <= 0 ? `${g.descripcion} — VENCIDO` : `${g.descripcion} — vence en ${dias} días`
    })
}

function ProximoCobro({ cobro }) {
  if (!cobro) return (
    <div className="hx-panel">
      <div className="hx-panel-title">PRÓXIMO COBRO</div>
      <div className="hx-empty">SIN CLIENTES ACTIVOS</div>
    </div>
  )
  const { cliente, fechaVenc, diasRestantes, monto } = cobro
  const color  = diasRestantes < 0 ? 'var(--hx-red-soft)' : diasRestantes <= 7 ? 'var(--hx-amber)' : 'var(--hx-text)'
  const fechaStr = fechaVenc.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div className="hx-panel">
      <div className="hx-panel-title">PRÓXIMO COBRO</div>
      <div style={{ fontFamily: 'var(--hx-mono)', fontSize: 11, color: 'var(--hx-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>
        {cliente.nombre?.toUpperCase()}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span className="hx-value-sm" style={{ color: 'var(--hx-green)' }}>{clp(monto)}</span>
        <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 10, color, letterSpacing: '0.08em' }}>
          {diasRestantes < 0 ? `VENCIDO hace ${Math.abs(diasRestantes)}d` : `en ${diasRestantes}d`}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--hx-mono)', fontSize: 9, color: 'var(--hx-muted)', marginTop: 4, letterSpacing: '0.06em' }}>
        {fechaStr.toUpperCase()}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   OPERACIONES
═══════════════════════════════════════════════════════════════ */
function Operaciones({ hxData }) {
  const { clientes, productos, pagos, actualizarCliente, registrarPago, registrarMejora } = hxData
  const [expandido,   setExpandido]   = useState(null)
  const [modalPago,   setModalPago]   = useState(null)
  const [modalEstado, setModalEstado] = useState(null)
  const [modalMejora, setModalMejora] = useState(null)

  return (
    <div className="hx-stack">
      <div style={{ fontFamily: 'var(--hx-mono)', fontSize: 9, color: 'var(--hx-muted)', letterSpacing: '0.15em', marginBottom: 4 }}>
        {clientes.length} CLIENTE(S) REGISTRADO(S)
      </div>

      {clientes.length === 0
        ? <div className="hx-panel"><div className="hx-empty">SIN CLIENTES REGISTRADOS</div></div>
        : clientes.map(c => (
            <ClienteRow
              key={c.id}
              cliente={c}
              productos={productos}
              pagos={pagos.filter(p => p.clienteId === c.id)}
              expandido={expandido === c.id}
              onToggle={() => setExpandido(expandido === c.id ? null : c.id)}
              onPago={()   => setModalPago({   clienteId: c.id, nombre: c.nombre, monto: c.plan?.tarifaBase ?? 0 })}
              onEstado={()  => setModalEstado({ clienteId: c.id, estadoActual: c.estado })}
              onMejora={()  => setModalMejora({ clienteId: c.id, disponibles: c.licencia?.mejorasDisponibles ?? 2, usadas: c.licencia?.mejorasUsadas ?? 0 })}
            />
          ))
      }

      {modalPago && (
        <ModalPago
          {...modalPago}
          onGuardar={async d => { await registrarPago(d); setModalPago(null) }}
          onCerrar={() => setModalPago(null)}
        />
      )}
      {modalEstado && (
        <ModalEstado
          {...modalEstado}
          onGuardar={async e => { await actualizarCliente(modalEstado.clienteId, { estado: e }); setModalEstado(null) }}
          onCerrar={() => setModalEstado(null)}
        />
      )}
      {modalMejora && (
        <ModalMejora
          {...modalMejora}
          onGuardar={async d => { await registrarMejora(modalMejora.clienteId, d); setModalMejora(null) }}
          onCerrar={() => setModalMejora(null)}
        />
      )}
    </div>
  )
}

function ClienteRow({ cliente, productos, pagos, expandido, onToggle, onPago, onEstado, onMejora }) {
  const producto  = productos.find(p => p.id === cliente.productoId)
  const usadas    = cliente.licencia?.mejorasUsadas ?? 0
  const disponibles = cliente.licencia?.mejorasDisponibles ?? 2

  return (
    <div className={`hx-client-row ${expandido ? 'expanded' : ''}`}>
      <div className="hx-client-header" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <span className="hx-client-expand" style={{ fontFamily: 'var(--hx-mono)', fontSize: 10, color: 'var(--hx-muted)', transition: 'transform 0.2s', display: 'inline-block', transform: expandido ? 'rotate(90deg)' : 'none' }}>▶</span>
        <span className="hx-client-name">{cliente.nombre}</span>
        <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 9, color: 'var(--hx-muted)', letterSpacing: '0.08em' }}>
          {producto?.nombre ?? cliente.productoId ?? '—'}
        </span>
        <EstadoBadge estado={cliente.estado} />
        <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 11, color: 'var(--hx-green)', marginLeft: 'auto' }}>
          {clp(cliente.plan?.tarifaBase ?? 0)}
        </span>
        <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 9, color: usadas < disponibles ? 'var(--hx-text-dim)' : 'var(--hx-muted)', letterSpacing: '0.06em', marginLeft: 12 }}>
          {usadas}/{disponibles} MEJ.
        </span>
      </div>

      {expandido && (
        <div className="hx-client-details">
          <div className="hx-grid-3">
            <MetricasBox queryMetricas={cliente.queryMetricas} />
            <UltimosPagos pagos={pagos} />
            <MejorasBox licencia={cliente.licencia} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="hx-btn hx-btn-primary" onClick={onPago}>+ REGISTRAR PAGO</button>
            <button className="hx-btn hx-btn-ghost"  onClick={onEstado}>CAMBIAR ESTADO</button>
            <button className="hx-btn hx-btn-ghost"  onClick={onMejora}>+ MEJORA USADA</button>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricasBox({ queryMetricas }) {
  const { totalUsuarios, porRol, movilesHabilitados, totalCentros, cargando } = useClienteMetrics(queryMetricas)
  return (
    <div className="hx-panel">
      <div className="hx-panel-title">USO DEL SISTEMA</div>
      {cargando
        ? <div className="hx-empty">CARGANDO...</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Metrica label="USUARIOS TOTALES" value={totalUsuarios} color="var(--hx-text)" />
            <Metrica label="  · ADMIN"      value={porRol.admin}      small />
            <Metrica label="  · SUPERVISOR"  value={porRol.supervisor} small />
            <Metrica label="  · OPERADOR"    value={porRol.operador}   small />
            <Metrica label="MÓVILES HAB."    value={movilesHabilitados} color="var(--hx-green)" />
            <Metrica label="CENTROS"          value={totalCentros} />
          </div>
      }
    </div>
  )
}

function Metrica({ label, value, color, small }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: 'var(--hx-mono)', fontSize: small ? 8 : 9, color: 'var(--hx-muted)', letterSpacing: '0.1em' }}>{label}</span>
      <span style={{ fontFamily: 'var(--hx-mono)', fontSize: small ? 10 : 12, fontWeight: 700, color: color ?? 'var(--hx-text-dim)' }}>{value}</span>
    </div>
  )
}

function UltimosPagos({ pagos }) {
  const ultimos = pagos.slice(0, 3)
  return (
    <div className="hx-panel">
      <div className="hx-panel-title">ÚLTIMOS PAGOS</div>
      {ultimos.length === 0
        ? <div className="hx-empty">SIN PAGOS REGISTRADOS</div>
        : ultimos.map((p, i) => (
            <div key={i} style={{ paddingBottom: 8, marginBottom: 8, borderBottom: i < ultimos.length - 1 ? '1px solid var(--hx-border)' : 'none' }}>
              <div style={{ fontFamily: 'var(--hx-mono)', fontSize: 12, fontWeight: 700, color: 'var(--hx-green)' }}>{clp(p.monto)}</div>
              <div style={{ fontFamily: 'var(--hx-mono)', fontSize: 8, color: 'var(--hx-muted)', marginTop: 2, letterSpacing: '0.08em' }}>
                {p.mes} · {p.metodo ?? '—'}
              </div>
            </div>
          ))
      }
    </div>
  )
}

function MejorasBox({ licencia }) {
  const usadas    = licencia?.mejorasUsadas     ?? 0
  const disponibles = licencia?.mejorasDisponibles ?? 2
  const restantes = disponibles - usadas
  return (
    <div className="hx-panel">
      <div className="hx-panel-title">MEJORAS DE LICENCIA</div>
      <div style={{ fontFamily: 'var(--hx-mono)' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: restantes > 0 ? 'var(--hx-text)' : 'var(--hx-muted)', lineHeight: 1 }}>
          {usadas}<span style={{ fontSize: 13, color: 'var(--hx-muted)' }}>/{disponibles}</span>
        </div>
        <div style={{ fontSize: 9, color: restantes > 0 ? 'var(--hx-green)' : 'var(--hx-muted)', marginTop: 6, letterSpacing: '0.1em' }}>
          {restantes > 0 ? `${restantes} DISPONIBLE(S)` : 'MEJORAS AGOTADAS'}
        </div>
      </div>
    </div>
  )
}

function EstadoBadge({ estado }) {
  const cls = estado === 'activa' ? 'hx-badge-activa' : estado === 'aviso' ? 'hx-badge-aviso' : 'hx-badge-suspendida'
  const txt = estado === 'activa' ? '● ACTIVA' : estado === 'aviso' ? '⚠ AVISO' : '✕ SUSPENDIDA'
  return <span className={`hx-badge ${cls}`}>{txt}</span>
}

/* ═══════════════════════════════════════════════════════════════
   MODALES OPERACIONES
═══════════════════════════════════════════════════════════════ */
function ModalPago({ clienteId, nombre, monto, onGuardar, onCerrar }) {
  const mesHoy = new Date().toISOString().slice(0, 7)
  const [form, setForm]       = useState({ clienteId, mes: mesHoy, monto, moneda: 'CLP', metodo: 'transferencia', referencia: '', tipo: 'mensualidad', concepto: `Mensualidad ${new Date().toLocaleString('es-CL', { month: 'long', year: 'numeric' })}` })
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    setGuardando(true)
    await onGuardar({ ...form, monto: Number(form.monto), fecha: new Date().toISOString() })
    setGuardando(false)
  }

  return (
    <div className="hx-overlay" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="hx-modal">
        <div className="hx-modal-title">REGISTRAR PAGO — {nombre?.toUpperCase()}</div>

        <div className="hx-field">
          <label>CONCEPTO</label>
          <input className="hx-input" value={form.concepto} onChange={e => set('concepto', e.target.value)} />
        </div>

        <div className="hx-field-row">
          <div className="hx-field">
            <label>MES</label>
            <input className="hx-input" type="month" value={form.mes} onChange={e => set('mes', e.target.value)} />
          </div>
          <div className="hx-field">
            <label>MONTO (CLP)</label>
            <input className="hx-input" type="number" value={form.monto} onChange={e => set('monto', e.target.value)} />
          </div>
        </div>

        <div className="hx-field-row">
          <div className="hx-field">
            <label>MÉTODO</label>
            <select className="hx-select" value={form.metodo} onChange={e => set('metodo', e.target.value)}>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div className="hx-field">
            <label>N° OPERACIÓN</label>
            <input className="hx-input" value={form.referencia} onChange={e => set('referencia', e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <div className="hx-modal-actions">
          <button className="hx-btn hx-btn-ghost" onClick={onCerrar}>CANCELAR</button>
          <button className="hx-btn hx-btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? 'GUARDANDO...' : 'CONFIRMAR PAGO'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalEstado({ estadoActual, onGuardar, onCerrar }) {
  const [estado, setEstado] = useState(estadoActual)
  const OPCIONES = [
    { id: 'activa',     desc: 'Cliente al día — acceso total a la app' },
    { id: 'aviso',      desc: 'Muestra banner de pago pendiente en la app del cliente' },
    { id: 'suspendida', desc: 'Bloqueo total (en desarrollo)' },
  ]
  return (
    <div className="hx-overlay" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="hx-modal" style={{ maxWidth: 380 }}>
        <div className="hx-modal-title">CAMBIAR ESTADO DEL CLIENTE</div>
        {OPCIONES.map(o => (
          <div key={o.id} onClick={() => setEstado(o.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', marginBottom: 8, background: estado === o.id ? 'var(--hx-red-glow)' : 'rgba(0,0,0,0.25)', border: `1px solid ${estado === o.id ? 'rgba(220,38,38,0.4)' : 'var(--hx-border)'}`, borderRadius: 3, cursor: 'pointer' }}>
            <EstadoBadge estado={o.id} />
            <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 9, color: 'var(--hx-muted)', letterSpacing: '0.08em' }}>{o.desc}</span>
          </div>
        ))}
        <div className="hx-modal-actions">
          <button className="hx-btn hx-btn-ghost" onClick={onCerrar}>CANCELAR</button>
          <button className="hx-btn hx-btn-primary" onClick={() => onGuardar(estado)}>CONFIRMAR</button>
        </div>
      </div>
    </div>
  )
}

function ModalMejora({ disponibles, usadas, onGuardar, onCerrar }) {
  const [form, setForm]       = useState({ descripcion: '', fecha: new Date().toISOString().slice(0, 10) })
  const [guardando, setGuardando] = useState(false)
  const restantes = disponibles - usadas

  const guardar = async () => {
    if (!form.descripcion.trim()) return
    setGuardando(true)
    await onGuardar(form)
    setGuardando(false)
  }

  return (
    <div className="hx-overlay" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="hx-modal" style={{ maxWidth: 400 }}>
        <div className="hx-modal-title">REGISTRAR MEJORA USADA</div>
        <div style={{ fontFamily: 'var(--hx-mono)', fontSize: 9, color: 'var(--hx-muted)', letterSpacing: '0.1em', marginBottom: 16 }}>
          {usadas}/{disponibles} MEJORAS USADAS · <span style={{ color: restantes > 0 ? 'var(--hx-green)' : 'var(--hx-red-soft)' }}>{restantes} DISPONIBLES</span>
        </div>
        {restantes <= 0 && <div className="hx-error">Sin mejoras disponibles en este contrato.</div>}
        <div className="hx-field">
          <label>DESCRIPCIÓN DE LA MEJORA</label>
          <textarea className="hx-textarea" placeholder="Ej: Implementación módulo de reportes PDF..." value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} disabled={restantes <= 0} />
        </div>
        <div className="hx-field">
          <label>FECHA DE IMPLEMENTACIÓN</label>
          <input className="hx-input" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
        </div>
        <div className="hx-modal-actions">
          <button className="hx-btn hx-btn-ghost" onClick={onCerrar}>CANCELAR</button>
          <button className="hx-btn hx-btn-primary" onClick={guardar} disabled={guardando || restantes <= 0}>
            {guardando ? 'REGISTRANDO...' : 'REGISTRAR MEJORA'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   FINANZAS
═══════════════════════════════════════════════════════════════ */
function Finanzas({ hxData }) {
  const { clientes, pagos, registrarPago, eliminarPago, mesActual } = hxData
  const [modalPagoF, setModalPagoF] = useState(null)
  const mes = mesActual()
  const año = mes.slice(0, 4)

  const totalMes = pagos.filter(p => p.mes === mes).reduce((s, p) => s + (p.monto ?? 0), 0)
  const totalAño = pagos.filter(p => (p.mes ?? '').startsWith(año)).reduce((s, p) => s + (p.monto ?? 0), 0)

  const nombreCliente = (id) => clientes.find(c => c.id === id)?.nombre ?? id ?? '—'

  return (
    <div className="hx-stack">
      <div className="hx-grid-2">
        <StatCard title="INGRESOS DEL MES"  value={clp(totalMes)} sub={mes} color="var(--hx-green)" />
        <StatCard title="INGRESOS DEL AÑO"  value={clp(totalAño)} sub={año} color="var(--hx-text)" />
      </div>

      <div className="hx-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--hx-border)' }}>
          <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--hx-muted)', textTransform: 'uppercase' }}>
            HISTORIAL DE PAGOS
          </span>
          <button className="hx-btn hx-btn-primary" style={{ padding: '6px 12px', fontSize: 9 }} onClick={() => setModalPagoF({ clienteId: clientes[0]?.id ?? '', nombre: clientes[0]?.nombre ?? '', monto: clientes[0]?.plan?.tarifaBase ?? 0 })}>
            + NUEVO PAGO
          </button>
        </div>

        {pagos.length === 0
          ? <div className="hx-empty">SIN PAGOS REGISTRADOS</div>
          : (
            <table className="hx-table">
              <thead>
                <tr>
                  <th>MES</th>
                  <th>EMPRESA</th>
                  <th>CONCEPTO</th>
                  <th>MONTO</th>
                  <th>MÉTODO</th>
                  <th>N° OP.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagos.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--hx-text-dim)', fontFamily: 'var(--hx-mono)', fontSize: 10 }}>{p.mes ?? '—'}</td>
                    <td style={{ color: 'var(--hx-text)', fontFamily: 'var(--hx-mono)', fontSize: 10 }}>{nombreCliente(p.clienteId)}</td>
                    <td style={{ color: 'var(--hx-muted)', fontFamily: 'var(--hx-mono)', fontSize: 10, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.concepto ?? '—'}</td>
                    <td style={{ color: 'var(--hx-green)', fontFamily: 'var(--hx-mono)', fontSize: 11, fontWeight: 700 }}>{clp(p.monto)}</td>
                    <td style={{ color: 'var(--hx-muted)', fontFamily: 'var(--hx-mono)', fontSize: 10 }}>{p.metodo ?? '—'}</td>
                    <td style={{ color: 'var(--hx-muted)', fontFamily: 'var(--hx-mono)', fontSize: 10 }}>{p.referencia || '—'}</td>
                    <td>
                      <button className="hx-btn hx-btn-danger" onClick={() => eliminarPago(p.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>

      {modalPagoF && (
        <ModalPagoF
          clientes={clientes}
          inicial={modalPagoF}
          onGuardar={async d => { await registrarPago(d); setModalPagoF(null) }}
          onCerrar={() => setModalPagoF(null)}
        />
      )}
    </div>
  )
}

function ModalPagoF({ clientes, inicial, onGuardar, onCerrar }) {
  const mesHoy = new Date().toISOString().slice(0, 7)
  const [form, setForm]       = useState({
    clienteId: inicial.clienteId,
    mes: mesHoy,
    monto: inicial.monto,
    moneda: 'CLP',
    metodo: 'transferencia',
    referencia: '',
    tipo: 'mensualidad',
    concepto: `Mensualidad ${new Date().toLocaleString('es-CL', { month: 'long', year: 'numeric' })}`,
  })
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    setGuardando(true)
    await onGuardar({ ...form, monto: Number(form.monto), fecha: new Date().toISOString() })
    setGuardando(false)
  }

  return (
    <div className="hx-overlay" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="hx-modal">
        <div className="hx-modal-title">REGISTRAR PAGO</div>

        <div className="hx-field">
          <label>EMPRESA</label>
          <select className="hx-select" value={form.clienteId} onChange={e => {
            const c = clientes.find(x => x.id === e.target.value)
            set('clienteId', e.target.value)
            if (c) set('monto', c.plan?.tarifaBase ?? form.monto)
          }}>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div className="hx-field">
          <label>CONCEPTO</label>
          <input className="hx-input" value={form.concepto} onChange={e => set('concepto', e.target.value)} />
        </div>

        <div className="hx-field-row">
          <div className="hx-field">
            <label>MES</label>
            <input className="hx-input" type="month" value={form.mes} onChange={e => set('mes', e.target.value)} />
          </div>
          <div className="hx-field">
            <label>MONTO (CLP)</label>
            <input className="hx-input" type="number" value={form.monto} onChange={e => set('monto', e.target.value)} />
          </div>
        </div>

        <div className="hx-field-row">
          <div className="hx-field">
            <label>MÉTODO</label>
            <select className="hx-select" value={form.metodo} onChange={e => set('metodo', e.target.value)}>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div className="hx-field">
            <label>N° OPERACIÓN</label>
            <input className="hx-input" value={form.referencia} onChange={e => set('referencia', e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <div className="hx-modal-actions">
          <button className="hx-btn hx-btn-ghost" onClick={onCerrar}>CANCELAR</button>
          <button className="hx-btn hx-btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? 'GUARDANDO...' : 'CONFIRMAR PAGO'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   LOGÍSTICA
═══════════════════════════════════════════════════════════════ */
const CATEGORIAS_GASTO = [
  { id: 'firebase', label: 'FIREBASE',  cls: 'hx-badge-firebase' },
  { id: 'vercel',   label: 'VERCEL',    cls: 'hx-badge-vercel'   },
  { id: 'dominio',  label: 'DOMINIO',   cls: 'hx-badge-dominio'  },
  { id: 'otro',     label: 'OTRO',      cls: 'hx-badge-otro'     },
]

function CategoriaBadge({ cat }) {
  const def = CATEGORIAS_GASTO.find(c => c.id === cat) ?? CATEGORIAS_GASTO[3]
  return <span className={`hx-badge ${def.cls}`}>{def.label}</span>
}

function Logistica({ hxData }) {
  const { gastos, registrarGasto, eliminarGasto, mesActual } = hxData
  const [modalGasto, setModalGasto] = useState(false)
  const mes = mesActual()
  const año = mes.slice(0, 4)

  const totalMes = gastos.filter(g => (g.mes ?? g.fecha?.slice(0, 7)) === mes).reduce((s, g) => s + (g.monto ?? 0), 0)
  const totalAño = gastos.filter(g => (g.mes ?? g.fecha?.slice(0, 7) ?? '').startsWith(año)).reduce((s, g) => s + (g.monto ?? 0), 0)

  const hoy = new Date()
  const porVencer = gastos.filter(g => {
    if (!g.proximoVencimiento) return false
    const dias = Math.ceil((new Date(g.proximoVencimiento) - hoy) / 86400000)
    return dias >= 0 && dias <= 60
  })

  return (
    <div className="hx-stack">
      <div className="hx-grid-2">
        <StatCard title="GASTOS DEL MES"  value={clp(totalMes)} sub={mes} color="var(--hx-red-soft)" />
        <StatCard title="GASTOS DEL AÑO"  value={clp(totalAño)} sub={año} color="var(--hx-text)" />
      </div>

      {porVencer.length > 0 && (
        <div className="hx-panel">
          <div className="hx-panel-title">⚠ VENCIMIENTOS PRÓXIMOS (60 días)</div>
          {porVencer.map((g, i) => {
            const dias = Math.ceil((new Date(g.proximoVencimiento) - hoy) / 86400000)
            return (
              <div key={i} className="hx-alert-row amber">
                <CategoriaBadge cat={g.categoria} />
                <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 11, flex: 1 }}>{g.descripcion}</span>
                <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 10, color: dias <= 14 ? 'var(--hx-red-soft)' : 'var(--hx-amber)' }}>
                  {dias === 0 ? 'HOY' : `${dias}d`}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="hx-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--hx-border)' }}>
          <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--hx-muted)', textTransform: 'uppercase' }}>
            REGISTRO DE GASTOS
          </span>
          <button className="hx-btn hx-btn-primary" style={{ padding: '6px 12px', fontSize: 9 }} onClick={() => setModalGasto(true)}>
            + NUEVO GASTO
          </button>
        </div>

        {gastos.length === 0
          ? <div className="hx-empty">SIN GASTOS REGISTRADOS</div>
          : (
            <table className="hx-table">
              <thead>
                <tr>
                  <th>FECHA</th>
                  <th>CATEGORÍA</th>
                  <th>DESCRIPCIÓN</th>
                  <th>MONTO</th>
                  <th>RECURRENTE</th>
                  <th>PRÓX. VENC.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gastos.map(g => (
                  <tr key={g.id}>
                    <td style={{ fontFamily: 'var(--hx-mono)', fontSize: 10, color: 'var(--hx-muted)', whiteSpace: 'nowrap' }}>
                      {g.fecha ? new Date(g.fecha).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td><CategoriaBadge cat={g.categoria} /></td>
                    <td style={{ fontFamily: 'var(--hx-mono)', fontSize: 10, color: 'var(--hx-text-dim)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.descripcion ?? '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--hx-mono)', fontSize: 11, fontWeight: 700, color: 'var(--hx-red-soft)' }}>
                      {clp(g.monto)}
                    </td>
                    <td style={{ fontFamily: 'var(--hx-mono)', fontSize: 9, color: g.recurrente ? 'var(--hx-amber)' : 'var(--hx-muted)', letterSpacing: '0.1em' }}>
                      {g.recurrente ? `↻ ${g.periodoMeses ?? 1}M` : 'NO'}
                    </td>
                    <td style={{ fontFamily: 'var(--hx-mono)', fontSize: 10, color: 'var(--hx-muted)', whiteSpace: 'nowrap' }}>
                      {g.proximoVencimiento ? new Date(g.proximoVencimiento).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td>
                      <button className="hx-btn hx-btn-danger" onClick={() => eliminarGasto(g.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>

      {modalGasto && (
        <ModalGasto
          onGuardar={async d => { await registrarGasto(d); setModalGasto(false) }}
          onCerrar={() => setModalGasto(false)}
        />
      )}
    </div>
  )
}

function ModalGasto({ onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    categoria: 'firebase',
    descripcion: '',
    monto: '',
    fecha: new Date().toISOString().slice(0, 10),
    recurrente: false,
    periodoMeses: 1,
    proximoVencimiento: '',
  })
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.descripcion.trim() || !form.monto) return
    setGuardando(true)
    const mes = form.fecha.slice(0, 7)
    await onGuardar({ ...form, monto: Number(form.monto), mes })
    setGuardando(false)
  }

  return (
    <div className="hx-overlay" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="hx-modal">
        <div className="hx-modal-title">REGISTRAR GASTO</div>

        <div className="hx-field-row">
          <div className="hx-field">
            <label>CATEGORÍA</label>
            <select className="hx-select" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
              {CATEGORIAS_GASTO.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="hx-field">
            <label>FECHA</label>
            <input className="hx-input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
          </div>
        </div>

        <div className="hx-field">
          <label>DESCRIPCIÓN</label>
          <input className="hx-input" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Ej: Firebase Blaze plan — junio 2026" />
        </div>

        <div className="hx-field-row">
          <div className="hx-field">
            <label>MONTO (CLP)</label>
            <input className="hx-input" type="number" value={form.monto} onChange={e => set('monto', e.target.value)} />
          </div>
          <div className="hx-field">
            <label>PRÓX. VENCIMIENTO</label>
            <input className="hx-input" type="date" value={form.proximoVencimiento} onChange={e => set('proximoVencimiento', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}>
          <input type="checkbox" id="recurrente" checked={form.recurrente} onChange={e => set('recurrente', e.target.checked)} style={{ accentColor: 'var(--hx-red)', width: 14, height: 14, cursor: 'pointer' }} />
          <label htmlFor="recurrente" style={{ fontFamily: 'var(--hx-mono)', fontSize: 9, color: 'var(--hx-muted)', letterSpacing: '0.12em', cursor: 'pointer', userSelect: 'none' }}>
            GASTO RECURRENTE
          </label>
          {form.recurrente && (
            <select className="hx-select" style={{ width: 'auto', padding: '5px 8px', fontSize: 10 }} value={form.periodoMeses} onChange={e => set('periodoMeses', Number(e.target.value))}>
              <option value={1}>Mensual</option>
              <option value={3}>Trimestral</option>
              <option value={6}>Semestral</option>
              <option value={12}>Anual</option>
            </select>
          )}
        </div>

        <div className="hx-modal-actions">
          <button className="hx-btn hx-btn-ghost" onClick={onCerrar}>CANCELAR</button>
          <button className="hx-btn hx-btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? 'GUARDANDO...' : 'REGISTRAR GASTO'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SISTEMAS
═══════════════════════════════════════════════════════════════ */
function Sistemas({ hxData, user }) {
  const { config, actualizarConfig } = hxData
  const [editando, setEditando] = useState(null)
  const [form,     setForm]     = useState({})
  const [guardando, setGuardando] = useState(false)
  const [saved,    setSaved]    = useState(false)

  const startEdit = (seccion, datos) => {
    setEditando(seccion)
    setForm({ ...datos })
  }

  const cancelar = () => { setEditando(null); setForm({}) }

  const guardar = async (seccion) => {
    setGuardando(true)
    await actualizarConfig({ [seccion]: form })
    setGuardando(false)
    setEditando(null)
    setForm({})
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const banco     = config?.cuentaBancaria  ?? {}
  const empresa   = config?.empresa         ?? {}

  return (
    <div className="hx-stack">
      {saved && (
        <div style={{ fontFamily: 'var(--hx-mono)', fontSize: 10, color: 'var(--hx-green)', letterSpacing: '0.12em', padding: '9px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 3 }}>
          ✓ &nbsp;CONFIGURACIÓN GUARDADA
        </div>
      )}

      {/* ── CUENTA BANCARIA ─────────────────────────────────── */}
      <div className="hx-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--hx-border)' }}>
          <span className="hx-config-section-title" style={{ margin: 0, padding: 0, border: 'none' }}>CUENTA BANCARIA</span>
          {editando !== 'cuentaBancaria'
            ? <button className="hx-btn hx-btn-ghost" style={{ padding: '5px 10px', fontSize: 9 }} onClick={() => startEdit('cuentaBancaria', banco)}>EDITAR</button>
            : <div style={{ display: 'flex', gap: 8 }}>
                <button className="hx-btn hx-btn-ghost"   style={{ padding: '5px 10px', fontSize: 9 }} onClick={cancelar}>CANCELAR</button>
                <button className="hx-btn hx-btn-primary" style={{ padding: '5px 10px', fontSize: 9 }} onClick={() => guardar('cuentaBancaria')} disabled={guardando}>
                  {guardando ? '...' : 'GUARDAR'}
                </button>
              </div>
          }
        </div>

        {editando === 'cuentaBancaria' ? (
          <div className="hx-stack" style={{ gap: 10 }}>
            <div className="hx-field-row">
              <CampoConfig label="BANCO"          value={form.banco}         onChange={v => set('banco', v)} />
              <CampoConfig label="TIPO DE CUENTA" value={form.tipo}          onChange={v => set('tipo', v)}
                tipo="select" opciones={['Cuenta Corriente', 'Cuenta Vista', 'Cuenta RUT', 'Cuenta de Ahorro']} />
            </div>
            <div className="hx-field-row">
              <CampoConfig label="N° DE CUENTA"   value={form.numero}        onChange={v => set('numero', v)} />
              <CampoConfig label="RUT TITULAR"    value={form.rut}           onChange={v => set('rut', v)} placeholder="12.345.678-9" />
            </div>
            <CampoConfig label="NOMBRE TITULAR"   value={form.nombreTitular} onChange={v => set('nombreTitular', v)} />
          </div>
        ) : (
          <div className="hx-grid-2" style={{ gap: 10 }}>
            <InfoFila label="BANCO"          value={banco.banco}         />
            <InfoFila label="TIPO"           value={banco.tipo}          />
            <InfoFila label="N° DE CUENTA"   value={banco.numero}        />
            <InfoFila label="RUT TITULAR"    value={banco.rut}           />
            <InfoFila label="NOMBRE TITULAR" value={banco.nombreTitular} fullWidth />
          </div>
        )}
      </div>

      {/* ── EMPRESA ─────────────────────────────────────────── */}
      <div className="hx-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--hx-border)' }}>
          <span className="hx-config-section-title" style={{ margin: 0, padding: 0, border: 'none' }}>DATOS DE EMPRESA</span>
          {editando !== 'empresa'
            ? <button className="hx-btn hx-btn-ghost" style={{ padding: '5px 10px', fontSize: 9 }} onClick={() => startEdit('empresa', empresa)}>EDITAR</button>
            : <div style={{ display: 'flex', gap: 8 }}>
                <button className="hx-btn hx-btn-ghost"   style={{ padding: '5px 10px', fontSize: 9 }} onClick={cancelar}>CANCELAR</button>
                <button className="hx-btn hx-btn-primary" style={{ padding: '5px 10px', fontSize: 9 }} onClick={() => guardar('empresa')} disabled={guardando}>
                  {guardando ? '...' : 'GUARDAR'}
                </button>
              </div>
          }
        </div>

        {editando === 'empresa' ? (
          <div className="hx-stack" style={{ gap: 10 }}>
            <CampoConfig label="RAZÓN SOCIAL" value={form.razonSocial} onChange={v => set('razonSocial', v)} />
            <div className="hx-field-row">
              <CampoConfig label="RUT EMPRESA"  value={form.rut}         onChange={v => set('rut', v)} placeholder="76.543.210-K" />
              <CampoConfig label="EMAIL"        value={form.email}       onChange={v => set('email', v)} />
            </div>
          </div>
        ) : (
          <div className="hx-grid-2" style={{ gap: 10 }}>
            <InfoFila label="RAZÓN SOCIAL" value={empresa.razonSocial} fullWidth />
            <InfoFila label="RUT EMPRESA"  value={empresa.rut}         />
            <InfoFila label="EMAIL"        value={empresa.email}       />
          </div>
        )}
      </div>

      {/* ── CONSOLAS ────────────────────────────────────────── */}
      <div className="hx-panel">
        <div className="hx-panel-title">CONSOLAS DE ADMINISTRACIÓN</div>
        <div className="hx-stack" style={{ gap: 8 }}>
          <ConsolaLink
            label="FIREBASE CONSOLE"
            sub="Firestore · Auth · Storage · Rules"
            href="https://console.firebase.google.com/project/gl-app-dbdf2"
            badge="FIREBASE"
          />
          <ConsolaLink
            label="VERCEL DASHBOARD"
            sub="Deploy · Dominios · Variables de entorno"
            href="https://vercel.com/dashboard"
            badge="VERCEL"
          />
          <ConsolaLink
            label="DONWEB — DOMINIOS"
            sub="DNS · CNAME · Renovación anual"
            href="https://donweb.com"
            badge="DOMINIO"
          />
        </div>
      </div>

      {/* ── CUENTA OWNER ────────────────────────────────────── */}
      <div className="hx-panel">
        <div className="hx-panel-title">CUENTA DE ACCESO</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <InfoFila label="EMAIL OWNER" value={user?.email ?? '—'} />
          <InfoFila label="ROL"         value="OWNER — ACCESO TOTAL" />
          <div style={{ marginTop: 6, padding: '10px 0', borderTop: '1px solid var(--hx-border)' }}>
            <p style={{ fontFamily: 'var(--hx-mono)', fontSize: 9, color: 'var(--hx-muted)', letterSpacing: '0.1em', margin: '0 0 10px' }}>
              CAMBIO DE CONTRASEÑA — DISPONIBLE VÍA FIREBASE AUTHENTICATION
            </p>
            <a
              href="https://console.firebase.google.com/project/gl-app-dbdf2/authentication/users"
              target="_blank"
              rel="noreferrer"
              className="hx-btn hx-btn-ghost"
              style={{ display: 'inline-flex', textDecoration: 'none' }}
            >
              ABRIR FIREBASE AUTH →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function CampoConfig({ label, value, onChange, tipo, opciones, placeholder }) {
  return (
    <div className="hx-field" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      {tipo === 'select'
        ? (
          <select className="hx-select" value={value ?? ''} onChange={e => onChange(e.target.value)}>
            <option value="">— seleccionar —</option>
            {opciones.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input className="hx-input" value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? ''} />
        )
      }
    </div>
  )
}

function InfoFila({ label, value, fullWidth }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <div style={{ fontFamily: 'var(--hx-mono)', fontSize: 8, color: 'var(--hx-muted)', letterSpacing: '0.14em', marginBottom: 3, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'var(--hx-mono)', fontSize: 11, color: value ? 'var(--hx-text)' : 'var(--hx-muted)', letterSpacing: '0.04em' }}>
        {value || '— sin completar —'}
      </div>
    </div>
  )
}

function ConsolaLink({ label, sub, href, badge }) {
  const badgeCls = badge === 'FIREBASE' ? 'hx-badge-firebase' : badge === 'VERCEL' ? 'hx-badge-vercel' : 'hx-badge-dominio'
  return (
    <a href={href} target="_blank" rel="noreferrer" className="hx-link-card" style={{ textDecoration: 'none' }}>
      <span className={`hx-badge ${badgeCls}`}>{badge}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--hx-mono)', fontSize: 11, fontWeight: 700, color: 'var(--hx-text)', letterSpacing: '0.08em' }}>{label}</div>
        <div style={{ fontFamily: 'var(--hx-mono)', fontSize: 8.5, color: 'var(--hx-muted)', marginTop: 2, letterSpacing: '0.06em' }}>{sub}</div>
      </div>
      <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 10, color: 'var(--hx-muted)' }}>→</span>
    </a>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SHARED ATOMS
═══════════════════════════════════════════════════════════════ */
function StatCard({ title, value, sub, color }) {
  return (
    <div className="hx-panel">
      <div className="hx-panel-title">{title}</div>
      <div className="hx-value" style={{ color, textShadow: `0 0 14px ${color}44` }}>{value}</div>
      <div className="hx-label-sm">{sub}</div>
    </div>
  )
}

function CargandoPlaceholder() {
  return (
    <div className="hx-placeholder">
      <div className="hx-placeholder-inner">
        <div className="hx-placeholder-title">[ CARGANDO DATOS ]</div>
        <div className="hx-placeholder-sub">CONECTANDO A FIRESTORE...</div>
      </div>
    </div>
  )
}

function Placeholder({ label }) {
  return (
    <div className="hx-placeholder">
      <div className="hx-placeholder-inner">
        <div className="hx-placeholder-title">[ {label} ]</div>
        <div className="hx-placeholder-sub">MÓDULO EN INICIALIZACIÓN...</div>
      </div>
    </div>
  )
}
