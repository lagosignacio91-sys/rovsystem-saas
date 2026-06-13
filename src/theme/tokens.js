/* Tokens accesibles desde estilos inline en JS.
   Todos apuntan a las CSS variables definidas en theme.css,
   por lo que respetan el tema claro/oscuro automáticamente. */

export const t = {
  // Superficies
  bgBase:     'var(--gl-bg-base)',
  bgSurface:  'var(--gl-bg-surface)',
  bgElevated: 'var(--gl-bg-elevated)',
  bgInput:    'var(--gl-bg-input)',
  bgHover:    'var(--gl-bg-hover)',

  // Bordes
  border:       'var(--gl-border)',
  borderStrong: 'var(--gl-border-strong)',

  // Texto
  textPrimary:   'var(--gl-text-primary)',
  textSecondary: 'var(--gl-text-secondary)',
  textMuted:     'var(--gl-text-muted)',
  textOnBrand:   'var(--gl-text-on-brand)',

  // Marca
  brand:       'var(--gl-brand)',
  brandStrong: 'var(--gl-brand-strong)',
  brandSoft:   'var(--gl-brand-soft)',
  brandTint:   'var(--gl-brand-tint)',

  // Estados
  ok:       'var(--gl-ok)',
  low:      'var(--gl-low)',
  fault:    'var(--gl-fault)',
  dispatch: 'var(--gl-dispatch)',
  noop:     'var(--gl-noop)',
  okTint:       'var(--gl-ok-tint)',
  lowTint:      'var(--gl-low-tint)',
  faultTint:    'var(--gl-fault-tint)',
  dispatchTint: 'var(--gl-dispatch-tint)',

  // Sombras / scrim
  shadowSm: 'var(--gl-shadow-sm)',
  shadowMd: 'var(--gl-shadow-md)',
  shadowLg: 'var(--gl-shadow-lg)',
  scrim:    'var(--gl-scrim)',

  // Espaciado
  space1: 'var(--gl-space-1)', space2: 'var(--gl-space-2)', space3: 'var(--gl-space-3)',
  space4: 'var(--gl-space-4)', space5: 'var(--gl-space-5)', space6: 'var(--gl-space-6)',
  space8: 'var(--gl-space-8)',

  // Radios
  radiusSm: 'var(--gl-radius-sm)', radiusMd: 'var(--gl-radius-md)',
  radiusLg: 'var(--gl-radius-lg)', radiusXl: 'var(--gl-radius-xl)',
  radiusFull: 'var(--gl-radius-full)',

  // Tipografía
  textXs: 'var(--gl-text-xs)', textSm: 'var(--gl-text-sm)', textBase: 'var(--gl-text-base)',
  textLg: 'var(--gl-text-lg)', textXl: 'var(--gl-text-xl)',

  // Motion
  ease: 'var(--gl-ease)', durFast: 'var(--gl-dur-fast)', dur: 'var(--gl-dur)', durSlow: 'var(--gl-dur-slow)',
}

// Estado de centro -> color y etiqueta. Fuente única para mapa y panel.
export const ESTADO_META = {
  OK:              { color: t.ok,       tint: t.okTint,       dot: '#22c55e', label: 'Operativo',          icon: 'check' },
  LOW_STOCK:       { color: t.low,      tint: t.lowTint,      dot: '#eab308', label: 'Stock bajo',         icon: 'alert-triangle' },
  EQUIPMENT_FAULT: { color: t.fault,    tint: t.faultTint,    dot: '#ef4444', label: 'Falla de equipo',    icon: 'alert-octagon' },
  DISPATCH_ONWAY:  { color: t.dispatch, tint: t.dispatchTint, dot: '#3b82f6', label: 'Despacho en camino', icon: 'truck' },
  NO_OPERATOR:     { color: t.noop,     tint: 'transparent',  dot: '#6b7280', label: 'Sin operador',       icon: 'user-off' },
}
