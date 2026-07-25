import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Search, Mail, Phone, Gamepad2, Coffee, Users, AtSign, Upload, UserPlus, Pencil, Trash2, HardHat, ChevronDown, ChevronUp, MapPinned, RotateCcw, CalendarClock, Repeat } from 'lucide-react'
import { t } from '../theme/tokens'
import { useOperadoresGlobal } from '../hooks/useOperadoresGlobal'
import { useUsuarios } from '../hooks/useUsuarios'
import { moverACentro, devolverACentro, reasignarCentro } from '../lib/cobertura'
import { labelEspecialidad, labelTeamEspecial } from '../lib/kitScope'
import ImportarCSV from '../components/admin/ImportarCSV'
import FormOperador from '../components/admin/FormOperador'
import ModalEpp from '../components/epp/ModalEpp'
import ModalMoverCentro from '../components/cobertura/ModalMoverCentro'
import ModalReasignarCentro from '../components/cobertura/ModalReasignarCentro'
import ModalDiasExtras from '../components/cobertura/ModalDiasExtras'

function ContactoRow({ icon: Icon, valor, href }) {
  const base = { fontSize: 10, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }
  const txt  = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  if (!valor) {
    return <div style={{ ...base, color: t.textMuted }}><Icon size={13} style={{ flexShrink: 0 }} /><span style={txt}>—</span></div>
  }
  return (
    <a href={href} style={{ ...base, color: t.brandSoft, textDecoration: 'none' }}
      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
      <Icon size={13} style={{ flexShrink: 0 }} /><span style={txt}>{valor}</span>
    </a>
  )
}

export default function OperadoresPage() {
  const { centros, empresaActiva, role } = useOutletContext()
  const lista = empresaActiva ? centros.filter(c => c.empresaId === empresaActiva.id) : centros
  const { operadores, cargando } = useOperadoresGlobal(lista)
  const { usuarios, crearOperador, actualizarOperador, eliminarOperador, importarLista } = useUsuarios()
  const [busca, setBusca] = useState('')

  // gestión admin
  const [showImport, setShowImport] = useState(false)
  const [showForm, setShowForm]     = useState(false)
  const [editUser, setEditUser]     = useState(null)   // doc de usuarios en edición
  const [aBorrar, setABorrar]       = useState(null)   // doc de usuarios a borrar
  const [borrando, setBorrando]     = useState(false)  // la baja barre varios docs: puede tardar
  const [showCuentas, setShowCuentas] = useState(false)
  const [resultado, setResultado]   = useState(null)
  const [eppDe, setEppDe]           = useState(null) // { uid, nombre } — operador cuyo EPP se está viendo
  const [gestionarEpp, setGestionarEpp] = useState(false) // catálogo general de EPP (sin operador puntual)
  const [verDescanso, setVerDescanso] = useState(false) // desplegar los "en descanso", colapsados por defecto
  const [moverUser, setMoverUser]   = useState(null) // usuario (doc) que el admin va a mover a otro centro
  const [reasignarUser, setReasignarUser] = useState(null) // usuario (doc) a reasignar permanentemente
  const [diasDe, setDiasDe]         = useState(null) // usuario cuyos días extras se están viendo

  const handleDevolverAdmin = async (usuario) => {
    try { await devolverACentro(usuario, centros); setResultado({ ok: true, msg: `↩️ ${usuario.nombre} volvió a su centro` }) }
    catch { setResultado({ ok: false, msg: `❌ No se pudo devolver a ${usuario.nombre}` }) }
  }

  const handleReasignar = async (centro) => {
    try {
      await reasignarCentro(reasignarUser, centro, centros)
      setResultado({ ok: true, msg: `✅ ${reasignarUser.nombre} reasignado a ${centro.nombre}` })
    } catch {
      setResultado({ ok: false, msg: `❌ No se pudo reasignar a ${reasignarUser.nombre}` })
    }
  }

  // Cuántos operadores tiene cada centro hoy (para avisar en el picker si ya hay 2).
  const ocupacionPorCentro = {}
  operadores.forEach(o => { if (o.centroId) ocupacionPorCentro[o.centroId] = (ocupacionPorCentro[o.centroId] ?? 0) + 1 })

  // uid -> usuario, para leer epp.faltantes sin queries nuevas (useUsuarios ya carga todo).
  const usuariosPorUid = {}
  usuarios.forEach(u => { usuariosPorUid[u.id] = u })

  const handleCrear = async (form, password) => {
    const r = await crearOperador(form, password)
    if (r.error) { setResultado({ ok: false, msg: `❌ ${r.error}` }); return }
    // La Cloud Function crearUsuario escribe un set fijo (sin `especialidad`);
    // se persiste aparte con un update de admin usando el uid recién creado.
    if (r.uid && form.especialidad) {
      await actualizarOperador(r.uid, { especialidad: form.especialidad })
    }
    setResultado({ ok: true, msg: `✅ Operador "${form.nombre}" creado` })
    setShowForm(false)
  }

  const handleEditar = async (form) => {
    await actualizarOperador(editUser.id, form)
    setResultado({ ok: true, msg: `✅ Cuenta "${form.nombre}" actualizada` })
    setEditUser(null)
  }

  const handleBorrar = async () => {
    if (borrando) return
    setBorrando(true)
    const nombre = aBorrar.nombre
    // La baja limpia rosters + anonimiza historial y recién ahí borra la ficha:
    // si falla, no se borró nada y conviene decirlo en vez de dar un falso OK.
    const { resumen, error } = await eliminarOperador(aBorrar.id)
    setBorrando(false)
    if (error) {
      setResultado({ ok: false, msg: `⚠️ ${error}` })
      return
    }
    setABorrar(null)
    if (resumen?.problemas?.length) {
      setResultado({ ok: false, msg: `⚠️ "${nombre}" se eliminó, pero quedó sin limpiar: ${resumen.problemas.join(', ')}` })
      return
    }
    setResultado({ ok: true, msg: `🗑️ "${nombre}" eliminado y quitado de todos los centros` })
  }

  const ROL_LABEL = { admin: 'Admin', supervisor: 'Taller', operador: 'Operador' }
  // Los pilotos especiales (rol 'apertura') se muestran con su etiqueta Apertura/Soberanía.
  const rolLabelDe = (u) => u?.rol === 'apertura' ? labelEspecialidad(u.especialidad) : (ROL_LABEL[u?.rol] ?? u?.rol)

  // Cuentas operativas (operador/apertura) que todavía NO están en ningún roster:
  // recién creadas o sin "Sincronizar operadores". Se muestran igual como tarjeta
  // "en descanso" para poder gestionarlas (reasignar, EPP, etc.) sin depender de la
  // sync — y para que los pilotos de soberanía (team14, sin centro que apunte a su
  // roster) aparezcan siempre. Cuando entran a un roster, se muestran desde ahí.
  const uidsEnRoster = new Set(operadores.map(o => o.uid).filter(Boolean))
  const sinRoster = usuarios
    .filter(u => (u.rol === 'operador' || u.rol === 'apertura') && !uidsEnRoster.has(u.id))
    .filter(u => !empresaActiva || u.empresaId === empresaActiva.id || !u.empresaId)
    .map(u => ({
      uid: u.id, nombre: u.nombre ?? '', telefono: u.telefono ?? '',
      correoCorp: u.correoCorporativo ?? '', correoPersonal: u.correoPersonal ?? '',
      foto: u.foto ?? null, estado: 'descanso', centroId: null, centroNombre: null,
    }))

  let ops = [...operadores, ...sinRoster]
  if (busca.trim()) {
    const q = busca.toLowerCase()
    ops = ops.filter(o => o.nombre?.toLowerCase().includes(q) || o.centroNombre?.toLowerCase().includes(q))
  }
  // Primero los que están en faena, luego en descanso; nombre como desempate.
  ops = [...ops].sort((a, b) =>
    ((a.estado === 'faena' ? 0 : 1) - (b.estado === 'faena' ? 0 : 1))
    || (a.nombre ?? '').localeCompare(b.nombre ?? '')
  )

  const enFaenaCount   = ops.filter(o => o.estado === 'faena').length
  const enDescansoCount = ops.filter(o => o.estado !== 'faena').length

  // Colapsar "en descanso" por defecto (foco en faena) — pero si hay búsqueda activa,
  // se muestra todo lo que matchea sin importar el estado.
  const buscando = !!busca.trim()
  const opsVisibles = buscando ? ops : ops.filter(o => o.estado === 'faena' || verDescanso)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: t.space5 }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* Acciones admin */}
        {role === 'admin' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: t.space4 }}>
            <button
              onClick={() => setShowImport(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: t.brand, border: 'none', color: '#fff', borderRadius: t.radiusMd, padding: '7px 14px', cursor: 'pointer', fontSize: t.textSm, fontWeight: 600 }}>
              <Upload size={14} /> Importar CSV
            </button>
            <button
              onClick={() => setShowForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${t.brand}`, color: t.brandSoft, borderRadius: t.radiusMd, padding: '7px 14px', cursor: 'pointer', fontSize: t.textSm, fontWeight: 600 }}>
              <UserPlus size={14} /> Nuevo operador
            </button>
            <button
              onClick={() => setGestionarEpp(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${t.border}`, color: t.textSecondary, borderRadius: t.radiusMd, padding: '7px 14px', cursor: 'pointer', fontSize: t.textSm, fontWeight: 600 }}>
              <HardHat size={14} /> Gestionar EPP
            </button>
            <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: t.textXs, color: t.textMuted }}>
              {usuarios.length} cuentas en sistema
            </span>
          </div>
        )}

        {resultado && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.bgElevated, border: `1px solid ${resultado.ok ? t.ok : t.fault}`, borderRadius: t.radiusMd, padding: '9px 13px', marginBottom: t.space3, fontSize: t.textSm, color: t.textPrimary }}>
            <span>{resultado.msg}</span>
            <button onClick={() => setResultado(null)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>✕</button>
          </div>
        )}

        {/* Stats */}
        {!cargando && operadores.length > 0 && (
          <div className="gl-stats-row">
            <span className="gl-stat-chip active" style={{ color: '#22c55e', borderColor: '#22c55e', background: 'rgba(34,197,94,0.1)', cursor: 'default' }}>
              <span className="gl-stat-dot" style={{ background: '#22c55e' }} /> En faena <span style={{ opacity: 0.65 }}>{enFaenaCount}</span>
            </span>
            <span className="gl-stat-chip" style={{ cursor: 'default' }}>
              <span className="gl-stat-dot" style={{ background: '#6b7280' }} /> En descanso <span style={{ opacity: 0.65 }}>{enDescansoCount}</span>
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '10px 13px', marginBottom: t.space4, minHeight: 44 }}>
          <Search size={16} color={t.textMuted} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar operador o centro..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.textPrimary, fontSize: t.textSm }} />
          <span style={{ fontSize: t.textXs, color: t.textMuted }}>{ops.length}</span>
        </div>

        {cargando && <p style={{ color: t.textMuted, fontSize: t.textSm }}>Cargando...</p>}
        {!cargando && ops.length === 0 && (
          <div style={{ textAlign: 'center', color: t.textMuted, padding: '48px 0', fontSize: t.textSm }}>
            <Users size={32} style={{ opacity: 0.5, marginBottom: 8 }} /><div>Sin operadores registrados.</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 11 }}>
          {opsVisibles.map((o, i) => {
            const enFaena = o.estado === 'faena'
            const inicial = (o.nombre?.[0] ?? '?').toUpperCase()
            const usuario = usuariosPorUid[o.uid]
            const eppFaltantes = usuario?.epp?.faltantes ?? {}
            const eppFaltanCount = Object.values(eppFaltantes).filter(Boolean).length
            const esOperador = usuario?.rol === 'operador'
            const esApertura = usuario?.rol === 'apertura'
            const cubriendo = !!usuario?.teamOrigen
            const centroOrigen = cubriendo ? centros.find(c => c.teamAsignado === usuario.teamOrigen) : null
            // Nombre del hogar al que vuelve: el centro, o la etiqueta especial (Apertura/Soberanía) si su hogar es un team especial sin centro.
            const nombreHogar = centroOrigen?.nombre ?? (cubriendo ? labelTeamEspecial(usuario.teamOrigen) : null)
            return (
              <div key={o.centroId + i} style={{ background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, padding: 13 }}>
                <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {o.foto
                      ? <img src={o.foto} alt={o.nombre} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${enFaena ? t.ok : t.border}` }} />
                      : <div style={{ width: 44, height: 44, borderRadius: '50%', background: t.brandTint, color: t.brandSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, border: `2px solid ${enFaena ? t.ok : t.border}` }}>{inicial}</div>}
                    <span style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: enFaena ? t.ok : t.noop, border: `2px solid ${t.bgElevated}` }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <div style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.nombre}</div>
                      {esApertura && (
                        <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, color: t.brandSoft, background: t.brandTint, borderRadius: t.radiusFull, padding: '1px 7px' }}>{labelEspecialidad(usuario?.especialidad)}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: enFaena ? t.ok : t.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      {enFaena ? <Gamepad2 size={12} /> : <Coffee size={12} />}
                      <span>{enFaena ? 'En faena' : 'En descanso'}</span>
                      {enFaena && o.centroNombre && <span style={{ opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>· {o.centroNombre}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 11, paddingTop: 10, borderTop: `1px solid ${t.border}` }}>
                  <ContactoRow icon={Phone} valor={o.telefono} href={o.telefono ? `tel:${o.telefono.replace(/[^\d+]/g, '')}` : null} />
                  <ContactoRow icon={Mail} valor={o.correoPersonal} href={o.correoPersonal ? `mailto:${o.correoPersonal}` : null} />
                  <ContactoRow icon={AtSign} valor={o.correoCorp} href={o.correoCorp ? `mailto:${o.correoCorp}` : null} />
                </div>
                {role === 'admin' && o.uid && (
                  <button onClick={() => setEppDe({ uid: o.uid, nombre: o.nombre })}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', marginTop: 8, background: eppFaltanCount > 0 ? t.faultTint : t.okTint, color: eppFaltanCount > 0 ? t.fault : t.ok, border: 'none', borderRadius: t.radiusMd, padding: '5px 9px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                    <HardHat size={12} /> {eppFaltanCount > 0 ? `EPP · faltan ${eppFaltanCount}` : 'EPP · OK'}
                  </button>
                )}
                {role === 'admin' && (esOperador || esApertura) && (
                  <>
                    {cubriendo && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 10, fontWeight: 600, color: t.ok }}>
                        <MapPinned size={11} /> Cubriendo{nombreHogar ? ` · vuelve a ${nombreHogar}` : ''}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {cubriendo ? (
                        <button onClick={() => handleDevolverAdmin(usuario)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: t.brandTint, color: t.brandSoft, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                          <RotateCcw size={11} /> Devolver
                        </button>
                      ) : (
                        <button onClick={() => setMoverUser(usuario)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: t.bgInput, color: t.textSecondary, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                          <MapPinned size={11} /> Mover
                        </button>
                      )}
                      <button onClick={() => setDiasDe(usuario)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: t.bgInput, color: t.textSecondary, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                        <CalendarClock size={11} /> Días extras
                      </button>
                    </div>
                  </>
                )}
                {role === 'admin' && (esOperador || esApertura) && (
                  <button onClick={() => setReasignarUser(usuario)} title="Reasignar a otro centro (permanente)"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%', marginTop: 6, background: t.brandTint, color: t.brandSoft, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                    <Repeat size={11} /> Reasignar de centro
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {!buscando && enDescansoCount > 0 && (
          <button onClick={() => setVerDescanso(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center', marginTop: t.space4, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '9px 13px', cursor: 'pointer', fontSize: t.textSm, color: t.textSecondary, fontWeight: 600 }}>
            {verDescanso ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {verDescanso ? 'Ocultar en descanso' : `Ver ${enDescansoCount} en descanso`}
          </button>
        )}

        {/* Cuentas del sistema — editar/borrar (solo admin) */}
        {role === 'admin' && (
          <div style={{ marginTop: t.space5 }}>
            <button onClick={() => setShowCuentas(v => !v)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '10px 13px', cursor: 'pointer', textAlign: 'left' }}>
              <Users size={15} color={t.textMuted} />
              <span style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary, flex: 1 }}>Cuentas del sistema</span>
              <span style={{ fontSize: t.textXs, color: t.textMuted }}>{usuarios.length} · {showCuentas ? '▲' : '▼'}</span>
            </button>
            {showCuentas && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {[...usuarios].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '')).map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '8px 12px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nombre || '(sin nombre)'}</div>
                      <div style={{ fontSize: 10, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.correoCorporativo}</div>
                    </div>
                    {u.movilHabilitado && (
                      <span title="Acceso móvil activo" style={{ fontSize: 12, flexShrink: 0 }}>📱</span>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.brandSoft, background: t.brandTint, borderRadius: t.radiusFull, padding: '2px 8px', flexShrink: 0 }}>{rolLabelDe(u)}</span>
                    <button onClick={() => setEditUser(u)} title="Editar" style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: t.radiusSm, color: t.textSecondary, cursor: 'pointer', padding: 5, display: 'flex' }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setABorrar(u)} title="Eliminar" style={{ background: 'none', border: `1px solid ${t.fault}40`, borderRadius: t.radiusSm, color: t.fault, cursor: 'pointer', padding: 5, display: 'flex' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showImport && (
        <ImportarCSV
          onImportar={importarLista}
          empresaId={empresaActiva?.id ?? null}
          onCerrar={() => setShowImport(false)}
        />
      )}

      {showForm && (
        <FormOperador
          onGuardar={handleCrear}
          onCerrar={() => setShowForm(false)}
        />
      )}

      {editUser && (
        <FormOperador
          inicial={editUser}
          esEdicion
          onGuardar={handleEditar}
          onCerrar={() => setEditUser(null)}
        />
      )}

      {eppDe && (
        <ModalEpp uid={eppDe.uid} nombre={eppDe.nombre} role="admin" onCerrar={() => setEppDe(null)} />
      )}

      {gestionarEpp && (
        <ModalEpp role="admin" onCerrar={() => setGestionarEpp(false)} />
      )}

      {moverUser && (
        <ModalMoverCentro
          nombre={moverUser.nombre}
          centros={centros}
          teamActual={moverUser.teamId ?? null}
          onElegir={(centro) => moverACentro(moverUser, centro, centros)}
          onCerrar={() => setMoverUser(null)}
        />
      )}

      {reasignarUser && (
        <ModalReasignarCentro
          nombre={reasignarUser.nombre}
          centros={centros}
          teamActual={reasignarUser.teamId ?? null}
          ocupacionPorCentro={ocupacionPorCentro}
          onElegir={handleReasignar}
          onCerrar={() => setReasignarUser(null)}
        />
      )}

      {diasDe && (
        <ModalDiasExtras nombre={diasDe.nombre} coberturas={diasDe.coberturas ?? []} onCerrar={() => setDiasDe(null)} />
      )}

      {aBorrar && (
        <div style={{ position: 'fixed', inset: 0, background: t.scrim, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, width: '100%', maxWidth: 360, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: t.textBase, color: t.textPrimary, marginBottom: 8 }}>Eliminar cuenta</div>
            <p style={{ color: t.textSecondary, fontSize: t.textSm, margin: '0 0 10px' }}>
              ¿Eliminar la cuenta de <b style={{ color: t.textPrimary }}>{aBorrar.nombre}</b> ({aBorrar.correoCorporativo})? Se borra su perfil y su acceso. Esta acción no se puede deshacer.
            </p>
            <p style={{ color: t.textMuted, fontSize: t.textXs, margin: '0 0 16px', lineHeight: 1.5 }}>
              También se lo quita de <b style={{ color: t.textSecondary }}>todos los centros</b> y del kit de apertura.
              Su historial (bitácoras y entregas de turno) <b style={{ color: t.textSecondary }}>se conserva</b>, pero figurará como “Operador dado de baja”.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => !borrando && setABorrar(null)} disabled={borrando} style={{ flex: 1, padding: '8px 0', background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textSecondary, cursor: borrando ? 'default' : 'pointer', opacity: borrando ? 0.6 : 1, fontWeight: 600, fontSize: t.textSm }}>Cancelar</button>
              <button onClick={handleBorrar} disabled={borrando} style={{ flex: 1, padding: '8px 0', background: t.fault, border: 'none', borderRadius: t.radiusMd, color: '#fff', cursor: borrando ? 'default' : 'pointer', opacity: borrando ? 0.7 : 1, fontWeight: 700, fontSize: t.textSm }}>{borrando ? 'Eliminando…' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
