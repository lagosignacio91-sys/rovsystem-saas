import { Smartphone, MessageCircle, Monitor, LogOut } from 'lucide-react'
import { t } from '../../theme/tokens'

// Pantalla que ve un usuario SIN acceso móvil cuando abre la app en un teléfono.
// Invita a contratar el módulo móvil vía WhatsApp. En computador la app funciona normal.
export default function MobileUpsell({ branding = {}, nombre, correo, onSignOut }) {
  const numero = (branding.whatsappContacto || '').replace(/\D/g, '')
  const mensaje = encodeURIComponent(
    `Hola, soy ${nombre || 'un usuario'}${correo ? ` (${correo})` : ''}. ` +
    `Quiero activar la versión móvil de RovSystem para mi usuario.`
  )
  const waLink = numero ? `https://wa.me/${numero}?text=${mensaje}` : null

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 22, padding: '32px 24px', background: t.bgBase, textAlign: 'center',
      paddingTop: 'calc(32px + env(safe-area-inset-top, 0px))',
      paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
    }}>
      {/* Símbolo HyperionX (transparente, sobre fondo oscuro) */}
      <div style={{ width: 150 }}>
        <img src="/hyperionx-symbol.png" alt="HyperionX" style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }}
          onError={(e) => { e.currentTarget.src = '/logo.png' }} />
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: t.brandTint, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
          <Smartphone size={30} color={t.brandSoft} />
        </div>
      </div>

      <div>
        <h1 className="gl-display" style={{ fontSize: 22, fontWeight: 700, color: t.textPrimary, margin: '0 0 8px' }}>
          Versión móvil no incluida
        </h1>
        <p style={{ fontSize: t.textSm, color: t.textSecondary, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
          Tu plan actual no contempla el acceso desde teléfono. Activa la <b style={{ color: t.textPrimary }}>versión móvil</b> de RovSystem para trabajar en terreno desde tu celular.
        </p>
      </div>

      {/* CTA WhatsApp */}
      {waLink ? (
        <a href={waLink} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none',
            background: '#25D366', color: '#06240f', fontWeight: 700, fontSize: t.textBase,
            padding: '14px 24px', borderRadius: t.radiusFull, boxShadow: '0 6px 20px rgba(37,211,102,0.35)',
            minHeight: 48,
          }}>
          <MessageCircle size={20} /> Activar por WhatsApp
        </a>
      ) : (
        <a href={`mailto:contacto@hyperionx.tech?subject=${encodeURIComponent('Activar versión móvil RovSystem')}&body=${mensaje}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none',
            background: t.brand, color: '#fff', fontWeight: 700, fontSize: t.textBase,
            padding: '14px 24px', borderRadius: t.radiusFull, boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
            minHeight: 48,
          }}>
          <MessageCircle size={20} /> Escribir a HyperionX
        </a>
      )}

      {/* Recordatorio: en computador sí funciona */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: t.textXs, color: t.textMuted, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '10px 14px', maxWidth: 320 }}>
        <Monitor size={15} style={{ flexShrink: 0 }} />
        <span>Mientras tanto, puedes seguir usando RovSystem normalmente desde un computador.</span>
      </div>

      <button onClick={onSignOut}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: t.textMuted, fontSize: t.textSm, cursor: 'pointer', padding: 10, minHeight: 44 }}>
        <LogOut size={15} /> Cerrar sesión
      </button>

      <div style={{ fontSize: 10, color: t.textMuted, opacity: 0.7, letterSpacing: '0.04em' }}>
        RovSystem · Powered by HyperionX
      </div>
    </div>
  )
}
