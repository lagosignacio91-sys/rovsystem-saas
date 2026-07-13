import { useRef, useState } from 'react'
import { Camera, CheckCircle, AlertTriangle, ImagePlus } from 'lucide-react'
import { useAppConfig } from '../../hooks/useAppConfig'
import { comprimirFoto } from '../../lib/compressorFotos'
import { logError } from '../../lib/logger'

// Compat: secciones por defecto (la fuente real es config/app via useAppConfig).
export { INSPECCION_ROV_DEFAULT as SECCIONES_ROV } from '../../config/appDefaults'

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
  tabs:      { display: 'flex', gap: 6, background: 'var(--gl-bg-input)', padding: 4, borderRadius: 10, marginBottom: 2 },
  tab:       { flex: 1, padding: '7px 8px', borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--gl-text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 },
  tabActive: { background: 'var(--gl-brand)', color: '#fff' },
  tabDot:    { width: 7, height: 7, borderRadius: '50%', background: 'var(--gl-fault)', flexShrink: 0 },
}

function SeccionItem({ sec, data, onChange }) {
  const fileRef = useRef()
  const estado  = data?.estado ?? null
  const nota    = data?.nota   ?? ''
  const preview = data?.preview ?? null

  const set = (patch) => onChange(sec.id, { ...data, ...patch })

  const [subiendo, setSubiendo] = useState(false)

  // T-06: comprimir la foto (JPEG ~800px, calidad 0.65) antes de subirla a Storage
  // y de embeberla en el PDF. Se guarda un Blob comprimido para el upload y el
  // dataURL como preview (sin URL.createObjectURL, que antes no se revocaba → fuga).
  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    try {
      const dataUrl = await comprimirFoto(file)
      const blob    = await (await fetch(dataUrl)).blob()
      set({ file: blob, preview: dataUrl })
    } catch (err) {
      logError('StepInspeccionROV/comprimir', err)
      // Fallback: usar el archivo original si la compresión falla.
      set({ file, preview: URL.createObjectURL(file) })
    } finally {
      setSubiendo(false)
    }
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
        <button type="button" style={s.fotoBtn} onClick={() => fileRef.current.click()} disabled={subiendo}>
          {preview ? <Camera size={14} /> : <ImagePlus size={14} />}
          {subiendo ? 'Comprimiendo…' : (preview ? 'Cambiar foto' : 'Tomar / subir foto')}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFile} />
      </div>
    </div>
  )
}

export default function StepInspeccionROV({ inspeccion, onChange, equipoPrincipal, equipoBackup }) {
  const { listas } = useAppConfig()
  const secciones  = listas.inspeccionRov
  const [activo, setActivo] = useState('principal')

  // inspeccion = { principal: {secId:{...}}, backup: {secId:{...}} }
  const datosEquipo = inspeccion[activo] ?? {}
  const completadas = secciones.filter(s => datosEquipo[s.id]?.estado).length

  const tieneAnomalia = (equipo) => {
    const d = inspeccion[equipo] ?? {}
    return secciones.some(s => d[s.id]?.estado === 'anomalia')
  }

  const handleChange = (id, data) =>
    onChange({ ...inspeccion, [activo]: { ...datosEquipo, [id]: data } })

  const tabLabel = (equipo, fallback, nombre) => (
    <button
      type="button"
      style={{ ...s.tab, ...(activo === equipo ? s.tabActive : {}) }}
      onClick={() => setActivo(equipo)}
    >
      {nombre?.trim() ? nombre.trim() : fallback}
      {tieneAnomalia(equipo) && <span style={s.tabDot} />}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={s.tabs}>
        {tabLabel('principal', 'Equipo principal', equipoPrincipal)}
        {tabLabel('backup', 'Equipo backup', equipoBackup)}
      </div>
      {secciones.map(sec => (
        <SeccionItem
          key={`${activo}-${sec.id}`}
          sec={sec}
          data={datosEquipo[sec.id]}
          onChange={handleChange}
        />
      ))}
      <p style={s.progress}>{completadas} de {secciones.length} secciones evaluadas · {activo === 'principal' ? 'equipo principal' : 'equipo backup'}</p>
    </div>
  )
}
