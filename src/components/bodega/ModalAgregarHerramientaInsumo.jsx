import { logError } from '../../lib/logger'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { t } from '../../theme/tokens'

export default function ModalAgregarHerramientaInsumo({ isOpen, onClose, onAgregar }) {
  const [nombre,   setNombre]   = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [categoria, setCategoria] = useState('')
  const [stockMinimo, setStockMinimo] = useState('3')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (isOpen) { setNombre(''); setCantidad('1'); setCategoria(''); setStockMinimo('3') }
  }, [isOpen])

  if (!isOpen) return null

  const handleAgregar = async () => {
    if (!nombre.trim() || !categoria) { alert('Nombre y categoría son obligatorios'); return }
    const cant = parseInt(cantidad)
    if (isNaN(cant) || cant < 0) { alert('La cantidad debe ser un número válido'); return }
    const min = parseInt(stockMinimo)
    if (isNaN(min) || min < 0) { alert('El stock mínimo debe ser un número válido'); return }
    setCargando(true)
    try {
      await onAgregar(nombre.trim(), cant, categoria, min)
      onClose()
    } catch (e) {
      logError('ModalAgregarHI', e)
      alert(e.message || 'Error al agregar item')
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
    label:    { display: 'block', fontSize: t.textSm, fontWeight: 600, color: t.textSecondary, marginBottom: 4 },
    input:    { width: '100%', padding: '8px 10px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textPrimary, fontSize: t.textSm, boxSizing: 'border-box' },
    footer:   { display: 'flex', gap: 8 },
    btnCancel:{ flex: 1, padding: '8px 0', background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textSecondary, cursor: 'pointer', fontWeight: 600, fontSize: t.textSm },
    btnOk:    { flex: 1, padding: '8px 0', background: t.brand, border: 'none', borderRadius: t.radiusMd, color: t.textOnBrand, cursor: 'pointer', fontWeight: 700, fontSize: t.textSm },
    asterisk: { color: 'var(--gl-fault)' },
  }

  const disabled = cargando || !nombre.trim() || !categoria

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.header}>
          <span style={s.title}>Agregar Herramienta / Insumo</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted }}>
            <X size={18} />
          </button>
        </div>

        <div style={s.body}>
          <div>
            <label style={s.label}>Nombre <span style={s.asterisk}>*</span></label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="ej: Llave Allen, Fusibles 5A" style={s.input} />
          </div>

          <div>
            <label style={s.label}>Cantidad <span style={s.asterisk}>*</span></label>
            <input type="number" min="0" value={cantidad} onChange={e => setCantidad(e.target.value)} style={s.input} />
          </div>

          <div>
            <label style={s.label}>Categoría <span style={s.asterisk}>*</span></label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)} style={s.input}>
              <option value="">Selecciona categoría...</option>
              <option value="herramientas_reparacion">Herramientas de reparación</option>
              <option value="consumibles">Consumibles</option>
              <option value="electricidad">Electricidad</option>
              <option value="limpieza">Limpieza</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label style={s.label}>Stock mínimo (alerta)</label>
            <input type="number" min="0" value={stockMinimo} onChange={e => setStockMinimo(e.target.value)} style={s.input} />
            <p style={{ fontSize: t.textXs, color: t.textMuted, marginTop: 4 }}>
              El estado (Disponible / Bajo stock / Agotado) se calcula solo según la cantidad.
            </p>
          </div>

          <div style={s.footer}>
            <button onClick={onClose} disabled={cargando} style={s.btnCancel}>Cancelar</button>
            <button onClick={handleAgregar} disabled={disabled} style={{ ...s.btnOk, opacity: disabled ? 0.5 : 1 }}>
              {cargando ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
