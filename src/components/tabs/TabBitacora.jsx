import { useState, useEffect } from 'react'
import { db, auth } from '../../lib/firebase'
import { doc, setDoc, getDoc, onSnapshot, arrayUnion, deleteField } from 'firebase/firestore'
import { Send, FileText, ChevronDown, ChevronUp, History } from 'lucide-react'
import { logError } from '../../lib/logger'
import { validarBitacora } from '../../lib/validaciones'
import { kitBase } from '../../lib/kitScope'

// Fecha LOCAL (no UTC): con UTC, cualquier bitácora cerrada de noche en Chile
// (después de las ~20:00-21:00 hora local, según DST) quedaba fechada al día
// siguiente porque ya era "mañana" en UTC.
function hoy() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function mesActual() {
  return hoy().slice(0, 7)
}

function formatFecha(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${String(y).slice(2)}`
}

// ISO → "18/07 13:42" para el banner de borrador.
function formatGuardado(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function generarTexto({ centro, datos, rov, redes }) {
  const principal = rov?.principal ?? {}
  const backup    = rov?.backup    ?? {}

  const equipoBloque = (titulo, eq) => {
    const campos = [
      `Modelo: ${eq.modelo || 'S/N'}`,
      `Código ROV: ${eq.codigoRov || 'S/N'}`,
      `Código Control: ${eq.codigoControl || 'S/N'}`,
      `Código Umbilical: ${eq.codigoUmbilical || 'S/N'}`,
      eq.codigoCargadorRov     ? `Cargador ROV: ${eq.codigoCargadorRov}` : null,
      eq.codigoCargadorControl ? `Cargador Control: ${eq.codigoCargadorControl}` : null,
      `Observación: ${eq.observacion || 'Operativo'}`,
    ].filter(Boolean).join('\n  ')
    return `${titulo}:\n  ${campos}`
  }

  return [
    `📋 BITÁCORA DIARIA`,
    `📅 Fecha: ${formatFecha(datos.fecha)}`,
    ``,
    `👤 Piloto: ${datos.piloto || '—'}`,
    `🏢 Team: ${datos.team || '—'}`,
    `📍 Centro: ${centro.nombre}`,
    `🗺️ Área: ${datos.area || '—'}`,
    `⚓ Estado de puerto: ${datos.estadoPuerto || '—'}`,
    ``,
    `🔧 TRABAJOS REALIZADOS`,
    ``,
    `🌅 Jornada AM:`,
    datos.jornadaAm || '—',
    ``,
    `🌇 Jornada PM:`,
    datos.jornadaPm || '—',
    ``,
    `📝 OBSERVACIONES:`,
    datos.observaciones || '—',
    ``,
    `🧵 REDES / PARCHES`,
    `  Parches disponibles: ${redes?.parchesStock ?? 0}`,
    `  Herramienta de costura: ${redes?.costuraOperativa === false ? '⚠️ No operativa' : 'Operativa'}`,
    `  Parches instalados hoy: ${datos.parchesInstalados || 0}`,
    `  Costuras realizadas hoy: ${datos.costurasRealizadas || 0}`,
    ``,
    `🤖 EQUIPOS`,
    equipoBloque('Equipo Principal', principal),
    ``,
    equipoBloque('Equipo Backup', backup),
  ].join('\n')
}

export default function TabBitacora({ centro, role }) {
  const [datos, setDatos]       = useState({
    piloto: '', team: '', area: '',
    fecha: hoy(), estadoPuerto: '',
    jornadaAm: '', jornadaPm: '', observaciones: '',
    parchesInstalados: 0, costurasRealizadas: 0,
  })
  const [historial, setHistorial] = useState([])
  const [rov, setRov]           = useState({})
  const [redes, setRedes]       = useState({ parchesStock: 0, costuraOperativa: true })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardandoBorrador, setGuardandoBorrador] = useState(false)
  const [borradorInfo, setBorradorInfo] = useState(null) // guardadoEn del borrador en curso
  const [avisoBorrador, setAvisoBorrador] = useState('')
  const [errorGuardado, setErrorGuardado] = useState('')
  const [mostrarVista, setMostrarVista] = useState(false)
  const [mostrarHistorial, setMostrarHistorial] = useState(false)

  const puedEditar = role === 'operador' || role === 'apertura'

  useEffect(() => {
    const cargar = async () => {
      const [snapBit, snapRov, snapOps, snapRedes] = await Promise.all([
        getDoc(doc(db, ...kitBase(centro), 'datos', 'bitacora')),
        getDoc(doc(db, ...kitBase(centro), 'equipos', 'rov')),
        getDoc(doc(db, ...kitBase(centro), 'datos', 'operadores')),
        getDoc(doc(db, ...kitBase(centro), 'datos', 'redes')),
      ])
      if (snapRedes.exists()) {
        const d = snapRedes.data()
        setRedes({ parchesStock: d.parchesStock ?? 0, costuraOperativa: d.costuraOperativa ?? true })
      }
      if (snapBit.exists()) {
        const dataBit = snapBit.data()
        const lista = dataBit.lista ?? []
        setHistorial(lista)
        const ultima = lista[lista.length - 1]
        // Continuidad: piloto/team/área se prellenan de la última entrada; lo diario queda en blanco.
        if (ultima) setDatos(d => ({ ...d, piloto: ultima.piloto || d.piloto, team: ultima.team || '', area: ultima.area || '' }))
        // Borrador en curso: precarga y manda sobre los pre-rellenos (sin arrastrar metadatos).
        if (dataBit.borrador) {
          const { guardadoEn, guardadoPor, ...campos } = dataBit.borrador
          setDatos(d => ({ ...d, ...campos }))
          setBorradorInfo(guardadoEn ?? null)
        }
      }
      if (snapRov.exists()) setRov(snapRov.data())
      // Auto-piloto: siempre usa el operador en faena si existe
      if (snapOps.exists()) {
        const ops = snapOps.data()
        const listaOps = ops.lista ?? [ops.op1, ops.op2].filter(Boolean)
        const enFaena = listaOps.find(op => op?.estado === 'faena' && op?.nombre)
        if (enFaena) setDatos(d => ({ ...d, piloto: enFaena.nombre }))
      }
      setCargando(false)
    }
    cargar()
    // Suscribir cambios de operadores en tiempo real para actualizar piloto
    const unsub = onSnapshot(doc(db, ...kitBase(centro), 'datos', 'operadores'), (snap) => {
      if (!snap.exists()) return
      const ops = snap.data()
      const listaOps = ops.lista ?? [ops.op1, ops.op2].filter(Boolean)
      const enFaena = listaOps.find(op => op?.estado === 'faena' && op?.nombre)
      if (enFaena) setDatos(d => ({ ...d, piloto: enFaena.nombre }))
    }, (e) => logError('TabBitacora/operadores', e))
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centro.id, centro.teamAsignado])

  const set = (campo, valor) => setDatos(d => ({ ...d, [campo]: valor }))

  const historialMes = historial
    .filter(b => (b.fecha ?? '').slice(0, 7) === mesActual())
    .slice()
    .reverse()

  const totalMes = historialMes.reduce((acc, b) => ({
    parches: acc.parches + (Number(b.parchesInstalados) || 0),
    costuras: acc.costuras + (Number(b.costurasRealizadas) || 0),
  }), { parches: 0, costuras: 0 })

  const validacion = validarBitacora(datos)

  const guardar = async () => {
    // Defensa en profundidad: no persistir una bitácora vacía (LV-03).
    if (!validarBitacora(datos).ok) return false
    setGuardando(true)
    setErrorGuardado('')
    try {
      const uid = auth.currentUser?.uid ?? null
      const entrada = { ...datos, creadoPor: uid, creadoEn: new Date().toISOString() }
      // Finaliza: agrega la entrada al historial y borra el borrador en curso en una sola escritura.
      await setDoc(doc(db, ...kitBase(centro), 'datos', 'bitacora'), { lista: arrayUnion(entrada), borrador: deleteField() }, { merge: true })
      setHistorial(h => [...h, entrada])
      setBorradorInfo(null)
      setAvisoBorrador('')
      // Limpia los campos diarios; piloto/team/área se conservan (son de configuración, no diarios).
      setDatos(d => ({ ...d, fecha: hoy(), estadoPuerto: '', jornadaAm: '', jornadaPm: '', observaciones: '', parchesInstalados: 0, costurasRealizadas: 0 }))
      return true
    } catch (e) {
      logError('TabBitacora/guardar', e)
      setErrorGuardado('No se pudo guardar la bitácora. Revisa tu conexión e intenta de nuevo.')
      return false
    } finally {
      setGuardando(false)
    }
  }

  // Guarda el trabajo a medias (ej. solo jornada AM) sin finalizar: no toca el historial,
  // no limpia el formulario. Se precarga al reabrir para seguir en la tarde.
  const guardarComoBorrador = async () => {
    if (!validacion.ok) return
    setGuardandoBorrador(true)
    setErrorGuardado('')
    try {
      const uid = auth.currentUser?.uid ?? null
      const guardadoEn = new Date().toISOString()
      await setDoc(doc(db, ...kitBase(centro), 'datos', 'bitacora'), { borrador: { ...datos, guardadoEn, guardadoPor: uid } }, { merge: true })
      setBorradorInfo(guardadoEn)
      setAvisoBorrador(`Borrador guardado ${formatGuardado(guardadoEn)}`)
    } catch (e) {
      logError('TabBitacora/guardarComoBorrador', e)
      setErrorGuardado('No se pudo guardar el borrador. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setGuardandoBorrador(false)
    }
  }

  const descartarBorrador = async () => {
    setGuardandoBorrador(true)
    setErrorGuardado('')
    try {
      await setDoc(doc(db, ...kitBase(centro), 'datos', 'bitacora'), { borrador: deleteField() }, { merge: true })
      setBorradorInfo(null)
      setAvisoBorrador('')
      setDatos(d => ({ ...d, fecha: hoy(), estadoPuerto: '', jornadaAm: '', jornadaPm: '', observaciones: '', parchesInstalados: 0, costurasRealizadas: 0 }))
    } catch (e) {
      logError('TabBitacora/descartarBorrador', e)
      setErrorGuardado('No se pudo descartar el borrador. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setGuardandoBorrador(false)
    }
  }

  const enviarWhatsApp = async () => {
    // El texto se arma con `datos` actuales; guardar() los limpia al terminar, así
    // que capturamos el texto ANTES de guardar y solo enviamos si el guardado ocurrió.
    if (!validacion.ok) return
    const texto = generarTexto({ centro, datos, rov, redes })
    const guardado = await guardar()
    if (!guardado) return
    const url = `whatsapp://send?text=${encodeURIComponent(texto)}`
    window.location.href = url
  }

  if (cargando) return <p style={{ color: 'var(--gl-text-muted)', fontSize: 13 }}>Cargando...</p>

  const textoGenerado = generarTexto({ centro, datos, rov, redes })

  return (
    <div style={s.wrap}>
      {/* ---- Campos fijos automáticos ---- */}
      <div style={s.fijoBox}>
        <span style={s.fijoLabel}>Centro</span>
        <span style={s.fijoValor}>{centro.nombre}</span>
      </div>

      {/* ---- Borrador en curso ---- */}
      {borradorInfo && (
        <div style={s.borradorBanner}>
          <span style={s.borradorTxt}>📝 Borrador del {formatGuardado(borradorInfo)}</span>
          {puedEditar && (
            <button type="button" style={s.borradorBtn} disabled={guardandoBorrador} onClick={descartarBorrador}>Descartar</button>
          )}
        </div>
      )}

      {/* ---- Campos de configuración del centro (piloto, team, área) ---- */}
      <Campo label="Piloto" valor={datos.piloto} onChange={v => set('piloto', v)} disabled={!puedEditar} placeholder="Nombre del piloto" />
      <Campo label="Team" valor={datos.team} onChange={v => set('team', v)} disabled={!puedEditar} placeholder="Ej: GL team 13" />
      <Campo label="Área" valor={datos.area} onChange={v => set('area', v)} disabled={!puedEditar} placeholder="Ej: Aguirre, Canal Darwin" />

      <div style={s.divider} />

      {/* ---- Campos diarios (edita el operador) ---- */}
      <Campo label="Fecha" tipo="date" valor={datos.fecha} onChange={v => set('fecha', v)} disabled={!puedEditar} />
      <Campo label="Estado de puerto" valor={datos.estadoPuerto} onChange={v => set('estadoPuerto', v)} disabled={!puedEditar} placeholder="Ej: Habilitado / Cerrado" />

      <div style={s.divider} />

      <div style={s.secTitulo}>🔧 Trabajos realizados</div>

      <div style={s.campoWrap}>
        <label style={s.lbl}>Jornada AM</label>
        <textarea style={s.textarea} rows={3} value={datos.jornadaAm} disabled={!puedEditar}
          onChange={e => set('jornadaAm', e.target.value)}
          placeholder="Describe los trabajos de la mañana…" />
      </div>

      <div style={s.campoWrap}>
        <label style={s.lbl}>Jornada PM</label>
        <textarea style={s.textarea} rows={3} value={datos.jornadaPm} disabled={!puedEditar}
          onChange={e => set('jornadaPm', e.target.value)}
          placeholder="Describe los trabajos de la tarde…" />
      </div>

      <div style={s.campoWrap}>
        <label style={s.lbl}>Observaciones</label>
        <textarea style={s.textarea} rows={3} value={datos.observaciones} disabled={!puedEditar}
          onChange={e => set('observaciones', e.target.value)}
          placeholder="Sin observaciones / escribe aquí…" />
      </div>

      {/* ---- Redes: parches y costura (diario) ---- */}
      <div style={s.divider} />
      <div style={s.secTitulo}>🧵 Redes</div>
      <div style={s.fijoBox}>
        <span style={s.fijoLabel}>Disponibles</span>
        <span style={s.fijoValor}>{redes.parchesStock ?? 0} parches</span>
        <span style={{ ...s.fijoLabel, marginLeft: 8 }}>Herramienta</span>
        <span style={{ ...s.fijoValor, color: redes.costuraOperativa === false ? 'var(--gl-fault)' : 'var(--gl-ok)' }}>
          {redes.costuraOperativa === false ? '⚠️ No operativa' : 'Operativa'}
        </span>
      </div>
      <div style={s.campoWrap}>
        <label style={s.lbl}>Parches instalados hoy</label>
        <input type="number" min={0} style={{ ...s.input, opacity: puedEditar ? 1 : 0.6 }} disabled={!puedEditar}
          value={datos.parchesInstalados} onChange={e => set('parchesInstalados', Math.max(0, Number(e.target.value) || 0))} />
      </div>
      <div style={s.campoWrap}>
        <label style={s.lbl}>Costuras realizadas hoy</label>
        <input type="number" min={0} style={{ ...s.input, opacity: puedEditar ? 1 : 0.6 }} disabled={!puedEditar}
          value={datos.costurasRealizadas} onChange={e => set('costurasRealizadas', Math.max(0, Number(e.target.value) || 0))} />
      </div>

      {/* ---- Vista previa de equipos (FIJO, auto desde TabROV) ---- */}
      <div style={s.divider} />
      <EquiposInfo rov={rov} />

      {/* ---- Acciones ---- */}
      {puedEditar && (
        <>
          <div style={s.acciones}>
            <button onClick={guardarComoBorrador} disabled={guardando || guardandoBorrador || !validacion.ok} style={{ ...s.btnGuardar, opacity: (guardando || guardandoBorrador || !validacion.ok) ? 0.5 : 1, cursor: (guardando || guardandoBorrador || !validacion.ok) ? 'not-allowed' : 'pointer' }}>
              {guardandoBorrador ? 'Guardando…' : 'Guardar borrador'}
            </button>
            <button onClick={enviarWhatsApp} disabled={guardando || guardandoBorrador || !validacion.ok} style={{ ...s.btnWpp, opacity: (guardando || guardandoBorrador || !validacion.ok) ? 0.5 : 1, cursor: (guardando || guardandoBorrador || !validacion.ok) ? 'not-allowed' : 'pointer' }}>
              <Send size={14} /> Generar y enviar WhatsApp
            </button>
          </div>
          {avisoBorrador && <p style={s.avisoOk}>{avisoBorrador}</p>}
          {errorGuardado && <p style={s.aviso}>{errorGuardado}</p>}
          {!validacion.ok && <p style={s.aviso}>{validacion.motivo}</p>}
        </>
      )}

      {/* ---- Vista previa del texto ---- */}
      <button style={s.btnVista} onClick={() => setMostrarVista(v => !v)}>
        <FileText size={13} />
        {mostrarVista ? 'Ocultar vista previa' : 'Ver bitácora generada'}
        {mostrarVista ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {mostrarVista && (
        <pre style={s.vistaPrevia}>{textoGenerado}</pre>
      )}

      {/* ---- Historial de este mes ---- */}
      <div style={s.divider} />
      <button style={s.btnVista} onClick={() => setMostrarHistorial(v => !v)}>
        <History size={13} />
        {mostrarHistorial ? 'Ocultar historial del mes' : `Historial de este mes (${historialMes.length})`}
        {mostrarHistorial ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {mostrarHistorial && (
        <div style={s.historial}>
          {historialMes.length === 0 && (
            <p style={{ color: 'var(--gl-text-muted)', fontSize: 12, margin: 0 }}>Sin entradas este mes.</p>
          )}
          {historialMes.length > 0 && (
            <div style={s.historialItem}>
              <div style={s.historialFecha}>🧵 Total mes — parches: {totalMes.parches} · costuras: {totalMes.costuras}</div>
            </div>
          )}
          {historialMes.map((b, i) => (
            <div key={i} style={s.historialItem}>
              <div style={s.historialFecha}>{formatFecha(b.fecha)} — {b.piloto || 'Sin piloto'}</div>
              {b.estadoPuerto && <div style={s.historialLinea}><b>Puerto:</b> {b.estadoPuerto}</div>}
              {b.jornadaAm && <div style={s.historialLinea}><b>AM:</b> {b.jornadaAm}</div>}
              {b.jornadaPm && <div style={s.historialLinea}><b>PM:</b> {b.jornadaPm}</div>}
              {b.observaciones && <div style={s.historialLinea}><b>Obs:</b> {b.observaciones}</div>}
              {((Number(b.parchesInstalados) || 0) > 0 || (Number(b.costurasRealizadas) || 0) > 0) && (
                <div style={s.historialLinea}><b>Redes:</b> {b.parchesInstalados || 0} parches · {b.costurasRealizadas || 0} costuras</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Campo({ label, tipo = 'text', valor, onChange, disabled, placeholder }) {
  return (
    <div style={s.campoWrap}>
      <label style={s.lbl}>{label}</label>
      <input
        type={tipo}
        value={valor}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        style={{ ...s.input, opacity: disabled ? 0.6 : 1 }}
      />
    </div>
  )
}

function EquiposInfo({ rov }) {
  const principal = rov?.principal ?? {}
  const backup    = rov?.backup    ?? {}

  return (
    <div>
      <div style={s.secTitulo}>🤖 Equipos (auto desde inventario ROV)</div>
      <EquipoFila titulo="Equipo Principal" eq={principal} />
      <EquipoFila titulo="Equipo Backup"    eq={backup}    />
    </div>
  )
}

function EquipoFila({ titulo, eq }) {
  const campos = [
    { label: 'Modelo',            val: eq.modelo },
    { label: 'Código ROV',        val: eq.codigoRov },
    { label: 'Código Control',    val: eq.codigoControl },
    { label: 'Código Umbilical',  val: eq.codigoUmbilical },
    { label: 'Cargador ROV',      val: eq.codigoCargadorRov },
    { label: 'Cargador Control',  val: eq.codigoCargadorControl },
    { label: 'Observación',       val: eq.observacion || 'Operativo' },
  ]
  return (
    <div style={s.eqBloque}>
      <div style={s.eqTitulo}>{titulo}</div>
      {campos.map(({ label, val }) => val ? (
        <div key={label} style={s.eqFila}>
          <span style={s.eqLabel}>{label}</span>
          <span style={s.eqVal}>{val}</span>
        </div>
      ) : null)}
    </div>
  )
}

const s = {
  wrap:       { display: 'flex', flexDirection: 'column', gap: 10 },
  fijoBox:    { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gl-bg-input)', borderRadius: 8, padding: '7px 10px', border: '1px solid var(--gl-border)' },
  fijoLabel:  { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gl-text-muted)', letterSpacing: '0.05em', flexShrink: 0 },
  fijoValor:  { fontSize: 13, color: 'var(--gl-text-primary)', fontWeight: 600 },
  divider:    { borderTop: '1px solid var(--gl-border)', margin: '4px 0' },
  secTitulo:  { fontSize: 12, fontWeight: 700, color: 'var(--gl-text-primary)', marginBottom: 4 },
  campoWrap:  { display: 'flex', flexDirection: 'column', gap: 3 },
  lbl:        { fontSize: 10, fontWeight: 600, color: 'var(--gl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:      { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 7, color: 'var(--gl-text-primary)', fontSize: 13, padding: '7px 10px', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  textarea:   { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 7, color: 'var(--gl-text-primary)', fontSize: 13, padding: '7px 10px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', width: '100%', boxSizing: 'border-box', lineHeight: 1.5 },
  eqBloque:   { background: 'var(--gl-bg-input)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--gl-border)', marginBottom: 6 },
  eqTitulo:   { fontSize: 11, fontWeight: 700, color: 'var(--gl-text-primary)', marginBottom: 5 },
  eqFila:     { display: 'flex', justifyContent: 'space-between', paddingBottom: 2, gap: 8 },
  eqLabel:    { fontSize: 10, color: 'var(--gl-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 },
  eqVal:      { fontSize: 11, color: 'var(--gl-text-primary)', textAlign: 'right' },
  acciones:   { display: 'flex', gap: 8, marginTop: 4 },
  aviso:      { fontSize: 11, color: 'var(--gl-fault)', margin: '6px 0 0', lineHeight: 1.4 },
  avisoOk:    { fontSize: 11, color: 'var(--gl-ok)', margin: '6px 0 0', lineHeight: 1.4, fontWeight: 600 },
  borradorBanner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--gl-bg-input)', border: '1px dashed var(--gl-border)', borderRadius: 8, padding: '7px 10px' },
  borradorTxt: { fontSize: 12, fontWeight: 600, color: 'var(--gl-text-secondary)' },
  borradorBtn: { background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-fault)', borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnGuardar: { flex: 1, background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-text-secondary)', borderRadius: 8, padding: '9px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnWpp:     { flex: 2, background: '#25D366', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnVista:   { display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--gl-border)', borderRadius: 7, color: 'var(--gl-text-secondary)', fontSize: 11, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit' },
  vistaPrevia:{ background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, padding: 12, fontSize: 11, color: 'var(--gl-text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowX: 'auto', margin: 0 },
  historial:      { display: 'flex', flexDirection: 'column', gap: 8 },
  historialItem:  { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, padding: '8px 10px' },
  historialFecha: { fontSize: 12, fontWeight: 700, color: 'var(--gl-text-primary)', marginBottom: 4 },
  historialLinea: { fontSize: 11, color: 'var(--gl-text-secondary)', lineHeight: 1.5 },
}
