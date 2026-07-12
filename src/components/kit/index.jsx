/* ============================================================
   GL Kit — componentes base del design system.
   Todos respetan tema claro/oscuro vía CSS variables (theme.css).
   Import: import { Button, Input, Card, Modal, Badge } from '../kit'
   ============================================================ */
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { t, ESTADO_META } from '../../theme/tokens'

/* ---------- Button ---------- */
export function Button({ variant = 'primary', size = 'md', icon: Icon, children, className = '', ...props }) {
  return (
    <button className={`gl-btn gl-btn--${variant} gl-btn--${size} ${className}`} {...props}>
      {Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2.2} />}
      {children}
    </button>
  )
}

/* ---------- IconButton ---------- */
export function IconButton({ icon: Icon, label, size = 18, className = '', ...props }) {
  return (
    <button className={`gl-icon-btn ${className}`} aria-label={label} title={label} {...props}>
      <Icon size={size} strokeWidth={2} />
    </button>
  )
}

/* ---------- Input ---------- */
export function Input({ size = 'md', className = '', ...props }) {
  return <input className={`gl-input ${size === 'sm' ? 'gl-input--sm' : ''} ${className}`} {...props} />
}

/* ---------- Select ---------- */
export function Select({ size = 'md', className = '', children, ...props }) {
  return (
    <select className={`gl-input ${size === 'sm' ? 'gl-input--sm' : ''} ${className}`} {...props}>
      {children}
    </select>
  )
}

/* ---------- Field (label + control) ---------- */
export function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: t.space2 }}>
      <span style={{ color: t.textSecondary, fontSize: t.textSm, fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  )
}

/* ---------- Card ---------- */
export function Card({ children, className = '', style, ...props }) {
  return (
    <div className={`gl-card ${className}`} style={style} {...props}>
      {children}
    </div>
  )
}

/* ---------- Badge ---------- */
export function Badge({ children, color = t.brand, tint = t.brandTint, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: tint, color, fontSize: t.textXs, fontWeight: 600,
      padding: '3px 9px', borderRadius: t.radiusFull, lineHeight: 1.4,
      ...style,
    }}>
      {children}
    </span>
  )
}

/* ---------- EstadoBadge (estado de centro) ---------- */
// `tieneFaltante`: punto amarillo independiente del color base, para no tapar una
// falla de equipo (rojo) con la falta de stock (amarillo) — se muestran juntos.
export function EstadoBadge({ estado, tieneFaltante = false, style }) {
  const meta = ESTADO_META[estado] ?? { color: t.textMuted, tint: 'transparent', label: estado }
  return (
    <span style={{
      position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6,
      background: meta.tint, color: meta.color, fontSize: t.textXs, fontWeight: 600,
      padding: '3px 10px', borderRadius: t.radiusFull, lineHeight: 1.5,
      border: `1px solid ${meta.color}33`, letterSpacing: '0.01em', ...style,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
      {meta.label}
      {tieneFaltante && (
        <span style={{
          position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%',
          background: ESTADO_META.LOW_STOCK.dot, border: '1.5px solid var(--gl-bg-elevated)',
        }} />
      )}
    </span>
  )
}

/* ---------- Spinner ---------- */
export function Spinner({ size = 18, color = t.brandSoft }) {
  return <Loader2 size={size} color={color} className="gl-spin" strokeWidth={2.4} />
}

/* ---------- Modal ---------- */
export function Modal({ open = true, onClose, title, children, footer, maxWidth = 420 }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}
          style={{
            position: 'fixed', inset: 0, background: t.scrim, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: t.space4,
          }}
        >
          <motion.div
            key="modal-box"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            role="dialog" aria-modal="true" aria-label={title}
            className="gl-card gl-glass"
            style={{ width: '100%', maxWidth, maxHeight: '90dvh', display: 'flex', flexDirection: 'column', boxShadow: t.shadowLg, overflow: 'hidden', borderRadius: t.radiusLg }}
          >
            {title && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
                padding: `${t.space4} ${t.space5}`, borderBottom: `1px solid ${t.border}`,
              }}>
                <h3 style={{ margin: 0, fontSize: t.textLg, fontWeight: 700, color: t.textPrimary }}>{title}</h3>
                <IconButton icon={X} label="Cerrar" onClick={onClose} />
              </div>
            )}
            <div style={{ padding: t.space5, overflowY: 'auto', flex: 1 }}>{children}</div>
            {footer && (
              <div style={{ display: 'flex', gap: t.space3, padding: `0 ${t.space5} ${t.space5}`, flexShrink: 0, paddingTop: t.space4 }}>{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
