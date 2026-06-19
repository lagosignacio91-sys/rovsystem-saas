import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { t } from '../../theme/tokens'

export default function ModalCambiarEstado({ isOpen, onClose, equipo, onCambiar }) {
  const [nuevoEstado,   setNuevoEstado]   = useState('conFalla')
  const [detallesFalla, setDetallesFalla] = useState('')
  const [cargando,      setCargando]      = useState(false)

  // Resetear estado cuando cambia el equipo o se abre
  useEffect(() => {
    if (isOpen && equipo) {
      // Default al estado opuesto del actual
      setNuevoEstado(equipo.estado === 'operativo' ? 'conFalla' : 'operativo')
      setDetallesFalla('')
    }
  }, [isOpen, equipo])

  if (!isOpen || !equipo) return null

  const handleCambiar = async () => {
    if (nuevoEstado === 'conFalla' && !detallesFalla.trim()) { alert('Debes describir la falla'); return }
    setCargando(true)
    try {
      await onCambiar(equipo.modelo, equipo.serial, nuevoEstado, detallesFalla.trim() || null)
      onClose()
    } catch (e) {
      console.error('Error:', e)
      alert('Error al cambiar estado')
    } finally {
      setCargando(false)
    }
  }

  const s = {
    overlay:  { position: 'fixed', inset: 0, background: t.scrim, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
    card:     { background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, width: '100%', maxWidth: 380, boxShadow: t.shadowLg },
    header:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${t.border}` },
    title:    { fontWeight: 700, fontSize: t.textBase, color: t.textPrimary },
    body:     { padding: 16, display: 'flex', flexDirection: 'column', gap: 14 },
    info:     { padding: '10px 12px', background: t.bgElevated, borderRadius: t.radiusMd, border: `1px solid ${t.border}` },
    label:    { display: 'block', fontSize: t.textSm, fontWeight: 600, color: t.textSecondary, marginBottom: 4 },
    input:    { width: '100%', padding: '8px 10px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textPrimary, fontSize: t.textSm, boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '8px 10px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textPrimary, fontSize: t.textSm, resize: 'vertical', boxSizing: 'border-box' },
    footer:   { display: 'flex', gap: 8 },
    btnCancel:{ flex: 1, padding: '8px 0', background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textSecondary, cursor: 'pointer', fontWeight: 600, fontSize: t.textSm },
    btnOk:    { flex: 1, padding: '8px 0', background: t.brand, border: 'none', borderRadius: t.radiusMd, color: t.textOnBrand, cursor: 'pointer', fontWeight: 700, fontSize: t.textSm },
    asterisk: { color: 'var(--gl-fault)' },
  }

  const disabled = cargando || (nuevoEstado === 'conFalla' && !detallesFalla.trim())

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.header}>
          <span style={s.title}>Cambiar Estado del Equipo</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted }}>
            <X size={18} />
          </button>
        </div>

        <div style={s.body}>
          <div style={s.info}>
            <div style={{ fontWeight: 700, fontSize: t.textSm, color: t.textPrimary }}>
              {equipo.modelo} — {equipo.serial}
            </div>
            <div style={{ fontSize: t.textXs, color: t.textMuted, marginTop: 2 }}>
              Estado actual: <span style={{ fontWeight: 600, color: equipo.estado === 'operativo' ? 'var(--gl-ok)' : 'var(--gl-fault)' }}>
                {equipo.estado === 'operativo' ? 'Operativo' : 'Con Falla'}
              </span>
            </div>
          </div>

          <div>
            <label style={s.label}>Nuevo Estado <span style={s.asterisk}>*</span></label>
            <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)} style={s.input}>
              <option value="operativo">✓ Operativo</option>
              <option value="conFalla">✗ Con Falla</option>
            </select>
          </div>

          {nuevoEstado === 'conFalla' && (
            <div>
              <label style={s.label}>Detalles de la falla <span style={s.asterisk}>*</span></label>
              <textarea
                value={detallesFalla}
                onChange={e => setDetallesFalla(e.target.value)}
                placeholder="Describe la falla encontrada..."
                rows={3}
                style={s.textarea}
              />
            </div>
          )}

          <div style={s.footer}>
            <button onClick={onClose} disabled={cargando} style={s.btnCancel}>Cancelar</button>
            <button onClick={handleCambiar} disabled={disabled} style={{ ...s.btnOk, opacity: disabled ? 0.5 : 1 }}>
              {cargando ? 'Guardando...' : 'Cambiar Estado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
