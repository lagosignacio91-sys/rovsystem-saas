import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Search, MapPin, ChevronRight, Building2, Phone, Mail, Users, RefreshCw, Database } from 'lucide-react'
import { t, ESTADO_META } from '../theme/tokens'
import { logoEmpresa } from '../lib/empresaLogos'
import { EstadoBadge } from '../components/kit'
import { useOperadoresGlobal } from '../hooks/useOperadoresGlobal'
import { useEmpresas } from '../hooks/useEmpresas'
import { CENTROS_GL } from '../hooks/useCentros'
import { db } from '../lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import PanelCentro from '../components/ui/PanelCentro'

const ESTADOS_FILTRO = [
  { key: null,               label: 'Todos',         dot: null },
  { key: 'OK',               label: 'Operativo',     dot: '#22c55e' },
  { key: 'EQUIPMENT_FAULT',  label: 'Falla equipo',  dot: '#ef4444' },
  { key: 'DISPATCH_ONWAY',   label: 'En camino',     dot: '#3b82f6' },
  { key: 'NO_OPERATOR',      label: 'Sin operador',  dot: '#6b7280' },
]

export default function CentrosPage() {
  const { centros, eliminarCentro, sincronizarEstado, actualizarCentro, inicializarCentrosGL, sincronizarOperadoresCentros, role, uid, empresaActiva, centrosConFaltantes } = useOutletContext()
  const { empresas }                    = useEmpresas()
  const [busca, setBusca]               = useState('')
  const [filtroEstado, setFiltroEstado] = useState(null)
  const [centroActivo, setCentroActivo] = useState(null)
  const [usuarios, setUsuarios]         = useState([])

  // modales admin
  const [showInit, setShowInit]         = useState(false)
  const [empresaSelId, setEmpresaSelId] = useState('')
  const [cargandoInit, setCargandoInit] = useState(false)
  const [cargandoSync, setCargandoSync] = useState(false)
  const [resultado, setResultado]       = useState(null)

  useEffect(() => {
    if (role !== 'admin' && role !== 'supervisor') return
    getDocs(collection(db, 'usuarios')).then(snap => {
      const lista = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
      setUsuarios(lista)
    })
  }, [role])

  const handleSincronizar = async () => {
    setCargandoSync(true)
    try {
      const { centrosActualizados, operadoresAsignados } = await sincronizarOperadoresCentros(usuarios)
      setResultado({ ok: true, msg: `✅ ${operadoresAsignados} operadores asignados a ${centrosActualizados} centros` })
    } catch {
      setResultado({ ok: false, msg: '❌ Error al sincronizar' })
    }
    setCargandoSync(false)
  }

  const handleInicializar = async () => {
    if (!empresaSelId) return
    setCargandoInit(true)
    try {
      await inicializarCentrosGL(empresaSelId)
      setResultado({ ok: true, msg: '✅ 10 centros GL cargados correctamente' })
    } catch {
      setResultado({ ok: false, msg: '❌ Error al cargar centros' })
    }
    setCargandoInit(false)
    setShowInit(false)
  }

  const base = empresaActiva ? centros.filter(c => c.empresaId === empresaActiva.id) : centros
  const { operadores } = useOperadoresGlobal(base)

  const opFaenaPorCentro = (centroId) =>
    operadores.find(o => o.centroId === centroId && o.estado === 'faena') ?? null

  const teamNombre = (team) => team ? 'Team ' + team.replace(/\D/g, '') : null

  const conteos = ESTADOS_FILTRO.slice(1).reduce((acc, f) => {
    acc[f.key] = base.filter(c => c.estado === f.key).length
    return acc
  }, {})

  let lista = filtroEstado ? base.filter(c => c.estado === filtroEstado) : base
  if (busca.trim()) {
    const q = busca.toLowerCase()
    lista = lista.filter(c => c.nombre?.toLowerCase().includes(q) || c.empresaNombre?.toLowerCase().includes(q))
  }
  // Orden por número de team (team01 → último); sin-team al final; nombre como desempate.
  const numTeam = (c) => {
    const n = c.teamAsignado ? parseInt(c.teamAsignado.replace(/\D/g, ''), 10) : NaN
    return Number.isNaN(n) ? Infinity : n
  }
  lista = [...lista].sort((a, b) => (numTeam(a) - numTeam(b)) || (a.nombre ?? '').localeCompare(b.nombre ?? ''))

  // Agrupar por empresa
  const porEmpresa = lista.reduce((acc, c) => {
    const emp = c.empresaNombre ?? 'Sin empresa'
    ;(acc[emp] = acc[emp] ?? []).push(c)
    return acc
  }, {})

  const centroVivo = centroActivo ? centros.find(c => c.id === centroActivo.id) ?? centroActivo : null
  const handleEliminar = async (id) => { await eliminarCentro(id); setCentroActivo(null) }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: t.space5 }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* Acciones admin */}
        {role === 'admin' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: t.space4 }}>
            <button
              onClick={handleSincronizar}
              disabled={cargandoSync || centros.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${t.brand}`, color: t.brandSoft, borderRadius: t.radiusMd, padding: '7px 14px', cursor: 'pointer', fontSize: t.textSm, fontWeight: 600, opacity: (cargandoSync || centros.length === 0) ? 0.5 : 1 }}>
              <RefreshCw size={14} /> {cargandoSync ? 'Sincronizando...' : 'Sincronizar operadores'}
            </button>
            <button
              onClick={() => setShowInit(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: t.brand, border: 'none', color: '#fff', borderRadius: t.radiusMd, padding: '7px 14px', cursor: 'pointer', fontSize: t.textSm, fontWeight: 600 }}>
              <Database size={14} /> Cargar centros GL
            </button>
          </div>
        )}

        {resultado && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.bgElevated, border: `1px solid ${resultado.ok ? t.ok : t.fault}`, borderRadius: t.radiusMd, padding: '9px 13px', marginBottom: t.space3, fontSize: t.textSm, color: t.textPrimary }}>
            <span>{resultado.msg}</span>
            <button onClick={() => setResultado(null)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>✕</button>
          </div>
        )}

        {/* Filtros por estado */}
        <div className="gl-stats-row">
          {ESTADOS_FILTRO.map(f => {
            const active  = filtroEstado === f.key
            const count   = f.key === null ? base.length : (conteos[f.key] ?? 0)
            if (f.key !== null && count === 0) return null
            return (
              <button key={String(f.key)} className={`gl-stat-chip${active ? ' active' : ''}`}
                onClick={() => setFiltroEstado(active ? null : f.key)}
                style={active ? { color: f.dot ?? t.brand, borderColor: f.dot ?? t.brand, background: f.dot ? `${f.dot}18` : t.brandTint } : {}}>
                {f.dot && <span className="gl-stat-dot" style={{ background: f.dot, boxShadow: `0 0 6px ${f.dot}` }} />}
                {f.label} <span className="gl-mono" style={{ opacity: 0.7 }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Buscador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '10px 13px', marginBottom: t.space4, minHeight: 44 }}>
          <Search size={16} color={t.textMuted} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar centro o empresa..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.textPrimary, fontSize: t.textSm }} />
          <span className="gl-mono" style={{ fontSize: t.textXs, color: t.textMuted }}>{lista.length}</span>
        </div>

        {lista.length === 0 && (
          <div style={{ textAlign: 'center', color: t.textMuted, padding: '48px 0', fontSize: t.textSm }}>
            <Building2 size={32} style={{ opacity: 0.5, marginBottom: 8 }} /><div>Sin centros para mostrar.</div>
          </div>
        )}

        {/* Grupos por empresa */}
        {Object.entries(porEmpresa).map(([empNombre, centrosGrupo]) => {
          const logo = logoEmpresa(empNombre)
          return (
            <div key={empNombre} style={{ marginBottom: 20 }}>
              {/* Encabezado empresa */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${t.border}` }}>
                {logo
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 22, background: '#fff', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                      <img src={logo.src} alt={logo.alt} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </span>
                  : <Building2 size={14} color={t.textMuted} />}
                <span style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary }}>{empNombre}</span>
                <span style={{ fontSize: t.textXs, color: t.textMuted }}>({centrosGrupo.length})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {centrosGrupo.map(c => {
                  const meta    = ESTADO_META[c.estado] ?? ESTADO_META.NO_OPERATOR
                  const opFaena = opFaenaPorCentro(c.id)
                  const tnombre = teamNombre(c.teamAsignado)
                  return (
                    <button key={c.id} className="gl-list-row" onClick={() => setCentroActivo(c)}
                      style={{ borderLeft: `3px solid ${meta.dot}`, flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
                      {/* Fila principal */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <MapPin size={16} color={t.textMuted} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary }}>{c.nombre}</div>
                        </div>
                        <EstadoBadge estado={c.estado} tieneFaltante={centrosConFaltantes?.has(c.id)} />
                        <ChevronRight size={16} color={t.textMuted} style={{ flexShrink: 0 }} />
                      </div>
                      {/* Fila secundaria: team + op en faena */}
                      {(tnombre || opFaena) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${t.border}` }}>
                          {tnombre && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: t.brandSoft, background: t.brandTint, borderRadius: t.radiusMd, padding: '2px 7px', fontWeight: 600 }}>
                              <Users size={11} /> {tnombre}
                            </span>
                          )}
                          {opFaena && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                              {opFaena.foto
                                ? <img src={opFaena.foto} alt={opFaena.nombre} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${t.ok}`, flexShrink: 0 }} />
                                : <div style={{ width: 20, height: 20, borderRadius: '50%', background: t.brandTint, color: t.brandSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{(opFaena.nombre[0] ?? '?').toUpperCase()}</div>}
                              <span style={{ fontSize: 10, color: t.ok, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opFaena.nombre}</span>
                              {opFaena.telefono && (
                                <a href={`tel:${opFaena.telefono.replace(/[^\d+]/g,'')}`} onClick={e => e.stopPropagation()}
                                  style={{ color: t.textMuted, display: 'flex' }}><Phone size={12} /></a>
                              )}
                              {(opFaena.correoCorp || opFaena.correoPersonal) && (
                                <a href={`mailto:${opFaena.correoCorp || opFaena.correoPersonal}`} onClick={e => e.stopPropagation()}
                                  style={{ color: t.textMuted, display: 'flex' }}><Mail size={12} /></a>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {showInit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
          <div style={{ background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: t.textPrimary, fontSize: t.textBase, fontWeight: 700, marginBottom: 12 }}>Cargar centros GL Robótica</h3>
            <p style={{ color: t.textMuted, fontSize: t.textSm, lineHeight: 1.6, marginBottom: 20 }}>
              Esta acción <strong style={{ color: t.fault }}>eliminará los {centros.length} centros actuales</strong> y creará los 10 centros reales con sus coordenadas y teams.
            </p>
            <label style={{ color: t.textMuted, fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>Empresa propietaria</label>
            <select value={empresaSelId} onChange={e => setEmpresaSelId(e.target.value)}
              style={{ width: '100%', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textPrimary, fontSize: t.textSm, padding: '8px 10px', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}>
              <option value="">— Selecciona una empresa —</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
            <p style={{ color: t.textMuted, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Centros que se crearán:</p>
            <ul style={{ listStyle: 'none', padding: '10px 12px', margin: '0 0 20px', background: t.bgInput, borderRadius: t.radiusMd }}>
              {CENTROS_GL.map(c => (
                <li key={c.nombre} style={{ color: t.textMuted, fontSize: 12, padding: '3px 0' }}>· {c.nombre} ({c.teamAsignado})</li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowInit(false)} disabled={cargandoInit}
                style={{ flex: 1, background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: t.radiusMd, padding: 9, cursor: 'pointer', fontSize: t.textSm }}>
                Cancelar
              </button>
              <button onClick={handleInicializar} disabled={!empresaSelId || cargandoInit}
                style={{ flex: 1, background: t.fault, border: 'none', color: '#fff', borderRadius: t.radiusMd, padding: 9, cursor: 'pointer', fontSize: t.textSm, fontWeight: 600, opacity: (!empresaSelId || cargandoInit) ? 0.5 : 1 }}>
                {cargandoInit ? 'Creando...' : 'Confirmar y cargar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {centroVivo && (
        <div className="panel-slide gl-panel-wrapper gl-panel-wrapper--page" style={{ position: 'absolute', top: 0, right: 0, height: '100%', zIndex: 1000 }}>
          <PanelCentro centro={centroVivo} role={role} uid={uid} sincronizarEstado={sincronizarEstado}
            actualizarCentro={actualizarCentro}
            onCerrar={() => setCentroActivo(null)} onEliminar={handleEliminar} />
        </div>
      )}
    </div>
  )
}
