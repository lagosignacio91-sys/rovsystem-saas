import { useState, useEffect } from 'react'
import { db, auth } from '../../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { Modal, Button } from '../kit'
import { t } from '../../theme/tokens'
import { guardarBitacora } from '../../hooks/useBitacorasGlobal'
import { validarBitacora } from '../../lib/validaciones'

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function formatTeam(teamAsignado) {
  if (!teamAsignado) return 'Sin team'
  return 'Team ' + teamAsignado.replace(/\D/g, '')
}

export default function ModalGenerarBitacora({ centro, ultima, onCerrar }) {
  const fecha = hoy()
  const team  = formatTeam(centro.teamAsignado)
  const [piloto, setPiloto] = useState('')
  const [datos, setDatos] = useState({
    area: ultima?.area ?? '',
    estadoPuerto: '',
    jornadaAm: '',
    jornadaPm: '',
    observaciones: '',
  })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    getDoc(doc(db, 'centros', centro.id, 'datos', 'operadores')).then(snap => {
      if (!snap.exists()) return
      const ops = snap.data()
      const listaOps = ops.lista ?? [ops.op1, ops.op2].filter(Boolean)
      const enFaena = listaOps.find(op => op?.estado === 'faena' && op?.nombre)
      if (enFaena) setPiloto(enFaena.nombre)
    })
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

  return (
    <Modal open title={`Generar bitácora diaria — ${centro.nombre}`} onClose={onCerrar} maxWidth={440}
      footer={<>
        <Button variant="secondary" size="lg" onClick={onCerrar}>Cancelar</Button>
        <Button variant="primary" size="lg" disabled={guardando || !validacion.ok} onClick={guardar}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </>}>
      <div style={s.wrap}>
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
}
