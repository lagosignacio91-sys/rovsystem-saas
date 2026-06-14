import { useRef } from 'react'
import { Camera, CheckCircle, AlertTriangle, ImagePlus } from 'lucide-react'

export const SECCIONES_ROV = [
  { id: 'pines_pod',        label: 'Pines sensor POD' },
  { id: 'pines_umbilical',  label: 'Pines umbilical' },
  { id: 'pines_carga',      label: 'Pines de carga' },
  { id: 'pines_grabber',    label: 'Pines Grabber' },
  { id: 'conectores',       label: 'Conectores sensor y umbilical' },
  { id: 'rov_controlador',  label: 'ROV y controlador' },
  { id: 'caja_herramientas',label: 'Caja de herramientas' },
]

const s = {
  card:      { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 },
  cardFault: { borderColor: 'var(--gl-fault)' },
  topRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nombre:    { fontSize: 12, fontWeight: 600, color: 'var(--gl-text-primary)' },
  radios:    { display: 'flex', gap: 8, flexShrink: 0 },
  radioBtn:  { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--gl-border)', background: 'var(--gl-bg-elevated)', userSelect: 'none' },
  ok:        { borderColor: 'var(--gl-ok)', color: 'var(--gl-ok)', background: 'var(--gl-ok-tint)' },
  anomalia:  { borderColor: 'var(--gl-fault)', color: 'var(--gl-fault)', background: 'var(--gl-fault-tint)' },
  textarea:  { background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: 8, color: 'var(--gl-text-primary)', fontSize: 12, padding: '7px 10px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none', lineHeight: 1.5 },
  fotoRow:   { display: 'flex', gap: 8, alignItems: 'center' },
  thumb:     { width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--gl-border)', flexShrink: 0 },
  fotoBtn:   { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, padding: '8px', borderRadius: 8, border: '1px dashed var(--gl-border)', background: 'transparent', color: 'var(--gl-text-secondary)', cursor: 'pointer' },
  progress:  { textAlign: 'center', fontSize: 10, color: 'var(--gl-text-muted)', marginTop: 4 },
}

function SeccionItem({ sec, data, onChange }) {
  const fileRef = useRef()
  const estado  = data?.estado ?? null
  const nota    = data?.nota   ?? ''
  const preview = data?.preview ?? null

  const set = (patch) => onChange(sec.id, { ...data, ...patch })

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    set({ file, preview: url })
  }

  return (
    <div style={{ ...s.card, ...(estado === 'anomalia' ? s.cardFault : {}) }}>
      <div style={s.topRow}>
        <span style={s.nombre}>{sec.label}</span>
        <div style={s.radios}>
          <button
            type="button"
            style={{ ...s.radioBtn, ...(estado === 'ok' ? s.ok : {}) }}
            onClick={() => set({ estado: 'ok' })}
          >
            <CheckCircle size={13} />
            OK
          </button>
          <button
            type="button"
            style={{ ...s.radioBtn, ...(estado === 'anomalia' ? s.anomalia : {}) }}
            onClick={() => set({ estado: 'anomalia' })}
          >
            <AlertTriangle size={13} />
            Anomalía
          </button>
        </div>
      </div>

      {estado === 'anomalia' && (
        <textarea
          style={s.textarea}
          rows={2}
          placeholder="Describe la anomalía..."
          value={nota}
          onChange={e => set({ nota: e.target.value })}
        />
      )}

      <div style={s.fotoRow}>
        {preview && <img src={preview} alt="" style={s.thumb} />}
        <button type="button" style={s.fotoBtn} onClick={() => fileRef.current.click()}>
          {preview ? <Camera size={14} /> : <ImagePlus size={14} />}
          {preview ? 'Cambiar foto' : 'Tomar / subir foto'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFile} />
      </div>
    </div>
  )
}

export default function StepInspeccionROV({ inspeccion, onChange }) {
  const completadas = SECCIONES_ROV.filter(s => inspeccion[s.id]?.estado).length

  const handleChange = (id, data) => onChange({ ...inspeccion, [id]: data })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {SECCIONES_ROV.map(sec => (
        <SeccionItem
          key={sec.id}
          sec={sec}
          data={inspeccion[sec.id]}
          onChange={handleChange}
        />
      ))}
      <p style={s.progress}>{completadas} de {SECCIONES_ROV.length} secciones evaluadas</p>
    </div>
  )
}
