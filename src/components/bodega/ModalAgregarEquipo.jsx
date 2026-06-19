import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { t } from '../../theme/tokens'

export default function ModalAgregarEquipo({ isOpen, onClose, onAgregar, modelos, modeloDefault = null }) {
  const [modelo,       setModelo]       = useState('')
  const [serial,       setSerial]       = useState('')
  const [estado,       setEstado]       = useState('operativo')
  const [detallesFalla, setDetallesFalla] = useState('')
  const [cargando,     setCargando]     = useState(false)

  // Usar modeloDefault si se abre desde una fila de modelo específico
  useEffect(() => {
    if (isOpen) {
      setModelo(modeloDefault || '')
      setSerial('')
      setEstado('operativo')
      setDetallesFalla('')
    }
  }, [isOpen, modeloDefault])

  if (!isOpen) return null

  const handleAgregar = async () => {
    if (!modelo || !serial.trim()) { alert('Modelo y serial son obligatorios'); return }
    if (estado === 'conFalla' && !detallesFalla.trim()) { alert('Si el equipo tiene falla, debes describir el detalle'); return }
    setCargando(true)
    try {
      await onAgregar(modelo, serial.trim(), estado, detallesFalla.trim() || null)
      onClose()
    } catch (e) {
      console.error('Error:', e)
      alert('Error al agregar equipo')
    } finally {
      setCargando(false)
    }
  }

  const s = {
    overlay:  { position: 'fixed', inset: 0, background: t.scrim, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
    card:     { background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, width: '100%', maxWidth: 400, boxShadow: t.shadowLg },
    header:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${t.border}` },
    title:    { fontWeight: 700, fontSize: t.textBase, color: t.textPrimary },
    body:     { padding: 16, display: 'flex', flexDirection: 'column', gap: 14 },
    label:    { display: 'block', fontSize: t.textSm, fontWeight: 600, color: t.textSecondary, marginBottom: 4 },
    input:    { width: '100%', padding: '8px 10px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textPrimary, fontSize: t.textSm, boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '8px 10px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textPrimary, fontSize: t.textSm, resize: 'vertical', boxSizing: 'border-box' },
    footer:   { display: 'flex', gap: 8 },
    btnCancel:{ flex: 1, padding: '8px 0', background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textSecondary, cursor: 'pointer', fontWeight: 600, fontSize: t.textSm },
    btnOk:    { flex: 1, padding: '8px 0', background: t.brand, border: 'none', borderRadius: t.radiusMd, color: t.textOnBrand, cursor: 'pointer', fontWeight: 700, fontSize: t.textSm },
    asterisk: { color: 'var(--gl-fault)' },
  }

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.header}>
          <span style={s.title}>Agregar Nuevo Equipo</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted }}>
            <X size={18} />
          </button>
        </div>

        <div style={s.body}>
          <div>
            <label style={s.label}>Modelo <span style={s.asterisk}>*</span></label>
            <select value={modelo} onChange={e => setModelo(e.target.value)} style={s.input}>
              <option value="">Selecciona modelo...</option>
              {modelos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label style={s.label}>Serial / ID <span style={s.asterisk}>*</span></label>
            <input
              type="text"
              value={serial}
              onChange={e => setSerial(e.target.value)}
              placeholder="ej: DTG3-001"
              style={s.input}
            />
          </div>

          <div>
            <label style={s.label}>Estado inicial <span style={s.asterisk}>*</span></label>
            <select value={estado} onChange={e => setEstado(e.target.value)} style={s.input}>
              <option value="operativo">Operativo</option>
              <option value="conFalla">Con Falla</option>
            </select>
          </div>

          {estado === 'conFalla' && (
            <div>
              <label style={s.label}>Detalles de la falla <span style={s.asterisk}>*</span></label>
              <textarea
                value={detallesFalla}
                onChange={e => setDetallesFalla(e.target.value)}
                placeholder="ej: motor lento, conectores dañados"
                rows={3}
                style={s.textarea}
              />
            </div>
          )}

          <div style={s.footer}>
            <button onClick={onClose} disabled={cargando} style={s.btnCancel}>Cancelar</button>
            <button
              onClick={handleAgregar}
              disabled={cargando || !modelo || !serial.trim()}
              style={{ ...s.btnOk, opacity: (cargando || !modelo || !serial.trim()) ? 0.5 : 1 }}
            >
              {cargando ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
