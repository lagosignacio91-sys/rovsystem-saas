import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Check, Loader2, Download, Share2 } from 'lucide-react'
import { SECCIONES_ROV } from './StepInspeccionROV'
import StepDatosGenerales from './StepDatosGenerales'
import StepInspeccionROV  from './StepInspeccionROV'
import StepInventario     from './StepInventario'
import { descargarPDF, compartirPDF } from '../../lib/generatePDF'

// Convierte un File a dataURL base64 para incrustarlo en el PDF sin pasar por Storage.
const fileADataURL = (file) => new Promise((resolve) => {
  const reader = new FileReader()
  reader.onloadend = () => resolve(reader.result)
  reader.onerror = () => resolve('')
  reader.readAsDataURL(file)
})

const PASOS = ['Datos', 'Inspección', 'Inventario']

function hoy() {
  const d = new Date()
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function ahora() {
  const d = new Date()
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

const s = {
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  modal:    { background: 'var(--gl-bg-elevated)', borderRadius: '18px 18px 0 0', width: '100%', maxWidth: 520, maxHeight: '95dvh', display: 'flex', flexDirection: 'column' },
  drag:     { width: 36, height: 4, borderRadius: 2, background: 'var(--gl-border)', margin: '10px auto 0' },
  header:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 0' },
  title:    { fontSize: 15, fontWeight: 700, color: 'var(--gl-text-primary)' },
  closeBtn: { width: 30, height: 30, borderRadius: '50%', background: 'var(--gl-bg-input)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gl-text-secondary)' },
  steps:    { display: 'flex', alignItems: 'center', padding: '12px 16px 0', gap: 0 },
  dot:      { width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0, transition: 'background 0.2s' },
  dotDone:  { background: 'var(--gl-brand)', color: '#fff' },
  dotCur:   { background: 'var(--gl-bg-base)', border: '2px solid var(--gl-brand)', color: 'var(--gl-brand)' },
  dotPend:  { background: 'var(--gl-bg-input)', color: 'var(--gl-text-muted)' },
  line:     { flex: 1, height: 2, background: 'var(--gl-border)' },
  lineDone: { background: 'var(--gl-brand)' },
  labels:   { display: 'flex', justifyContent: 'space-between', padding: '3px 8px 0' },
  stepLbl:  { fontSize: 9, color: 'var(--gl-text-muted)', flex: 1, textAlign: 'center' },
  stepLblA: { color: 'var(--gl-brand)', fontWeight: 600 },
  body:     { flex: 1, overflowY: 'auto', padding: '14px 16px 6px' },
  footer:   { display: 'flex', gap: 8, padding: '10px 16px 20px' },
  btnBack:  { flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--gl-border)', background: 'var(--gl-bg-input)', color: 'var(--gl-text-secondary)', fontSize: 13, cursor: 'pointer' },
  btnNext:  { flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--gl-brand)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnSave:  { flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--gl-ok)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  // pantalla de éxito
  success:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 16px 8px', textAlign: 'center' },
  successIco: { width: 56, height: 56, borderRadius: '50%', background: 'var(--gl-ok-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  shareRow: { display: 'flex', gap: 8, width: '100%' },
  btnDl:    { flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--gl-border)', background: 'var(--gl-bg-input)', color: 'var(--gl-brand)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnWa:    { flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#22c55e', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnClose: { width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--gl-border)', background: 'transparent', color: 'var(--gl-text-secondary)', fontSize: 13, cursor: 'pointer', marginTop: 4 },
}

export default function ModalEntregaTurno({ centro, itemsList, onCerrar, onGuardar }) {
  const [paso,    setPaso]    = useState(0)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(null)
  const [error,   setError]   = useState(null)

  const [datos, setDatos] = useState({
    fecha: hoy(), hora: ahora(),
    piloto: '', relevo: '', equipo: '', equipoBackup: '', observacionGeneral: '',
  })
  const [inspeccion, setInspeccion] = useState({ principal: {}, backup: {} })
  const [inventario, setInventario] = useState(
    itemsList.map(i => ({ ...i, cantidad: 0 }))
  )
  const [observacionFinal, setObsFinal] = useState('')

  const avanzar = () => setPaso(p => p + 1)
  const retroceder = () => setPaso(p => p - 1)

  const puedeAvanzar = () => {
    if (paso === 0) return datos.piloto.trim() && datos.equipo.trim()
    if (paso === 1) return true
    return true
  }

  const buildInspeccion = (equipo) => SECCIONES_ROV.map(sec => {
    const d = inspeccion[equipo]?.[sec.id] ?? {}
    return {
      id:      sec.id,
      label:   sec.label,
      estado:  d.estado ?? 'ok',
      nota:    d.nota   ?? '',
      fotoUrl: '',
      file:    d.file ?? null,
    }
  })

  const guardar = async () => {
    setSaving(true)
    setError(null)
    const principalArr = buildInspeccion('principal')
    const backupArr    = buildInspeccion('backup')
    const inventarioArr = inventario.map(({ file: _f, ...i }) => i)

    const sinFile = (arr) => arr.map(({ file: _f, ...rest }) => rest)

    const entregaData = {
      ...datos,
      centroNombre:     centro.nombre,
      inspeccion:       sinFile(principalArr),
      inspeccionBackup: sinFile(backupArr),
      inventario:       inventarioArr,
      observacionFinal,
    }

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('__timeout__')), 15000)
    )

    try {
      await Promise.race([onGuardar(entregaData, principalArr, backupArr), timeout])

      // Para el PDF descargable: incrustamos las fotos en base64 (no depende de Storage).
      const conFotos = async (arr) => Promise.all(arr.map(async ({ file, ...s }) => ({
        ...s,
        fotoUrl: file ? await fileADataURL(file) : '',
      })))
      const [inspFoto, inspBackupFoto] = await Promise.all([conFotos(principalArr), conFotos(backupArr)])

      setSaved({ ...entregaData, inspeccion: inspFoto, inspeccionBackup: inspBackupFoto })
    } catch (e) {
      console.error('Error guardando entrega:', e)
      if (e.message === '__timeout__') {
        setError('No se pudo guardar (tiempo de espera agotado). Verifica tu conexión.')
      } else {
        setError('Error al guardar: ' + (e.message || 'verifica tu conexión.'))
      }
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div style={s.overlay}>
        <div style={s.modal}>
          <div style={s.drag} />
          <div style={s.success}>
            <div style={s.successIco}>
              <Check size={28} color="var(--gl-ok)" />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--gl-text-primary)', margin: 0 }}>Entrega guardada</p>
              <p style={{ fontSize: 12, color: 'var(--gl-text-secondary)', marginTop: 4 }}>
                {saved.centroNombre} · {saved.fecha} {saved.hora}
              </p>
              <p style={{ fontSize: 11, color: 'var(--gl-text-muted)', marginTop: 8, lineHeight: 1.4 }}>
                Descarga el reporte y envíalo por WhatsApp al grupo.
              </p>
            </div>
            <div style={s.shareRow}>
              <button style={s.btnDl} onClick={() => descargarPDF(saved)}>
                <Download size={14} /> Descargar PDF
              </button>
              <button style={s.btnWa} onClick={() => compartirPDF(saved)}>
                <Share2 size={14} /> Compartir
              </button>
            </div>
            <button style={s.btnClose} onClick={onCerrar}>Cerrar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.drag} />
        <div style={s.header}>
          <span style={s.title}>
            {paso === 0 ? 'Datos generales' : paso === 1 ? 'Inspección ROV' : 'Inventario'}
          </span>
          <button style={s.closeBtn} onClick={onCerrar}><X size={16} /></button>
        </div>

        <div style={s.steps}>
          {PASOS.map((_, i) => {
            const done = i < paso
            const cur  = i === paso
            return (
              <span key={i} style={{ display: 'contents' }}>
                <span style={{ ...s.dot, ...(done ? s.dotDone : cur ? s.dotCur : s.dotPend) }}>
                  {done ? <Check size={13} /> : i + 1}
                </span>
                {i < PASOS.length - 1 && <span style={{ ...s.line, ...(done ? s.lineDone : {}) }} />}
              </span>
            )
          })}
        </div>
        <div style={s.labels}>
          {PASOS.map((lbl, i) => (
            <span key={i} style={{ ...s.stepLbl, ...(i === paso ? s.stepLblA : {}) }}>{lbl}</span>
          ))}
        </div>

        <div style={s.body}>
          {paso === 0 && <StepDatosGenerales datos={datos} onChange={setDatos} centroNombre={centro.nombre} />}
          {paso === 1 && <StepInspeccionROV  inspeccion={inspeccion} onChange={setInspeccion} equipoPrincipal={datos.equipo} equipoBackup={datos.equipoBackup} />}
          {paso === 2 && <StepInventario     inventario={inventario} onChange={setInventario} observacionFinal={observacionFinal} onObsChange={setObsFinal} />}
        </div>

        <div style={s.footer}>
          {paso > 0 && <button style={s.btnBack} onClick={retroceder}><ChevronLeft size={15} /> Atrás</button>}
          {paso < 2 && (
            <button style={{ ...s.btnNext, opacity: puedeAvanzar() ? 1 : 0.5 }} onClick={avanzar} disabled={!puedeAvanzar()}>
              Siguiente <ChevronRight size={15} />
            </button>
          )}
          {paso === 2 && (
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {error && <p style={{ margin: 0, fontSize: 11, color: 'var(--gl-fault)', textAlign: 'center' }}>{error}</p>}
              <button style={s.btnSave} onClick={guardar} disabled={saving}>
                {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={15} />}
                {saving ? 'Guardando...' : 'Guardar entrega'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
