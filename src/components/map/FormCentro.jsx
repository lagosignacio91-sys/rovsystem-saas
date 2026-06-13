import { useState } from 'react'

const ESTADOS = [
  { value: 'OK',              label: '🟢 OK' },
  { value: 'LOW_STOCK',       label: '🟡 Stock bajo' },
  { value: 'EQUIPMENT_FAULT', label: '🔴 Falla de equipo' },
  { value: 'DISPATCH_ONWAY',  label: '🔵 Despacho en camino' },
  { value: 'NO_OPERATOR',     label: '⚫ Sin operador' },
]

export default function FormCentro({ latlng, onGuardar, onCancelar, cargando, empresaActiva }) {
  const [nombre, setNombre] = useState('')
  const [estado, setEstado] = useState('OK')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    onGuardar({
      nombre,
      estado,
      lat: latlng.lat,
      lng: latlng.lng,
      empresaId:     empresaActiva?.id   ?? null,
      empresaNombre: empresaActiva?.nombre ?? 'Sin empresa',
    })
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.titulo}>Nuevo Centro de Trabajo</h2>
        {empresaActiva && (
          <p style={styles.empresa}>🏢 {empresaActiva.nombre}</p>
        )}
        <p style={styles.coords}>
          📍 {latlng.lat.toFixed(5)}, {latlng.lng.toFixed(5)}
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Nombre del centro</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Centro Melinka Norte"
            required
            style={styles.input}
            autoFocus
          />

          <label style={styles.label}>Estado inicial</label>
          <select
            value={estado}
            onChange={e => setEstado(e.target.value)}
            style={styles.select}
          >
            {ESTADOS.map(e => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>

          <div style={styles.botones}>
            <button type="button" onClick={onCancelar} style={styles.btnCancelar}>Cancelar</button>
            <button type="submit" disabled={cargando}  style={styles.btnGuardar}>
              {cargando ? 'Guardando...' : 'Guardar centro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal:      { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' },
  titulo:     { color: '#f1f5f9', fontSize: '18px', fontWeight: '700', marginBottom: '4px' },
  empresa:    { color: '#3b82f6', fontSize: '13px', marginBottom: '4px' },
  coords:     { color: '#64748b', fontSize: '13px', marginBottom: '24px' },
  form:       { display: 'flex', flexDirection: 'column', gap: '8px' },
  label:      { color: '#94a3b8', fontSize: '13px', fontWeight: '500', marginTop: '8px' },
  input:      { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '15px', padding: '10px 14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  select:     { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '15px', padding: '10px 14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  botones:    { display: 'flex', gap: '12px', marginTop: '24px' },
  btnCancelar:{ flex: 1, background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px' },
  btnGuardar: { flex: 1, background: '#2563eb', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
}