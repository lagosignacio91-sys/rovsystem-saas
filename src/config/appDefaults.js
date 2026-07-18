// ============================================================
// Defaults de configuración de la app (Fase admin / personalización).
//
// La config editable por el admin vive en Firestore (config/app) y SOLO
// guarda datos serializables: orden, ocultos y etiquetas por `id`.
// Los íconos y componentes NO se guardan en Firestore — viven aquí en
// código, indexados por `id`. Si la config no existe o le falta un id,
// se cae a estos defaults y la app nunca queda rota.
// ============================================================
import { UserCog, Ship, Layers, Package, ClipboardCheck, BookOpen, Map, Building2, Users, Warehouse, BarChart2 } from 'lucide-react'

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
  { id: '/bodega-admin',      label: 'Bodega' },
  { id: '/reportes',          label: 'Reportes' },
]

// `roles` = qué roles ven el ítem en el menú. Si falta, lo ven todos.
// Gestión (centros/operadores) solo admin y taller; el operador entra a su centro por el mapa.
export const NAV_META = {
  '/':           { to: '/',           icon: Map,       end: true },
  '/centros':         { to: '/centros',         icon: Building2,    roles: ['admin', 'supervisor'], badgeKey: 'centros' },
  // Apertura solo ve el Mapa (crea/opera su centro actual desde ahí); se excluye de despachos/turnos.
  '/despachos':       { to: '/despachos',       icon: Package,      roles: ['admin', 'supervisor', 'operador', 'owner', 'ventas'], badgeKey: 'despachos' },
  '/operadores':      { to: '/operadores',      icon: Users,        roles: ['admin', 'supervisor'] },
  '/bitacoras':       { to: '/bitacoras',       icon: BookOpen,    roles: ['admin', 'operador', 'owner', 'ventas'] },
  '/turnos':          { to: '/turnos',          icon: ClipboardCheck, roles: ['admin', 'supervisor', 'operador', 'owner', 'ventas'] },
  '/bodega-virtual':  { to: '/bodega-virtual',  icon: Warehouse,    roles: ['supervisor'] },
  '/bodega-admin':    { to: '/bodega-admin',    icon: Warehouse,    roles: ['admin'] },
  '/reportes':        { to: '/reportes',        icon: BarChart2,    roles: ['admin', 'supervisor'] },
}

// ---- Marca ----
export const BRANDING_DEFAULT = {
  appName:     'RovSystem',
  brandColor:  '',          // vacío = usa el color del tema (--gl-brand)
  logoDataUrl: '',          // vacío = usa /logo.png
  whatsappContacto: '',     // número de contacto comercial (ej: 56912345678) para la pantalla de contratar móvil
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

// Herramientas básicas que debe tener cada equipo (Principal y Backup) en su
// juego propio. Lista fija, igual para todos los centros — no editable desde la app.
export const HERRAMIENTAS_BASICAS_DEFAULT = [
  { id: 'rost_off',              label: 'Rost-Off' },
  { id: 'limpia_contactos',      label: 'Limpia contactos' },
  { id: 'cotones',               label: 'Cotones' },
  { id: 'amarras_plasticas',     label: 'Amarras plásticas' },
  { id: 'grasa_dielectrica',     label: 'Grasa dieléctrica' },
  { id: 'destornillador_cruz',   label: 'Destornillador de cruz' },
  { id: 'destornillador_paleta', label: 'Destornillador de paleta' },
  { id: 'corta_cable',           label: 'Corta cable' },
  { id: 'alicate',               label: 'Alicate' },
  { id: 'cepillo',               label: 'Cepillo' },
  { id: 'cable_prueba',          label: 'Cable prueba' },
  { id: 'cartonero',             label: 'Cartonero' },
  { id: 'cinta_aislante',        label: 'Cinta aislante' },
]

export const LISTAS_DEFAULT = {
  inspeccionRov: INSPECCION_ROV_DEFAULT,
}

// ---- Campos del operador (Fase 4) ----
// Campos reordenables/ocultables de la tarjeta de operador. `nombre` queda
// siempre fijo en la cabecera, no se configura aquí.
// S-03: `rut` y `correoPersonal` se quitaron de la tarjeta del panel porque ese
// roster (centros/{id}/datos/operadores) es de lectura amplia. Esos datos
// personales se gestionan y ven solo en la página Operadores (colección /usuarios,
// con acceso restringido). Aquí quedan solo los canales de contacto corporativos.
export const CAMPOS_OPERADOR_DEFAULT = [
  { id: 'telefono',       label: 'Teléfono' },
  { id: 'correoCorp',     label: 'Correo corporativo' },
]

// Tipo de input por campo (no serializable; vive en código).
export const TIPOS_OPERADOR = {
  telefono: 'text',
  correoCorp: 'email',
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
