// ============================================================
// Defaults de configuración de la app (Fase admin / personalización).
//
// La config editable por el admin vive en Firestore (config/app) y SOLO
// guarda datos serializables: orden, ocultos y etiquetas por `id`.
// Los íconos y componentes NO se guardan en Firestore — viven aquí en
// código, indexados por `id`. Si la config no existe o le falta un id,
// se cae a estos defaults y la app nunca queda rota.
// ============================================================
import { UserCog, Ship, Layers, Package, ClipboardCheck, BookOpen, Map, Building2, Users, Warehouse } from 'lucide-react'

// ---- Pestañas del panel de centro ----
export const TABS_DEFAULT = [
  { id: 'operator',   label: 'Operador' },
  { id: 'rov',        label: 'ROV' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'despacho',   label: 'Despacho' },
  { id: 'turno',      label: 'Turno' },
  { id: 'bitacora',   label: 'Bitácora' },
]

export const ICONOS_TAB = {
  operator:   UserCog,
  rov:        Ship,
  inventario: Layers,
  despacho:   Package,
  turno:      ClipboardCheck,
  bitacora:   BookOpen,
}

// ---- Menú principal (sidebar + bottom-nav) ----
// `id` = ruta. `to`, `end`, `badgeKey` son propiedades de código (no editables).
export const NAV_DEFAULT = [
  { id: '/',                  label: 'Mapa' },
  { id: '/centros',           label: 'Centros' },
  { id: '/despachos',         label: 'Despachos' },
  { id: '/operadores',        label: 'Operadores' },
  { id: '/bitacoras',         label: 'Bitácoras' },
  { id: '/turnos',            label: 'Turnos' },
  { id: '/bodega-virtual',    label: 'Bodega' },
]

// `roles` = qué roles ven el ítem en el menú. Si falta, lo ven todos.
// Gestión (centros/operadores) solo admin y taller; el operador entra a su centro por el mapa.
export const NAV_META = {
  '/':           { to: '/',           icon: Map,       end: true },
  '/centros':         { to: '/centros',         icon: Building2,    roles: ['admin', 'supervisor'] },
  '/despachos':       { to: '/despachos',       icon: Package,      badgeKey: 'despachos' },
  '/operadores':      { to: '/operadores',      icon: Users,        roles: ['admin', 'supervisor'] },
  '/bitacoras':       { to: '/bitacoras',       icon: BookOpen },
  '/turnos':          { to: '/turnos',          icon: ClipboardCheck },
  '/bodega-virtual':  { to: '/bodega-virtual',  icon: Warehouse,    roles: ['supervisor'] },
}

// ---- Marca ----
export const BRANDING_DEFAULT = {
  appName:     'GL App',
  brandColor:  '',          // vacío = usa el color del tema (--gl-brand)
  logoDataUrl: '',          // vacío = usa /logo.png
}

// ---- Listas editables (Fase 3) ----
// Secciones de inspección ROV del wizard de entrega de turno.
export const INSPECCION_ROV_DEFAULT = [
  { id: 'pines_pod',         label: 'Pines sensor POD' },
  { id: 'pines_umbilical',   label: 'Pines umbilical' },
  { id: 'pines_carga',       label: 'Pines de carga' },
  { id: 'pines_grabber',     label: 'Pines Grabber' },
  { id: 'conectores',        label: 'Conectores sensor y umbilical' },
  { id: 'rov_controlador',   label: 'ROV y controlador' },
  { id: 'caja_herramientas', label: 'Caja de herramientas' },
]

export const LISTAS_DEFAULT = {
  inspeccionRov: INSPECCION_ROV_DEFAULT,
}

// ---- Campos del operador (Fase 4) ----
// Campos reordenables/ocultables de la tarjeta de operador. `nombre` queda
// siempre fijo en la cabecera, no se configura aquí.
export const CAMPOS_OPERADOR_DEFAULT = [
  { id: 'rut',            label: 'RUT' },
  { id: 'telefono',       label: 'Teléfono' },
  { id: 'correoPersonal', label: 'Correo personal' },
  { id: 'correoCorp',     label: 'Correo corporativo' },
  { id: 'ingresoTurno',   label: 'Ingreso a turno' },
  { id: 'salidaTurno',    label: 'Salida de turno' },
]

// Tipo de input por campo (no serializable; vive en código).
export const TIPOS_OPERADOR = {
  rut: 'text', telefono: 'text', correoPersonal: 'email',
  correoCorp: 'email', ingresoTurno: 'date', salidaTurno: 'date',
}

// ---- Permisos por pestaña y rol (Fase 5) ----
// Niveles: 'edit' (ver y editar) · 'view' (solo lectura) · 'hidden' (no ve la pestaña).
// Default vacío = todo 'edit' para todos. El helper resuelve a 'edit' si falta.
export const NIVELES_PERMISO = ['edit', 'view', 'hidden']
export const NIVEL_LABEL = { edit: 'Editar', view: 'Solo ver', hidden: 'Oculto' }
export const PERMISOS_DEFAULT = {}

export function nivelPermiso(permisos, tabId, role) {
  if (role === 'admin') {
    // El admin nunca se auto-bloquea por completo; respeta 'view' pero no 'hidden'.
    const n = permisos?.[tabId]?.admin
    return n === 'view' ? 'view' : 'edit'
  }
  return permisos?.[tabId]?.[role] ?? 'edit'
}

// Genera un id estable a partir de un texto libre (para items nuevos de listas).
export function generarId(texto) {
  return (
    (texto || 'item').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30) + '_' + Date.now().toString(36)
  )
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
