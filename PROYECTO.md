# GL App — Documentación del Proyecto

> Robótica Submarina Aysén · Estado al 14 jun 2026

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite |
| Routing | react-router-dom v6 |
| Mapa | react-leaflet + OpenStreetMap + OpenSeaMap |
| Backend / DB | Firebase Auth + Firestore |
| Deploy | Vercel (CI/CD automático desde `main`) |
| Estilos | CSS variables propias (no Tailwind, no MUI) |
| Iconos | lucide-react |
| Fuentes | Inter · Sora · JetBrains Mono |

**URLs**
- Producción: https://gl-app-v2.vercel.app
- Repo: https://github.com/lagosignacio91-sys/gl-app
- Dev local: `npm run dev` → http://localhost:5173

---

## Estructura de carpetas relevante

```
src/
  components/
    kit/index.jsx          ← Button, Input, Modal, Badge, EstadoBadge, Spinner, Field, Card
    layout/
      MainLayout.jsx        ← Shell responsive: sidebar (≥900px) / bottom-nav (móvil)
      layout.css            ← Breakpoint principal: 900px
    map/
      MapView.jsx           ← Mapa + marcadores + buscador + leyenda colapsable + stats
      PopupCentro.jsx       ← Popup al tocar un marcador
      FormCentro.jsx        ← Formulario para agregar nuevo centro (solo admin)
    ui/
      PanelCentro.jsx       ← Panel lateral/bottom-sheet con 5 tabs
      SelectorEmpresa.jsx   ← Filtro de empresa en el topbar
    dispatch/
      PanelDespacho.jsx     ← Tab "Despacho" dentro de PanelCentro
    tabs/
      TabROV.jsx
      TabHerramientas.jsx
      TabInsumos.jsx
      TabOperador.jsx
  pages/
    Login.jsx               ← Foto submarina de fondo, fuente Sora
    MapaPage.jsx            ← Página /
    CentrosPage.jsx         ← Página /centros
    DespachosPage.jsx       ← Página /despachos
    OperadoresPage.jsx      ← Página /operadores
  hooks/
    useAuth.js              ← Auth + rol desde Firestore
    useCentros.js           ← CRUD centros en tiempo real
    useDespachos.js         ← Despachos de un centro específico
    useDespachosGlobal.js   ← Todos los despachos (página Despachos)
    useOperadoresGlobal.js  ← Operadores de todos los centros
    useResumenCentro.js
    useReloj.js
  theme/
    theme.css               ← Design tokens CSS: colores, espaciado, radios, sombras, motion
    tokens.js               ← Tokens para usar en estilos inline JS (apuntan a var(--gl-*))
    ThemeProvider.jsx       ← Lee localStorage, aplica data-theme en <html>
  lib/
    firebase.js             ← Inicialización Firebase
    empresaLogos.js         ← Mapeo nombre empresa → logo PNG
```

---

## Design System

Todo está en `src/theme/theme.css` y `src/theme/tokens.js`. **No hay números mágicos** fuera de esos archivos.

### Prefijo de variables: `--gl-*`

| Grupo | Variables |
|-------|-----------|
| Superficies | `--gl-bg-base/surface/elevated/input/hover` |
| Bordes | `--gl-border`, `--gl-border-strong` |
| Texto | `--gl-text-primary/secondary/muted/on-brand` |
| Marca | `--gl-brand`, `--gl-brand-strong`, `--gl-brand-soft`, `--gl-brand-tint` |
| Estados | `--gl-ok/low/fault/dispatch/noop` + `*-tint` |
| Sombras | `--gl-shadow-sm/md/lg` |
| Espaciado | `--gl-space-1` (4px) … `--gl-space-8` (32px) |
| Radios | `--gl-radius-sm/md/lg/xl/full` |
| Tipos | `--gl-text-xs` (11px) … `--gl-text-xl` (22px) |
| Motion | `--gl-ease`, `--gl-dur-fast/dur/dur-slow` |

**Temas**: claro/oscuro vía `data-theme` en `<html>`. Cambiar tema = cero re-renders.

### Estados de centro

| Clave | Color | Etiqueta |
|-------|-------|----------|
| `OK` | Verde | Operativo |
| `LOW_STOCK` | Amarillo | Stock bajo |
| `EQUIPMENT_FAULT` | Rojo | Falla de equipo |
| `DISPATCH_ONWAY` | Azul | Despacho en camino |
| `NO_OPERATOR` | Gris | Sin operador |

### Clases CSS del kit (theme.css)

- `.gl-btn`, `.gl-btn--primary/secondary/ghost/danger`, `.gl-btn--sm/md/lg`
- `.gl-icon-btn`
- `.gl-input`, `.gl-input--sm`
- `.gl-card`
- `.gl-list-row` (filas de lista con hover CSS)
- `.gl-stats-row`, `.gl-stat-chip`, `.gl-stat-dot`
- `.gl-nav-item`, `.gl-nav-item.active`
- `.gl-panel-centro`, `.gl-panel-centro.panel-expanded`
- `.gl-drag-handle`
- `.gl-panel-wrapper`, `.gl-panel-wrapper--page`

---

## Roles y usuarios

| Rol | Permisos |
|-----|----------|
| `admin` | Todo: agregar/eliminar centros, generar despachos, ver todo |
| `operador` | Editar ROV, Herramientas, Insumos; ver estado despacho, confirmar recepción |

**⚠️ TEMPORAL (jun 2026):** En `useAuth.js` el rol `operador` se mapea a `admin` para que el usuario de demostración `mleal@glrobotica.cl` tenga acceso completo. Quitar ese mapeo cuando se construya el perfil operador real.

**Usuario demo:** `mleal@glrobotica.cl` / `mery123`

---

## Firestore — Colecciones

| Colección | Descripción |
|-----------|-------------|
| `usuarios/{uid}` | `{ rol: 'admin' \| 'operador' }` |
| `centros/{id}` | `{ nombre, lat, lng, estado, empresaId, empresaNombre }` |
| `centros/{id}/datos/operadores` | `{ op1: {...}, op2: {...} }` |
| `centros/{id}/datos/rov` | Equipos ROV |
| `centros/{id}/datos/herramientas` | Herramientas |
| `centros/{id}/datos/insumos` | Stock de insumos |
| `despachos/{id}` | `{ centroId, centroNombre, items[], estado, creadoEn, enviadoEn, recibidoEn }` |

**Estados de despacho:** `pendiente → enviado → recibido` (o `parcial`)

---

## Empresas soportadas

AquaChile · Blumar · Cermaq · Marine Farm

Logos en `public/empresas/`. Mapeo en `src/lib/empresaLogos.js`.

---

## Responsive

- **Breakpoint único:** 900px
- **≥ 900px (PC):** sidebar fijo izquierdo, topbar con reloj, panel de centro = slide lateral derecho
- **< 900px (móvil):** bottom nav, sidebar oculto (abre con ☰), panel de centro = bottom sheet (Google Maps style)
- **< 480px:** reloj del topbar oculto para liberar espacio

### Bottom sheet (PanelCentro en móvil)
- Altura por defecto: 300px (peek — muestra header + tabs)
- Altura expandida: 86vh (al tocar drag handle o cualquier tab)
- En `MapaPage`: mapa queda visible en la parte superior
- En `CentrosPage`: ocupa desde topbar hasta bottom nav

---

## Lo que está LISTO ✅

- [x] Login con foto submarina + fuente Sora
- [x] Shell responsive (sidebar PC / bottom nav móvil)
- [x] Tema claro/oscuro (toggle en topbar)
- [x] Mapa con marcadores que escalan al zoom
- [x] Buscador de centros en el mapa con `flyTo`
- [x] Leyenda colapsable (5 dots, click para expandir)
- [x] Stats del mapa compactos (bottom-left)
- [x] Popup al tocar marcador (muestra estado + solicitudes pendientes)
- [x] PanelCentro con 5 tabs: Operador / ROV / Herram. / Insumos / Despacho
- [x] PanelCentro como bottom sheet en móvil (drag handle + expand)
- [x] Página Centros con chips filtro por estado (scroll horizontal en móvil)
- [x] Página Despachos con pills de color + fecha relativa en cards
- [x] Página Operadores con chips en faena/descanso + fix truncación
- [x] Logos de empresas en píldoras blancas
- [x] Kit de componentes completo (Button, Modal, Badge, EstadoBadge, etc.)
- [x] Touch targets mínimos 44px (Apple HIG)
- [x] safe-area-inset-bottom para iPhone con notch
- [x] Design tokens CSS completos

---

## Pendientes 🔲

### Alta prioridad
- [ ] **Pestaña nueva en PanelCentro** (pendiente definición de contenido — usuario enviará archivo)
- [ ] **Perfil operador real** — quitar el mapeo temporal en `useAuth.js` y definir qué puede/no puede hacer
- [ ] **Importar centros desde KMZ** (LICENCIAS EASA.KMZ con centros AquaChile) — parsear KML y subir a Firestore

### Media prioridad
- [ ] Agregar usuarios desde la app (actualmente solo vía Firebase Console)
- [ ] Cambiar estado del centro manualmente desde la app

### Baja prioridad
- [ ] Leyenda del mapa: considerar mostrar solo los estados que existen en los centros activos

---

## Convenciones de código

- Estilos inline con `t.*` (tokens JS) para la mayoría de los componentes
- Clases CSS solo para estados hover/focus/active y responsive (no se pueden hacer con inline styles)
- Sin comentarios en el código salvo que el WHY sea no obvio
- Imports de lucide siempre con `{ NombreIcono }` desde `'lucide-react'`
- Hooks de Firebase usan `onSnapshot` para tiempo real
- `role === 'admin'` para verificar permisos (string, nunca booleano)
