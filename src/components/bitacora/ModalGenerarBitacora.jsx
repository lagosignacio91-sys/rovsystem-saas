import { useState, useEffect } from 'react'
import { db, auth } from '../../lib/firebase'
import { doc, getDoc, deleteField } from 'firebase/firestore'
import { Modal, Button } from '../kit'
import { t } from '../../theme/tokens'
import { guardarBitacora, guardarBorrador } from '../../hooks/useBitacorasGlobal'
import { validarBitacora } from '../../lib/validaciones'

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function formatTeam(teamAsignado) {
  if (!teamAsignado) return 'Sin team'
  return 'Team ' + teamAsignado.replace(/\D/g, '')
}

// "2026-07-18T13:42:00.000Z" → "18/07 13:42" (para el banner de borrador).
function formatGuardado(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function ModalGenerarBitacora({ centro, ultima, borrador, onCerrar }) {
  const fecha = hoy()
  const team  = formatTeam(centro.teamAsignado)
  // Si hay borrador en curso, se precarga; si no, área desde la última entrada.
  const [piloto, setPiloto] = useState(borrador?.piloto ?? '')
  const [datos, setDatos] = useState({
    area: borrador?.area ?? ultima?.area ?? '',
    estadoPuerto: borrador?.estadoPuerto ?? '',
    jornadaAm: borrador?.jornadaAm ?? '',
    jornadaPm: borrador?.jornadaPm ?? '',
    observaciones: borrador?.observaciones ?? '',
    parchesInstalados: borrador?.parchesInstalados ?? 0,
    costurasRealizadas: borrador?.costurasRealizadas ?? 0,
  })
  const [redes, setRedes] = useState({ parchesStock: 0, costuraOperativa: true })
  const [guardando, setGuardando] = useState(false)
  const [guardandoBorrador, setGuardandoBorrador] = useState(false)
  const [borradorInfo, setBorradorInfo] = useState(borrador?.guardadoEn ?? null)
  const [avisoBorrador, setAvisoBorrador] = useState('')

  useEffect(() => {
    // El piloto del borrador manda; si no había borrador, se autocompleta con el operador en faena.
    if (borrador?.piloto) return
    getDoc(doc(db, 'centros', centro.id, 'datos', 'operadores')).then(snap => {
      if (!snap.exists()) return
      const ops = snap.data()
      const listaOps = ops.lista ?? [ops.op1, ops.op2].filter(Boolean)
      const enFaena = listaOps.find(op => op?.estado === 'faena' && op?.nombre)
      if (enFaena) setPiloto(enFaena.nombre)
    })
  }, [centro.id, borrador?.piloto])

  useEffect(() => {
    // Referencia viva del kit de redes (parches disponibles / herramienta de costura).
    getDoc(doc(db, 'centros', centro.id, 'datos', 'redes')).then(snap => {
      if (!snap.exists()) return
      const d = snap.data()
      setRedes({ parchesStock: d.parchesStock ?? 0, costuraOperativa: d.costuraOperativa ?? true })
    }).catch(() => {})
  }, [centro.id])

  const set = (campo, valor) => setDatos(d => ({ ...d, [campo]: valor }))

  const validacion = validarBitacora(datos)

  const guardar = async () => {
    // Defensa en profundidad: aunque el botón esté deshabilitado, no guardar vacío (LV-03).
    if (!validarBitacora(datos).ok) return
    setGuardando(true)
    try {
      const uid = auth.currentUser?.uid ?? null
      await guardarBitacora(centro.id, {
        ...datos, piloto, team, fecha,
        creadoPor: uid, creadoEn: new Date().toISOString(),
      })
      onCerrar()
    } finally {
      setGuardando(false)
    }
  }

  const guardarComoBorrador = async () => {
    if (!validacion.ok) return
    setGuardandoBorrador(true)
    try {
      const uid = auth.currentUser?.uid ?? null
      const guardadoEn = new Date().toISOString()
      await guardarBorrador(centro.id, { ...datos, piloto, team, fecha, guardadoEn, guardadoPor: uid })
      setBorradorInfo(guardadoEn)
      setAvisoBorrador(`Borrador guardado ${formatGuardado(guardadoEn)}`)
    } finally {
      setGuardandoBorrador(false)
    }
  }

  const descartarBorrador = async () => {
    setGuardandoBorrador(true)
    try {
      await guardarBorrador(centro.id, deleteField())
      setBorradorInfo(null)
      setAvisoBorrador('')
      setPiloto('')
      setDatos({ area: ultima?.area ?? '', estadoPuerto: '', jornadaAm: '', jornadaPm: '', observaciones: '', parchesInstalados: 0, costurasRealizadas: 0 })
    } finally {
      setGuardandoBorrador(false)
    }
  }

  return (
    <Modal open title={`Generar bitácora diaria — ${centro.nombre}`} onClose={onCerrar} maxWidth={440}
      footer={<>
        <Button variant="secondary" size="lg" onClick={onCerrar}>Cerrar</Button>
        <Button variant="secondary" size="lg" disabled={guardando || guardandoBorrador || !validacion.ok} onClick={guardarComoBorrador}>
          {guardandoBorrador ? 'Guardando…' : 'Guardar borrador'}
        </Button>
        <Button variant="primary" size="lg" disabled={guardando || guardandoBorrador || !validacion.ok} onClick={guardar}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </>}>
      <div style={s.wrap}>
        {borradorInfo && (
          <div style={s.borradorBanner}>
            <span style={s.borradorTxt}>📝 Borrador del {formatGuardado(borradorInfo)}</span>
            <button type="button" style={s.borradorBtn} disabled={guardandoBorrador} onClick={descartarBorrador}>Descartar</button>
          </div>
        )}

        <div style={s.fijosRow}>
          <CampoFijo label="Piloto" valor={piloto || '—'} />
          <CampoFijo label="Team" valor={team} />
          <CampoFijo label="Fecha" valor={fecha} />
        </div>

        <Campo label="Área" valor={datos.area} onChange={v => set('area', v)} placeholder="Ej: Aguirre, Canal Darwin" />
        <Campo label="Estado de puerto" valor={datos.estadoPuerto} onChange={v => set('estadoPuerto', v)} placeholder="Ej: Habilitado / Cerrado" />

        <TextArea label="Jornada AM" valor={datos.jornadaAm} onChange={v => set('jornadaAm', v)} placeholder="Describe los trabajos de la mañana…" />
        <TextArea label="Jornada PM" valor={datos.jornadaPm} onChange={v => set('jornadaPm', v)} placeholder="Describe los trabajos de la tarde…" />
        <TextArea label="Observaciones" valor={datos.observaciones} onChange={v => set('observaciones', v)} placeholder="Sin observaciones / escribe aquí…" />

        {/* ---- Redes: parches y costura (diario) ---- */}
        <div style={s.redesRef}>
          🧵 Redes — Disponibles: <b>{redes.parchesStock ?? 0}</b> parches · Herramienta:{' '}
          <b style={{ color: redes.costuraOperativa === false ? 'var(--gl-fault)' : 'var(--gl-ok)' }}>
            {redes.costuraOperativa === false ? '⚠️ No operativa' : 'Operativa'}
          </b>
        </div>
        <div style={s.redesInputs}>
          <div style={{ ...s.campoWrap, flex: 1 }}>
            <label style={s.lbl}>Parches instalados</label>
            <input type="number" min={0} style={s.input} value={datos.parchesInstalados}
              onChange={e => set('parchesInstalados', Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div style={{ ...s.campoWrap, flex: 1 }}>
            <label style={s.lbl}>Costuras realizadas</label>
            <input type="number" min={0} style={s.input} value={datos.costurasRealizadas}
              onChange={e => set('costurasRealizadas', Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </div>

        {avisoBorrador && <p style={s.avisoOk}>{avisoBorrador}</p>}
        {!validacion.ok && <p style={s.aviso}>{validacion.motivo}</p>}
      </div>
    </Modal>
  )
}

function CampoFijo({ label, valor }) {
  return (
    <div style={s.fijoWrap}>
      <span style={s.lbl}>{label}</span>
      <span style={s.fijoValor}>{valor}</span>
    </div>
  )
}

function Campo({ label, tipo = 'text', valor, onChange, placeholder }) {
  return (
    <div style={s.campoWrap}>
      <label style={s.lbl}>{label}</label>
      <input type={tipo} value={valor} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s.input} />
    </div>
  )
}

function TextArea({ label, valor, onChange, placeholder }) {
  return (
    <div style={s.campoWrap}>
      <label style={s.lbl}>{label}</label>
      <textarea style={s.textarea} rows={3} value={valor} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

const s = {
  wrap:      { display: 'flex', flexDirection: 'column', gap: 10, padding: t.space4 },
  fijosRow:  { display: 'flex', gap: 8, background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, padding: '8px 10px' },
  fijoWrap:  { display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 },
  fijoValor: { fontSize: 13, color: 'var(--gl-text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  campoWrap: { display: 'flex', flexDirection: 'column', gap: 3 },
  lbl:       { fontSize: 10, fontWeight: 600, color: 'var(--gl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:     { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 7, color: 'var(--gl-text-primary)', fontSize: 13, padding: '7px 10px', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  textarea:  { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 7, color: 'var(--gl-text-primary)', fontSize: 13, padding: '7px 10px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', width: '100%', boxSizing: 'border-box', lineHeight: 1.5 },
  aviso:     { fontSize: 11, color: 'var(--gl-fault)', margin: '2px 0 0', lineHeight: 1.4 },
  avisoOk:   { fontSize: 11, color: 'var(--gl-ok)', margin: '2px 0 0', lineHeight: 1.4, fontWeight: 600 },
  borradorBanner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--gl-bg-input)', border: '1px dashed var(--gl-border)', borderRadius: 8, padding: '7px 10px' },
  borradorTxt: { fontSize: 12, fontWeight: 600, color: 'var(--gl-text-secondary)' },
  borradorBtn: { background: 'transparent', border: '1px solid var(--gl-border)', color: 'var(--gl-fault)', borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  redesRef:  { fontSize: 12, color: 'var(--gl-text-secondary)', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, padding: '7px 10px', lineHeight: 1.4 },
  redesInputs: { display: 'flex', gap: 8 },
}
