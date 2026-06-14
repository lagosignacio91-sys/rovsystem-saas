// ============================================================
// Defaults de configuración de la app (Fase admin / personalización).
//
// La config editable por el admin vive en Firestore (config/app) y SOLO
// guarda datos serializables: orden, ocultos y etiquetas por `id`.
// Los íconos y componentes NO se guardan en Firestore — viven aquí en
// código, indexados por `id`. Si la config no existe o le falta un id,
// se cae a estos defaults y la app nunca queda rota.
// ============================================================
import { UserCog, Ship, Wrench, Box, Package, ClipboardCheck, Map, Building2, Users } from 'lucide-react'

// ---- Pestañas del panel de centro ----
export const TABS_DEFAULT = [
  { id: 'operator', label: 'Operador' },
  { id: 'rov',      label: 'ROV' },
  { id: 'tools',    label: 'Herram.' },
  { id: 'supplies', label: 'Insumos' },
  { id: 'despacho', label: 'Despacho' },
  { id: 'turno',    label: 'Turno' },
]

export const ICONOS_TAB = {
  operator: UserCog,
  rov:      Ship,
  tools:    Wrench,
  supplies: Box,
  despacho: Package,
  turno:    ClipboardCheck,
}

// ---- Menú principal (sidebar + bottom-nav) ----
// `id` = ruta. `to`, `end`, `badgeKey` son propiedades de código (no editables).
export const NAV_DEFAULT = [
  { id: '/',           label: 'Mapa' },
  { id: '/centros',    label: 'Centros' },
  { id: '/despachos',  label: 'Despachos' },
  { id: '/operadores', label: 'Operadores' },
]

export const NAV_META = {
  '/':           { to: '/',           icon: Map,       end: true },
  '/centros':    { to: '/centros',    icon: Building2 },
  '/despachos':  { to: '/despachos',  icon: Package, badgeKey: 'despachos' },
  '/operadores': { to: '/operadores', icon: Users },
}

// ---- Marca ----
export const BRANDING_DEFAULT = {
  appName:     'GL App',
  brandColor:  '',          // vacío = usa el color del tema (--gl-brand)
  logoDataUrl: '',          // vacío = usa /logo.png
}

// ============================================================
// Helper: combina los defaults (código) con los overrides (Firestore).
// Devuelve un array de items { id, label, hidden, order } ordenado por
// `order`. Conserva ids nuevos del código aunque la config sea vieja, y
// descarta overrides de ids que ya no existen.
// ============================================================
export function resolverLista(defaults, overrides) {
  const mapa = Object.fromEntries((overrides ?? []).map((o) => [o.id, o]))
  return defaults
    .map((def, i) => {
      const ov = mapa[def.id] ?? {}
      return {
        id: def.id,
        label: ov.label ?? def.label,
        hidden: ov.hidden ?? false,
        order: typeof ov.order === 'number' ? ov.order : i,
      }
    })
    .sort((a, b) => a.order - b.order)
}
