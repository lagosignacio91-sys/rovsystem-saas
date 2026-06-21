import { useState, useEffect, useRef } from 'react'
import { LogOut, Target, Globe, TrendingUp, Package, Cpu, Monitor, ChevronRight, Sun, Moon, CalendarDays, FileText, Bell, X, Menu, Trash2, Download, Upload } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useHxData } from '../hooks/useHxData'
import { useClienteMetrics } from '../hooks/useClienteMetrics'
import { useHxEventos } from '../hooks/useHxEventos'
import { useHxDocs } from '../hooks/useHxDocs'
import '../styles/olimpo.css'

const SECCIONES = [
  { id: 'command',     label: 'COMMAND CENTER', Icon: Target      },
  { id: 'operaciones', label: 'OPERACIONES',    Icon: Globe       },
  { id: 'finanzas',    label: 'FINANZAS',       Icon: TrendingUp  },
  { id: 'logistica',   label: 'LOGÍSTICA',      Icon: Package     },
  { id: 'sistemas',    label: 'SISTEMAS',        Icon: Cpu         },
  { id: 'cartera',    label: 'CARTERA',         Icon: Monitor     },
  { id: 'agenda',     label: 'AGENDA',          Icon: CalendarDays},
  { id: 'documentos', label: 'DOCUMENTOS',      Icon: FileText    },
]

const clp = (n) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(n ?? 0)

export default function OlimpoPage() {
  const { user, role, signOut } = useAuth()
  const isVentas = role === 'ventas'
  const SECS_VENTAS = ['operaciones', 'cartera', 'agenda']
  const seccionesVisibles = isVentas
    ? SECCIONES.filter(s => SECS_VENTAS.includes(s.id))
    : SECCIONES

  const [seccion,     setSeccion]     = useState(() => isVentas ? 'cartera' : 'command')
  const [hora,        setHora]        = useState('')
  const [theme,       setTheme]       = useState(() => localStorage.getItem('hx-theme') || 'gold')
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [notifOpen,   setNotifOpen]   = useState(false)
  const notifRef                      = useRef(null)
  const hxData                        = useHxData()

  useEffect(() => {
    const tick = () => setHora(new Date().toLocaleTimeString('es-CL', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const THEMES = ['dark', 'light', 'gold']
  const toggleTheme = () => setTheme(t => {
    const n = THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]
    localStorage.setItem('hx-theme', n)
    return n
  })

  const themeIcon = theme === 'dark' ? <Sun size={14} /> : theme === 'light' ? <Moon size={14} /> : <span style={{ fontSize: 11, fontWeight: 700 }}>◆</span>

  // Alertas calculadas
  const alertas = !isVentas ? calcularAlertas(hxData) : []

  // Cerrar notif al click fuera
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const email         = user?.email ?? ''
  const userTag       = email.split('@')[0]?.toUpperCase() ?? '---'
  const seccionActual = seccionesVisibles.some(s => s.id === seccion) ? seccion : (seccionesVisibles[0]?.id ?? 'command')
  const secActual     = SECCIONES.find(s => s.id === seccionActual)

  const navegar = (id) => { setSeccion(id); setDrawerOpen(false) }

  return (
    <div className="hx-olimpo" data-theme={theme}>

      {/* ─── TOP BAR ───────────────────────────────── */}
      <div className="hx-topbar">
        <img src="/hyperionx-hx.png" className="hx-logo-img" alt="HyperionX" />
        <div className="hx-topbar-divider" />
        <span className="hx-topbar-prod">OLIMPO</span>
        <span className="hx-topbar-sub">PANEL MAESTRO</span>
        <div style={{ flex: 1 }} />
        <div className="hx-topbar-right">
          <span className="hx-clock">{hora}</span>
          <div className="hx-sys-badge">
            <span className="hx-dot hx-dot-green" /> ACTIVO
          </div>
          <span className="hx-topbar-user">{userTag}</span>

          {/* Campanita notificaciones (solo owner) */}
          {!isVentas && (
            <div className="hx-notif-wrap" ref={notifRef}>
              <button className="hx-notif-btn" onClick={() => setNotifOpen(o => !o)} title="Notificaciones">
                <Bell size={15} />
                {alertas.length > 0 && <span className="hx-notif-badge">{alertas.length}</span>}
              </button>
              {notifOpen && (
                <div className="hx-notif-dropdown">
                  <div className="hx-notif-header">ALERTAS ({alertas.length})</div>
                  {alertas.length === 0
                    ? <div className="hx-notif-empty">Sin alertas activas</div>
                    : alertas.map((a, i) => (
                        <div key={i} className="hx-notif-item">
                          <span className="hx-notif-dot" style={{ background: a.prioridad === 'alta' ? 'var(--hx-red)' : 'var(--hx-amber)' }} />
                          <span>{a.mensaje}</span>
                        </div>
                      ))
                  }
                </div>
              )}
            </div>
          )}

          <button className="hx-theme-toggle" onClick={toggleTheme} title={`Tema: ${theme}`}>
            {themeIcon}
          </button>
        </div>
      </div>

      {/* ─── BODY ──────────────────────────────────── */}
      <div className="hx-body">

        {/* SIDEBAR (desktop) */}
        <aside className="hx-sidebar">
          <nav className="hx-nav">
            {seccionesVisibles.map(({ id, label, Icon }) => (
              <button
                key={id}
                className={`hx-nav-item ${seccionActual === id ? 'active' : ''}`}
                onClick={() => navegar(id)}
              >
                <Icon size={13} strokeWidth={1.8} />
                <span>{label}</span>
                {seccionActual === id && <ChevronRight size={11} className="hx-nav-arrow" />}
              </button>
            ))}
          </nav>

          <div style={{ flex: 1 }} />
          <div className="hx-sidebar-divider" />

          <div className="hx-sidebar-footer">
            <div className="hx-sys-status">
              <span className="hx-dot hx-dot-green" /> SYS ONLINE
            </div>
            <div className="hx-user-info">{email}</div>
            <button className="hx-logout-btn" onClick={signOut}>
              <LogOut size={12} /> LOGOUT
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="hx-main">
          <header className="hx-header">
            <div className="hx-header-title">{secActual?.label}</div>
          </header>

          <main className="hx-content">
            {seccionActual === 'command'     && <CommandCenter hxData={hxData} />}
            {seccionActual === 'operaciones' && <Operaciones   hxData={hxData} isVentas={isVentas} />}
            {seccionActual === 'finanzas'    && <Finanzas      hxData={hxData} />}
            {seccionActual === 'logistica'   && <Logistica     hxData={hxData} />}
            {seccionActual === 'sistemas'    && <Sistemas       hxData={hxData} user={user} />}
            {seccionActual === 'cartera'    && <Cartera        hxData={hxData} />}
            {seccionActual === 'agenda'     && <Agenda         email={email} />}
            {seccionActual === 'documentos' && <Documentos     hxData={hxData} email={email} />}
          </main>
        </div>
      </div>

      {/* ─── FAB MÓVIL ─────────────────────────────── */}
      <button className="hx-fab-menu" onClick={() => setDrawerOpen(true)} aria-label="Menú">
        <Menu size={22} />
      </button>

      {/* ─── DRAWER MÓVIL ──────────────────────────── */}
      <div className={`hx-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="hx-drawer-overlay" onClick={() => setDrawerOpen(false)} />
        <div className="hx-drawer-panel">
          <div className="hx-drawer-head">
            <img src="/hyperionx-hx.png" className="hx-drawer-logo" alt="HX" />
            <span className="hx-drawer-title">OLIMPO</span>
            <button className="hx-drawer-close" onClick={() => setDrawerOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <nav className="hx-drawer-nav">
            {seccionesVisibles.map(({ id, label, Icon }) => (
              <button
                key={id}
                className={`hx-drawer-item ${seccionActual === id ? 'active' : ''}`}
                onClick={() => navegar(id)}
              >
                <Icon size={15} strokeWidth={1.8} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="hx-drawer-footer">
            <div className="hx-drawer-user">{email}</div>
            <button className="hx-drawer-logout" onClick={() => { setDrawerOpen(false); signOut() }}>
              <LogOut size={14} /> CERRAR SESIÓN
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function calcularAlertas({ clientes, pagos, prospectos, gastos, mesActual }) {
  const alertas = []
  const mes = mesActual ? mesActual() : new Date().toISOString().slice(0, 7)
  const hoy = new Date()

  // Clientes activos sin pago del mes
  clientes.filter(c => c.estado === 'activa').forEach(c => {
    if (!pagos.some(p => p.clienteId === c.id && p.mes === mes)) {
      alertas.push({ mensaje: `${c.nombre} — sin pago registrado en ${mes}`, prioridad: 'alta' })
    }
  })

  // Prospectos sin seguimiento > 7 días
  prospectos.filter(p => ['nuevo', 'negociando'].includes(p.etapa ?? 'nuevo')).forEach(p => {
    const ts = p.actualizadoEn ?? p.creadoEn
    if (ts) {
      const fecha = ts.toDate ? ts.toDate() : new Date(ts)
      const dias = Math.ceil((hoy - fecha) / 86400000)
      if (dias > 7) alertas.push({ mensaje: `Prospecto ${p.empresa} — ${dias}d sin seguimiento`, prioridad: 'media' })
    }
  })

  // Gastos con vencimiento próximo ≤ 30 días
  gastos.forEach(g => {
    if (!g.proximoVencimiento) return
    const dias = Math.ceil((new Date(g.proximoVencimiento) - hoy) / 86400000)
    if (dias >= 0 && dias <= 30) {
      alertas.push({ mensaje: `${g.descripcion} — vence en ${dias}d`, prioridad: dias <= 7 ? 'alta' : 'media' })
    }
  })

  return alertas
}

/* ═══════════════════════════════════════════════════════════════
   AGENDA — Calendario
═══════════════════════════════════════════════════════════════ */
const TIPO_COLORES = { pago: '#96720a', reunion: '#2563eb', otro: '#6b7280' }
const TIPO_LABELS  = { pago: 'PAGO', reunion: 'REUNIÓN', otro: 'OTRO' }

function Agenda({ email }) {
  const { eventos, agregarEvento, eliminarEvento } = useHxEventos()
  const hoy = new Date()
  const [año,   setAño]   = useState(hoy.getFullYear())
  const [mes,   setMes]   = useState(hoy.getMonth())
  const [diaS,  setDiaS]  = useState(null)
  const [form,  setForm]  = useState({ titulo: '', fecha: '', hora: '', tipo: 'reunion', descripcion: '' })
  const [guard, setGuard] = useState(false)

  const primerDia  = new Date(año, mes, 1).getDay()
  const diasMes    = new Date(año, mes + 1, 0).getDate()
  const blancos    = (primerDia + 6) % 7  // lunes = 0
  const mesNombre  = new Date(año, mes, 1).toLocaleString('es-CL', { month: 'long', year: 'numeric' })
  const mesStr     = `${año}-${String(mes + 1).padStart(2, '0')}`
  const eventosMes = eventos.filter(e => e.fecha?.startsWith(mesStr))
  const hoyStr     = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  const diasConEventos = new Set(eventosMes.map(e => e.fecha))

  const diaStr = (d) => `${año}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const eventosDia = diaS ? eventos.filter(e => e.fecha === diaStr(diaS)) : []

  const prevMes = () => { if (mes === 0) { setMes(11); setAño(a => a - 1) } else setMes(m => m - 1); setDiaS(null) }
  const nextMes = () => { if (mes === 11) { setMes(0); setAño(a => a + 1) } else setMes(m => m + 1); setDiaS(null) }

  const selDia = (d) => {
    setDiaS(d)
    setForm(f => ({ ...f, fecha: diaStr(d) }))
  }

  const handleAgregar = async (e) => {
    e.preventDefault()
    if (!form.titulo.trim() || !form.fecha) return
    setGuard(true)
    await agregarEvento({ ...form, creadoPor: email })
    setForm(f => ({ ...f, titulo: '', hora: '', descripcion: '' }))
    setGuard(false)
  }

  return (
    <div className="hx-stack">
      <div className="hx-agenda-layout">
        {/* Calendario */}
        <div className="hx-panel">
          <div className="hx-cal-nav">
            <button className="hx-cal-nav-btn" onClick={prevMes}>‹</button>
            <span className="hx-cal-title">{mesNombre}</span>
            <button className="hx-cal-nav-btn" onClick={nextMes}>›</button>
          </div>

          <div className="hx-cal-grid">
            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
              <div key={d} className="hx-cal-dow">{d}</div>
            ))}
            {Array.from({ length: blancos }, (_, i) => (
              <div key={`b${i}`} className="hx-cal-day empty" />
            ))}
            {Array.from({ length: diasMes }, (_, i) => {
              const d = i + 1
              const ds = diaStr(d)
              const isHoy = ds === hoyStr
              const isSel = diaS === d
              const evs   = eventosMes.filter(e => e.fecha === ds)
              return (
                <div
                  key={d}
                  className={`hx-cal-day${isHoy ? ' today' : ''}${isSel ? ' selected' : ''}`}
                  onClick={() => selDia(d)}
                >
                  <span className="hx-cal-num">{d}</span>
                  {evs.length > 0 && (
                    <div className="hx-cal-dots">
                      {evs.slice(0, 3).map((ev, j) => (
                        <span key={j} className="hx-cal-dot" style={{ background: TIPO_COLORES[ev.tipo] ?? '#6b7280' }} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="hx-agenda-side">
          {diaS ? (
            <>
              {/* Eventos del día seleccionado */}
              <div className="hx-panel">
                <div className="hx-agenda-day-title">
                  {new Date(año, mes, diaS).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                </div>
                {eventosDia.length === 0
                  ? <div className="hx-empty" style={{ fontSize: 11 }}>SIN EVENTOS</div>
                  : eventosDia.map(ev => (
                      <div key={ev.id} className="hx-evento-item" style={{ borderLeftColor: TIPO_COLORES[ev.tipo] ?? '#6b7280' }}>
                        <div style={{ flex: 1 }}>
                          <div className="hx-evento-tipo">{TIPO_LABELS[ev.tipo] ?? ev.tipo}</div>
                          <div className="hx-evento-titulo">{ev.titulo}</div>
                          {ev.hora && <div className="hx-evento-hora">🕐 {ev.hora}</div>}
                          {ev.descripcion && <div className="hx-evento-hora" style={{ marginTop: 4 }}>{ev.descripcion}</div>}
                        </div>
                        <button className="hx-evento-del" onClick={() => eliminarEvento(ev.id)} title="Eliminar">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                }
              </div>

              {/* Formulario agregar */}
              <div className="hx-panel">
                <div className="hx-agenda-day-title" style={{ marginBottom: 12 }}>AGREGAR EVENTO</div>
                <form onSubmit={handleAgregar} className="hx-agenda-form" style={{ padding: 0, background: 'none', border: 'none' }}>
                  <div>
                    <label className="hx-form-label">TÍTULO *</label>
                    <input className="hx-form-input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Pago GL Robótica" required />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label className="hx-form-label">TIPO</label>
                      <select className="hx-form-select" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                        <option value="reunion">Reunión</option>
                        <option value="pago">Pago</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="hx-form-label">HORA</label>
                      <input className="hx-form-input" type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="hx-form-label">DESCRIPCIÓN</label>
                    <textarea className="hx-form-textarea" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Opcional..." />
                  </div>
                  <button type="submit" className="hx-btn hx-btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={guard}>
                    {guard ? 'GUARDANDO...' : '+ AGREGAR'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="hx-panel">
              <div className="hx-empty" style={{ fontSize: 12 }}>SELECCIONA UN DÍA EN EL CALENDARIO</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   DOCUMENTOS
═══════════════════════════════════════════════════════════════ */
function Documentos({ hxData, email }) {
  const { clientes } = hxData
  const { docs, subirDoc, eliminarDoc } = useHxDocs()
  const [clienteF, setClienteF] = useState('todos')
  const [subiendo, setSubiendo] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [form,     setForm]     = useState({ nombre: '', tipo: 'contrato', clienteId: '' })
  const inputRef = useRef(null)

  const docsFiltrados = clienteF === 'todos' ? docs : docs.filter(d => d.clienteId === clienteF)

  const fmtBytes = (b) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`

  const handleSubir = async (e) => {
    e.preventDefault()
    const archivo = inputRef.current?.files[0]
    if (!archivo || !form.nombre.trim()) return
    setSubiendo(true)
    setProgreso(0)
    try {
      await subirDoc(
        { archivo, nombre: form.nombre.trim(), clienteId: form.clienteId || 'general', tipo: form.tipo, subidoPor: email },
        pct => setProgreso(pct)
      )
      setForm({ nombre: '', tipo: 'contrato', clienteId: '' })
      if (inputRef.current) inputRef.current.value = ''
    } finally { setSubiendo(false); setProgreso(0) }
  }

  return (
    <div className="hx-stack">
      {/* Subir archivo */}
      <div className="hx-panel">
        <div className="hx-panel-title">SUBIR DOCUMENTO</div>
        <form onSubmit={handleSubir}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="hx-form-label">NOMBRE DEL ARCHIVO *</label>
                <input className="hx-form-input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Contrato GL Robótica 2026" required />
              </div>
              <div>
                <label className="hx-form-label">TIPO</label>
                <select className="hx-form-select" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="contrato">Contrato</option>
                  <option value="factura">Factura</option>
                  <option value="propuesta">Propuesta</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="hx-form-label">CLIENTE</label>
                <select className="hx-form-select" value={form.clienteId} onChange={e => setForm(f => ({ ...f, clienteId: e.target.value }))}>
                  <option value="">General (sin cliente)</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="hx-form-label">ARCHIVO *</label>
                <input ref={inputRef} type="file" className="hx-form-input" style={{ padding: '6px 10px', cursor: 'pointer' }} required />
              </div>
            </div>
            {subiendo && (
              <div className="hx-progress-upload">
                <div className="hx-progress-upload-bar" style={{ width: `${progreso}%` }} />
              </div>
            )}
            <button type="submit" className="hx-btn hx-btn-primary" disabled={subiendo} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <Upload size={13} /> {subiendo ? `SUBIENDO ${progreso}%...` : 'SUBIR ARCHIVO'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de documentos */}
      <div className="hx-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--hx-border)' }}>
          <span className="hx-panel-title" style={{ margin: 0 }}>DOCUMENTOS ({docsFiltrados.length})</span>
          <select className="hx-form-select" style={{ width: 'auto', padding: '5px 10px', fontSize: 11 }} value={clienteF} onChange={e => setClienteF(e.target.value)}>
            <option value="todos">Todos los clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        {docsFiltrados.length === 0
          ? <div className="hx-empty">SIN DOCUMENTOS</div>
          : docsFiltrados.map(d => {
              const clienteNombre = clientes.find(c => c.id === d.clienteId)?.nombre ?? d.clienteId ?? '—'
              const fecha = d.creadoEn?.toDate ? d.creadoEn.toDate().toLocaleDateString('es-CL') : '—'
              return (
                <div key={d.id} className="hx-doc-item">
                  <FileText size={16} style={{ color: 'var(--hx-accent)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="hx-doc-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombre}</div>
                    <div className="hx-doc-meta">{d.tipo?.toUpperCase()} · {clienteNombre} · {fmtBytes(d.tamaño ?? 0)} · {fecha}</div>
                  </div>
                  <div className="hx-doc-actions">
                    <a href={d.url} target="_blank" rel="noreferrer" className="hx-doc-btn">
                      <Download size={12} /> VER
                    </a>
                    <button className="hx-doc-btn danger" onClick={() => eliminarDoc(d.id, d.storageRef)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })
        }
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

  const hoy  = new Date()
  const prevD = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  const mesPrev = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`

  const ingresosMes  = pagos.filter(p => p.mes === mes).reduce((s, p) => s + (p.monto ?? 0), 0)
  const gastosMes    = gastos.filter(g => (g.mes ?? g.fecha?.slice(0, 7)) === mes).reduce((s, g) => s + (g.monto ?? 0), 0)
  const ingresosPrev = pagos.filter(p => p.mes === mesPrev).reduce((s, p) => s + (p.monto ?? 0), 0)
  const gastosPrev   = gastos.filter(g => (g.mes ?? g.fecha?.slice(0, 7)) === mesPrev).reduce((s, g) => s + (g.monto ?? 0), 0)
  const margen     = ingresosMes - gastosMes
  const margenPrev = ingresosPrev - gastosPrev
  const pct        = ingresosMes > 0 ? Math.round((margen / ingresosMes) * 100) : 0
  const color      = margen >= 0 ? 'var(--hx-green)' : 'var(--hx-red-soft)'

  const activos = clientes.filter(c => c.estado === 'activa').length
  const enAviso = clientes.filter(c => c.estado === 'aviso').length
  const mrr     = clientes.filter(c => c.estado === 'activa').reduce((s, c) => s + (c.plan?.tarifaBase ?? 0), 0)
  const arr     = mrr * 12

  const clientesSinPago = clientes
    .filter(c => c.estado === 'activa')
    .filter(c => !pagos.some(p => p.clienteId === c.id && p.mes === mes))

  const proximoCobro = calcProximoCobro(clientes, pagos, mes)
  const alertas      = calcAlertas(gastos)
  const mesNombre    = new Date(mes + '-15').toLocaleString('es-CL', { month: 'long', year: 'numeric' })

  if (cargando) return <CargandoPlaceholder />

  return (
    <div className="hx-stack">

      {/* MRR / ARR / Clientes */}
      <div className="hx-grid-3">
        <StatCard title="MRR" value={clp(mrr)} sub="INGRESO MENSUAL RECURRENTE" color="var(--hx-green)" />
        <StatCard title="ARR" value={clp(arr)} sub="PROYECCIÓN ANUAL" color="var(--hx-text)" />
        <div className="hx-panel">
          <div className="hx-panel-title">CLIENTES</div>
          <div style={{ display: 'flex', gap: 28, marginTop: 4 }}>
            <div>
              <div className="hx-value" style={{ color: 'var(--hx-green)' }}>{activos}</div>
              <div className="hx-label-sm">ACTIVOS</div>
            </div>
            <div>
              <div className="hx-value" style={{ color: enAviso > 0 ? 'var(--hx-amber)' : 'var(--hx-muted)' }}>{enAviso}</div>
              <div className="hx-label-sm">EN AVISO</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ingresos / Gastos del mes */}
      <div className="hx-grid-2">
        <StatCard title="INGRESOS DEL MES" value={clp(ingresosMes)} sub={mesNombre.toUpperCase()} color="var(--hx-green)" />
        <StatCard title="GASTOS DEL MES"   value={clp(gastosMes)}   sub={mesNombre.toUpperCase()} color="var(--hx-red-soft)" />
      </div>

      {/* Margen + barra */}
      <div className="hx-panel">
        <div className="hx-panel-title">MARGEN NETO DEL MES</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span className="hx-value" style={{ color }}>{clp(margen)}</span>
          <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 13, color: 'var(--hx-muted)', letterSpacing: '0.06em' }}>{pct}%</span>
        </div>
        <div className="hx-progress-track">
          <div className="hx-progress-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
        </div>
      </div>

      {/* Resumen vs mes anterior */}
      <div className="hx-panel">
        <div className="hx-panel-title">RESUMEN VS MES ANTERIOR</div>
        <div className="hx-grid-3">
          <ResumenItem label="INGRESOS" actual={ingresosMes} anterior={ingresosPrev} />
          <ResumenItem label="GASTOS"   actual={gastosMes}   anterior={gastosPrev}   invertido />
          <ResumenItem label="MARGEN"   actual={margen}       anterior={margenPrev} />
        </div>
      </div>

      {/* Próximo cobro */}
      <ProximoCobro cobro={proximoCobro} />

      {/* Alertas */}
      <div className="hx-panel">
        <div className="hx-panel-title">ALERTAS DEL SISTEMA</div>
        {clientesSinPago.map(c => (
          <div key={c.id} className="hx-alert-row red">
            ⚠ {c.nombre?.toUpperCase()} — SIN PAGO REGISTRADO EN {mesNombre.toUpperCase()}
          </div>
        ))}
        {alertas.map((a, i) => <div key={i} className="hx-alert-row amber">⚠ {a}</div>)}
        {alertas.length === 0 && clientesSinPago.length === 0 && (
          <div className="hx-empty" style={{ color: 'var(--hx-green)' }}>✓ &nbsp;SIN ALERTAS ACTIVAS</div>
        )}
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

function ResumenItem({ label, actual, anterior, invertido }) {
  const delta = actual - anterior
  const isPositive = invertido ? delta <= 0 : delta >= 0
  const cls = anterior === 0 ? 'neutral' : isPositive ? 'pos' : 'neg'
  const sign = delta > 0 ? '+' : ''
  return (
    <div className="hx-resumen-item">
      <div className="hx-label-sm">{label}</div>
      <div className="hx-value-sm" style={{ color: 'var(--hx-text)', marginTop: 4 }}>{clp(actual)}</div>
      {anterior !== 0 && (
        <div className={`hx-delta ${cls}`}>{sign}{clp(delta)} vs anterior</div>
      )}
    </div>
  )
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
function Operaciones({ hxData, isVentas }) {
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
              isVentas={isVentas}
              onToggle={() => setExpandido(expandido === c.id ? null : c.id)}
              onPago={()   => setModalPago({   clienteId: c.id, nombre: c.nombre, monto: c.plan?.tarifaBase ?? 0 })}
              onEstado={()  => setModalEstado({ clienteId: c.id, estadoActual: c.estado })}
              onMejora={()  => setModalMejora({ clienteId: c.id, disponibles: c.licencia?.mejorasDisponibles ?? 2, usadas: c.licencia?.mejorasUsadas ?? 0 })}
            />
          ))
      }

      {!isVentas && modalPago && (
        <ModalPago
          {...modalPago}
          onGuardar={async d => { await registrarPago(d); setModalPago(null) }}
          onCerrar={() => setModalPago(null)}
        />
      )}
      {!isVentas && modalEstado && (
        <ModalEstado
          {...modalEstado}
          onGuardar={async e => { await actualizarCliente(modalEstado.clienteId, { estado: e }); setModalEstado(null) }}
          onCerrar={() => setModalEstado(null)}
        />
      )}
      {!isVentas && modalMejora && (
        <ModalMejora
          {...modalMejora}
          onGuardar={async d => { await registrarMejora(modalMejora.clienteId, d); setModalMejora(null) }}
          onCerrar={() => setModalMejora(null)}
        />
      )}
    </div>
  )
}

function ClienteRow({ cliente, productos, pagos, expandido, isVentas, onToggle, onPago, onEstado, onMejora }) {
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
          {!isVentas && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="hx-btn hx-btn-primary" onClick={onPago}>+ REGISTRAR PAGO</button>
              <button className="hx-btn hx-btn-ghost"  onClick={onEstado}>CAMBIAR ESTADO</button>
              <button className="hx-btn hx-btn-ghost"  onClick={onMejora}>+ MEJORA USADA</button>
            </div>
          )}
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
  const { clientes, pagos, gastos, registrarPago, eliminarPago, mesActual } = hxData
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
        <div className="hx-panel-title">INGRESOS VS GASTOS — ÚLTIMOS 12 MESES</div>
        <BarChart12Meses pagos={pagos} gastos={gastos} />
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
      <div className="hx-value" style={{ color }}>{value}</div>
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

/* ═══════════════════════════════════════════════════════════════
   BAR CHART — ingresos vs gastos 12 meses
═══════════════════════════════════════════════════════════════ */
function BarChart12Meses({ pagos, gastos }) {
  const hoy = new Date()
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (11 - i), 1)
    return {
      mes:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('es-CL', { month: 'short' }),
    }
  })
  const datos = meses.map(({ mes, label }) => ({
    mes, label,
    ingresos: pagos.filter(p => p.mes === mes).reduce((s, p) => s + (p.monto ?? 0), 0),
    gastos:   gastos.filter(g => (g.mes ?? g.fecha?.slice(0, 7)) === mes).reduce((s, g) => s + (g.monto ?? 0), 0),
  }))
  const maxVal = Math.max(...datos.flatMap(d => [d.ingresos, d.gastos]), 1)

  return (
    <div className="hx-bar-chart">
      <div className="hx-bar-grid">
        {datos.map(d => (
          <div key={d.mes} className="hx-bar-col">
            <div className="hx-bar-pair">
              <div
                className={`hx-bar ${d.ingresos > 0 ? 'hx-bar-income' : 'hx-bar-empty'}`}
                style={{ height: `${Math.max(2, Math.round((d.ingresos / maxVal) * 80))}px` }}
                title={`Ingresos ${d.mes}: ${clp(d.ingresos)}`}
              />
              <div
                className={`hx-bar ${d.gastos > 0 ? 'hx-bar-expense' : 'hx-bar-empty'}`}
                style={{ height: `${Math.max(2, Math.round((d.gastos / maxVal) * 80))}px` }}
                title={`Gastos ${d.mes}: ${clp(d.gastos)}`}
              />
            </div>
            <div className="hx-bar-label">{d.label}</div>
          </div>
        ))}
      </div>
      <div className="hx-bar-legend">
        <span><span className="hx-legend-dot" style={{ background: 'var(--hx-green)' }} />Ingresos</span>
        <span><span className="hx-legend-dot" style={{ background: 'var(--hx-accent)' }} />Gastos</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CARTERA — pipeline de prospectos y conversión a clientes
═══════════════════════════════════════════════════════════════ */
function Cartera({ hxData }) {
  const { prospectos, crearProspecto, eliminarProspecto, actualizarEtapaProspecto, convertirACliente } = hxData

  const [filtro, setFiltro]           = useState('todos')
  const [modalNuevo, setModalNuevo]   = useState(false)
  const [formNuevo, setFormNuevo]     = useState({ empresa: '', nombre: '', email: '', tel: '', notas: '' })
  const [guardandoNuevo, setGuardandoNuevo] = useState(false)
  const [modalConvertir, setModalConvertir] = useState(null)
  const [formConvertir, setFormConvertir]   = useState({})
  const [guardandoConvertir, setGuardandoConvertir] = useState(false)
  const [copiado, setCopiado]         = useState(null)
  const [confirmDel, setConfirmDel]   = useState(null)

  const DEMO_URL = 'https://demo.hyperionx.tech'

  const ETAPAS = [
    { id: 'nuevo',        label: 'NUEVO',        color: 'var(--hx-muted)' },
    { id: 'demo_enviada', label: 'DEMO ENVIADA', color: '#3b82f6' },
    { id: 'negociando',   label: 'NEGOCIANDO',   color: 'var(--hx-amber)' },
    { id: 'cerrado',      label: 'CERRADO',      color: 'var(--hx-green)' },
    { id: 'descartado',   label: 'DESCARTADO',   color: 'var(--hx-red)' },
  ]

  const etapaLabel = (id) => ETAPAS.find(e => e.id === id)?.label ?? 'NUEVO'
  const etapaColor = (id) => ETAPAS.find(e => e.id === id)?.color ?? 'var(--hx-muted)'

  const FLUJO = ['nuevo', 'demo_enviada', 'negociando']
  const nextEtapa = (current) => {
    const idx = FLUJO.indexOf(current ?? 'nuevo')
    return idx >= 0 && idx < FLUJO.length - 1 ? FLUJO[idx + 1] : null
  }

  const toSlug = (t) =>
    t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
     .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const makeLink = (p) =>
    `${DEMO_URL}/?cliente=${encodeURIComponent(p.empresa)}&ref=${p.slug ?? toSlug(p.empresa)}`

  const counts = ETAPAS.reduce((acc, e) => {
    acc[e.id] = prospectos.filter(p => (p.etapa ?? 'nuevo') === e.id).length
    return acc
  }, {})

  const prospectosVisibles = filtro === 'todos'
    ? prospectos
    : prospectos.filter(p => (p.etapa ?? 'nuevo') === filtro)

  const fechaFmt = (ts) => {
    if (!ts) return 'Nunca'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  async function handleCrearProspecto(e) {
    e.preventDefault()
    if (!formNuevo.empresa.trim()) return
    setGuardandoNuevo(true)
    try {
      await crearProspecto({
        empresa: formNuevo.empresa.trim(), nombre: formNuevo.nombre.trim(),
        email: formNuevo.email.trim(), tel: formNuevo.tel.trim(),
        notas: formNuevo.notas.trim(), slug: toSlug(formNuevo.empresa.trim()),
        etapa: 'nuevo', visitas: 0, ultimaVisita: null, conversionEn: null, clienteId: null,
      })
      setModalNuevo(false)
      setFormNuevo({ empresa: '', nombre: '', email: '', tel: '', notas: '' })
    } finally { setGuardandoNuevo(false) }
  }

  function abrirModalConvertir(p) {
    setFormConvertir({
      productoId: 'rovsystem-acuicultura',
      precioMensual: '', diaVencimiento: '19',
      fechaInicio: new Date().toISOString().slice(0, 10),
      movilesIncluidos: 4,
      contactoNombre: p.nombre || '', contactoEmail: p.email || '', contactoTel: p.tel || '',
    })
    setModalConvertir(p)
  }

  async function handleConvertir(e) {
    e.preventDefault()
    if (!modalConvertir) return
    setGuardandoConvertir(true)
    try {
      await convertirACliente(modalConvertir.id, {
        slug: toSlug(modalConvertir.empresa),
        empresa: modalConvertir.empresa,
        productoId: formConvertir.productoId,
        precioMensual: Number(formConvertir.precioMensual),
        diaVencimiento: Number(formConvertir.diaVencimiento) || 19,
        fechaInicio: formConvertir.fechaInicio,
        movilesIncluidos: Number(formConvertir.movilesIncluidos) || 4,
        contactoNombre: formConvertir.contactoNombre,
        contactoEmail: formConvertir.contactoEmail,
        contactoTel: formConvertir.contactoTel,
      })
      setModalConvertir(null)
    } finally { setGuardandoConvertir(false) }
  }

  function copiar(p) {
    navigator.clipboard.writeText(makeLink(p)).then(() => {
      setCopiado(p.id); setTimeout(() => setCopiado(null), 2000)
    })
  }

  return (
    <div className="hx-stack">
      <div className="hx-panel">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--hx-border)' }}>
          <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--hx-muted)' }}>
            CARTERA DE PROSPECTOS — {prospectos.length} TOTAL
          </span>
          <button className="hx-btn hx-btn-primary" style={{ padding: '6px 12px', fontSize: 9 }} onClick={() => setModalNuevo(true)}>
            + NUEVO PROSPECTO
          </button>
        </div>

        {/* Pipeline summary */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {ETAPAS.filter(e => e.id !== 'descartado').map(e => (
            <div key={e.id} style={{ background: 'var(--hx-panel)', border: `1px solid ${e.color}`, borderRadius: 4, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 8, color: e.color, fontWeight: 700 }}>{e.label}</span>
              <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 12, color: e.color, fontWeight: 700 }}>{counts[e.id] ?? 0}</span>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {[{ id: 'todos', label: 'TODOS' }, ...ETAPAS].map(f => (
            <button key={f.id} className={`hx-btn ${filtro === f.id ? 'hx-btn-primary' : 'hx-btn-ghost'}`}
              style={{ padding: '3px 9px', fontSize: 8 }} onClick={() => setFiltro(f.id)}>
              {f.label}{f.id !== 'todos' ? ` (${counts[f.id] ?? 0})` : ''}
            </button>
          ))}
        </div>

        {/* Lista */}
        {prospectosVisibles.length === 0 ? (
          <div className="hx-empty">
            {filtro === 'todos' ? 'SIN PROSPECTOS — AGREGA UNO PARA INICIAR EL PIPELINE'
              : `SIN PROSPECTOS EN ETAPA "${etapaLabel(filtro)}"`}
          </div>
        ) : (
          <div className="hx-prospects-list">
            {prospectosVisibles.map(p => {
              const etapa = p.etapa ?? 'nuevo'
              const next  = nextEtapa(etapa)
              const isCerrado    = etapa === 'cerrado'
              const isDescartado = etapa === 'descartado'
              return (
                <div key={p.id} className="hx-prospect-card" style={{ opacity: isDescartado ? 0.55 : 1 }}>
                  <div className="hx-prospect-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div className="hx-prospect-empresa">{p.empresa}</div>
                        <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 8, fontWeight: 700, color: etapaColor(etapa), border: `1px solid ${etapaColor(etapa)}`, borderRadius: 3, padding: '1px 5px' }}>
                          {etapaLabel(etapa)}
                        </span>
                        {isCerrado && p.clienteId && (
                          <span style={{ fontFamily: 'var(--hx-mono)', fontSize: 8, color: 'var(--hx-green)', opacity: 0.8 }}>
                            → {p.clienteId}
                          </span>
                        )}
                      </div>
                      {(p.nombre || p.email || p.tel) && (
                        <div className="hx-label-sm" style={{ marginTop: 3 }}>
                          {[p.nombre, p.email, p.tel].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span className="hx-visits-badge">{p.visitas ?? 0} VISITAS</span>
                      <span className="hx-label-sm">Última: {fechaFmt(p.ultimaVisita)}</span>
                      {isCerrado && p.conversionEn && (
                        <span className="hx-label-sm" style={{ color: 'var(--hx-green)' }}>Conv: {fechaFmt(p.conversionEn)}</span>
                      )}
                    </div>
                  </div>

                  {!isCerrado && !isDescartado && (
                    <div className="hx-prospect-link">{makeLink(p).replace('https://', '')}</div>
                  )}
                  {p.notas && (
                    <div className="hx-label-sm" style={{ marginTop: 5, fontStyle: 'italic', opacity: 0.7 }}>{p.notas}</div>
                  )}

                  <div className="hx-prospect-actions">
                    {!isCerrado && !isDescartado && (
                      <>
                        <button className="hx-btn hx-btn-primary" style={{ padding: '4px 10px', fontSize: 9 }} onClick={() => copiar(p)}>
                          {copiado === p.id ? '✓ COPIADO' : 'COPIAR LINK'}
                        </button>
                        <button className="hx-btn hx-btn-ghost" style={{ padding: '4px 10px', fontSize: 9 }} onClick={() => window.open(makeLink(p), '_blank')}>
                          ABRIR DEMO
                        </button>
                        {next && (
                          <button className="hx-btn hx-btn-ghost" style={{ padding: '4px 10px', fontSize: 9, color: 'var(--hx-amber)', borderColor: 'var(--hx-amber)' }}
                            onClick={() => actualizarEtapaProspecto(p.id, next)}>
                            → {etapaLabel(next)}
                          </button>
                        )}
                        <button className="hx-btn hx-btn-primary"
                          style={{ padding: '4px 10px', fontSize: 9, background: 'rgba(34,197,94,0.15)', borderColor: 'var(--hx-green)', color: 'var(--hx-green)' }}
                          onClick={() => abrirModalConvertir(p)}>
                          ⚡ CONVERTIR A CLIENTE
                        </button>
                        <button className="hx-btn hx-btn-ghost" style={{ padding: '4px 10px', fontSize: 9, opacity: 0.6 }}
                          onClick={() => actualizarEtapaProspecto(p.id, 'descartado')}>
                          DESCARTAR
                        </button>
                      </>
                    )}
                    {isDescartado && (
                      <button className="hx-btn hx-btn-ghost" style={{ padding: '4px 10px', fontSize: 9 }}
                        onClick={() => actualizarEtapaProspecto(p.id, 'nuevo')}>
                        ↩ REACTIVAR
                      </button>
                    )}
                    {confirmDel === p.id ? (
                      <>
                        <button className="hx-btn hx-btn-danger" onClick={() => { eliminarProspecto(p.id); setConfirmDel(null) }}>CONFIRMAR ✕</button>
                        <button className="hx-btn hx-btn-ghost" style={{ padding: '4px 10px', fontSize: 9 }} onClick={() => setConfirmDel(null)}>CANCELAR</button>
                      </>
                    ) : (
                      <button className="hx-btn hx-btn-ghost" style={{ padding: '4px 10px', fontSize: 9 }} onClick={() => setConfirmDel(p.id)}>ELIMINAR</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal nuevo prospecto */}
      {modalNuevo && (
        <div className="hx-overlay" onClick={() => setModalNuevo(false)}>
          <div className="hx-modal" onClick={e => e.stopPropagation()}>
            <div className="hx-modal-header">
              <div className="hx-modal-title">NUEVO PROSPECTO</div>
              <button className="hx-modal-close" onClick={() => setModalNuevo(false)}>✕</button>
            </div>
            <form onSubmit={handleCrearProspecto}>
              <div className="hx-form-grid">
                <div>
                  <label className="hx-label">EMPRESA *</label>
                  <input className="hx-input" value={formNuevo.empresa}
                    onChange={e => setFormNuevo(p => ({ ...p, empresa: e.target.value }))}
                    placeholder="Ej: Cermaq S.A." required autoFocus />
                </div>
                <div>
                  <label className="hx-label">CONTACTO</label>
                  <input className="hx-input" value={formNuevo.nombre}
                    onChange={e => setFormNuevo(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Nombre del contacto comercial" />
                </div>
                <div>
                  <label className="hx-label">EMAIL CONTACTO</label>
                  <input className="hx-input" type="email" value={formNuevo.email}
                    onChange={e => setFormNuevo(p => ({ ...p, email: e.target.value }))}
                    placeholder="contacto@empresa.cl" />
                </div>
                <div>
                  <label className="hx-label">TELÉFONO</label>
                  <input className="hx-input" value={formNuevo.tel}
                    onChange={e => setFormNuevo(p => ({ ...p, tel: e.target.value }))}
                    placeholder="+56 9 1234 5678" />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="hx-label">NOTAS INTERNAS</label>
                <textarea className="hx-input" value={formNuevo.notas}
                  onChange={e => setFormNuevo(p => ({ ...p, notas: e.target.value }))}
                  placeholder="Intereses, contexto..." rows={2} style={{ resize: 'vertical', minHeight: 54 }} />
              </div>
              {formNuevo.empresa && (
                <div className="hx-link-preview">
                  <div className="hx-label" style={{ marginBottom: 5 }}>LINK QUE SE GENERARÁ</div>
                  <div className="hx-link-preview-url">
                    {`${DEMO_URL}/?cliente=${encodeURIComponent(formNuevo.empresa)}&ref=${toSlug(formNuevo.empresa)}`}
                  </div>
                </div>
              )}
              <div className="hx-modal-actions">
                <button type="button" className="hx-btn hx-btn-ghost" onClick={() => setModalNuevo(false)}>CANCELAR</button>
                <button type="submit" className="hx-btn hx-btn-primary" disabled={guardandoNuevo}>
                  {guardandoNuevo ? 'CREANDO...' : 'CREAR PROSPECTO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal convertir a cliente */}
      {modalConvertir && (
        <div className="hx-overlay" onClick={() => setModalConvertir(null)}>
          <div className="hx-modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="hx-modal-header">
              <div className="hx-modal-title">CONVERTIR A CLIENTE — {modalConvertir.empresa}</div>
              <button className="hx-modal-close" onClick={() => setModalConvertir(null)}>✕</button>
            </div>
            <form onSubmit={handleConvertir}>
              <div style={{ marginBottom: 12, padding: '7px 10px', border: '1px solid var(--hx-green)', borderRadius: 4, color: 'var(--hx-green)', fontFamily: 'var(--hx-mono)', fontSize: 9, lineHeight: 1.5 }}>
                ⚡ SE CREARÁ UN CLIENTE ACTIVO EN OPERACIONES Y SE CERRARÁ ESTE PROSPECTO
              </div>
              <div className="hx-form-grid">
                <div>
                  <label className="hx-label">PRODUCTO</label>
                  <input className="hx-input" value="RovSystem Acuicultura" readOnly style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                </div>
                <div>
                  <label className="hx-label">PRECIO MENSUAL CLP *</label>
                  <input className="hx-input" type="number" value={formConvertir.precioMensual}
                    onChange={e => setFormConvertir(p => ({ ...p, precioMensual: e.target.value }))}
                    placeholder="1000000" required />
                </div>
                <div>
                  <label className="hx-label">DÍA DE COBRO (1-31)</label>
                  <input className="hx-input" type="number" min={1} max={31} value={formConvertir.diaVencimiento}
                    onChange={e => setFormConvertir(p => ({ ...p, diaVencimiento: e.target.value }))}
                    placeholder="19" />
                </div>
                <div>
                  <label className="hx-label">FECHA INICIO LICENCIA</label>
                  <input className="hx-input" type="date" value={formConvertir.fechaInicio}
                    onChange={e => setFormConvertir(p => ({ ...p, fechaInicio: e.target.value }))} />
                </div>
                <div>
                  <label className="hx-label">MÓVILES INCLUIDOS</label>
                  <input className="hx-input" type="number" min={0} value={formConvertir.movilesIncluidos}
                    onChange={e => setFormConvertir(p => ({ ...p, movilesIncluidos: e.target.value }))}
                    placeholder="4" />
                </div>
                <div>
                  <label className="hx-label">CONTACTO PRINCIPAL</label>
                  <input className="hx-input" value={formConvertir.contactoNombre}
                    onChange={e => setFormConvertir(p => ({ ...p, contactoNombre: e.target.value }))}
                    placeholder="Nombre admin cliente" />
                </div>
                <div>
                  <label className="hx-label">EMAIL CONTACTO</label>
                  <input className="hx-input" type="email" value={formConvertir.contactoEmail}
                    onChange={e => setFormConvertir(p => ({ ...p, contactoEmail: e.target.value }))}
                    placeholder="contacto@empresa.cl" />
                </div>
                <div>
                  <label className="hx-label">TELÉFONO CONTACTO</label>
                  <input className="hx-input" value={formConvertir.contactoTel}
                    onChange={e => setFormConvertir(p => ({ ...p, contactoTel: e.target.value }))}
                    placeholder="+56 9 ..." />
                </div>
              </div>
              <div className="hx-modal-actions">
                <button type="button" className="hx-btn hx-btn-ghost" onClick={() => setModalConvertir(null)}>CANCELAR</button>
                <button type="submit" className="hx-btn hx-btn-primary" disabled={guardandoConvertir}
                  style={{ background: 'rgba(34,197,94,0.15)', borderColor: 'var(--hx-green)', color: 'var(--hx-green)' }}>
                  {guardandoConvertir ? 'CREANDO CLIENTE...' : '⚡ CREAR CLIENTE Y CERRAR PROSPECTO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
