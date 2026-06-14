const s = {
  section:  { display: 'flex', flexDirection: 'column', gap: 12 },
  row:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  field:    { display: 'flex', flexDirection: 'column', gap: 4 },
  label:    { fontSize: 11, fontWeight: 600, color: 'var(--gl-text-secondary)' },
  input:    { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, color: 'var(--gl-text-primary)', fontSize: 13, padding: '8px 10px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
  textarea: { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, color: 'var(--gl-text-primary)', fontSize: 13, padding: '8px 10px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none', lineHeight: 1.5 },
}

export default function StepDatosGenerales({ datos, onChange, centroNombre }) {
  const set = (key, val) => onChange({ ...datos, [key]: val })

  return (
    <div style={s.section}>
      <div style={s.row}>
        <div style={s.field}>
          <label style={s.label}>Fecha</label>
          <input style={s.input} value={datos.fecha} onChange={e => set('fecha', e.target.value)} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Hora</label>
          <input style={s.input} value={datos.hora} onChange={e => set('hora', e.target.value)} />
        </div>
      </div>
      <div style={s.row}>
        <div style={s.field}>
          <label style={s.label}>Piloto que entrega</label>
          <input style={s.input} placeholder="Nombre del piloto" value={datos.piloto} onChange={e => set('piloto', e.target.value)} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Relevo</label>
          <input style={s.input} placeholder="Nombre del relevo" value={datos.relevo} onChange={e => set('relevo', e.target.value)} />
        </div>
      </div>
      <div style={s.row}>
        <div style={s.field}>
          <label style={s.label}>Equipo principal</label>
          <input style={s.input} placeholder="DTG3" value={datos.equipo} onChange={e => set('equipo', e.target.value)} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Equipo backup</label>
          <input style={s.input} placeholder="DTG4" value={datos.equipoBackup} onChange={e => set('equipoBackup', e.target.value)} />
        </div>
      </div>
      <div style={s.field}>
        <label style={s.label}>Centro</label>
        <input style={{ ...s.input, color: 'var(--gl-text-muted)' }} value={centroNombre} readOnly />
      </div>
      <div style={s.field}>
        <label style={s.label}>Observación general (opcional)</label>
        <textarea style={s.textarea} rows={3} placeholder="Novedades del turno..." value={datos.observacionGeneral} onChange={e => set('observacionGeneral', e.target.value)} />
      </div>
    </div>
  )
}
