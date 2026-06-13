/* ============================================================
   GL Kit — componentes base del design system.
   Todos respetan tema claro/oscuro vía CSS variables (theme.css).
   Import: import { Button, Input, Card, Modal, Badge } from '../kit'
   ============================================================ */
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
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
export function EstadoBadge({ estado, style }) {
  const meta = ESTADO_META[estado] ?? { color: t.textMuted, tint: 'transparent', label: estado }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: meta.tint, color: meta.color, fontSize: t.textXs, fontWeight: 600,
      padding: '3px 10px', borderRadius: t.radiusFull, lineHeight: 1.5, ...style,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color }} />
      {meta.label}
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

  if (!open) return null

  return createPortal(
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}
      style={{
        position: 'fixed', inset: 0, background: t.scrim, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: t.space4,
        animation: 'fadeIn 0.18s ease-out',
      }}
    >
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className="gl-card"
        style={{
          width: '100%', maxWidth, boxShadow: t.shadowLg, overflow: 'hidden',
          animation: 'modalIn 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: `${t.space4} ${t.space5}`, borderBottom: `1px solid ${t.border}`,
          }}>
            <h3 style={{ margin: 0, fontSize: t.textLg, fontWeight: 700, color: t.textPrimary }}>{title}</h3>
            <IconButton icon={X} label="Cerrar" onClick={onClose} />
          </div>
        )}
        <div style={{ padding: t.space5 }}>{children}</div>
        {footer && (
          <div style={{ display: 'flex', gap: t.space3, padding: `0 ${t.space5} ${t.space5}` }}>{footer}</div>
        )}
      </div>
    </div>,
    document.body
  )
}
