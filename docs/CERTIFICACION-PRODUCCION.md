# Certificación de producción — RovSystem

**Proyecto:** RovSystem — Deep Operations Platform (React 19 + Vite + Firebase)
**Rama:** `remediacion/produccion` (26 commits desde `main`)
**Fecha de cierre:** 2026-07-13
**Alcance:** Plan Maestro de Remediación (7 fases). No se agregaron funcionalidades; el objetivo fue dejar la app estable, segura y certificable con correcciones localizadas, compatibles con React 19 / Vite / Firebase / Firestore / Storage.

---

## 1. Veredicto

**APTA PARA PRODUCCIÓN**, condicionada a **2 acciones manuales del owner** (sección 7) que no son automatizables desde el código: desplegar las Cloud Functions y apagar el auto-registro Email/Password en la consola de Firebase. Hasta ejecutarlas, el cierre del vector de auto-registro (S-01) queda a medias en el entorno real.

- `npm run lint` → **0 errores / 0 warnings**
- `npm run build` → **compila** (2499 módulos)
- QA en vivo (emuladores + navegador, rol supervisor y operador) → **sin errores de consola ni permission-denied no controlados**

---

## 2. Resumen por fase

| Fase | Foco | Hallazgos cerrados |
|---|---|---|
| 1 | Bloqueantes críticos | **LV-01** (pestañas del panel no cambiaban de contenido), **S-01** (lecturas abiertas + auto-registro) |
| 2 | Seguridad | **S-02, S-03, S-04, S-05, S-06, S-07** |
| 3 | Robustez | **LV-02, T-02, T-03, T-04, T-10** |
| 4 | Rendimiento | **T-01, T-05, T-06** |
| 5 | Integridad de datos | **LV-03** |
| 6 | UX / Accesibilidad | **LV-04** |
| 7 | Limpieza | Lint (39 hallazgos reales en `src/`) + 2 ítems de robustez (Leaflet CDN, PDF sin catch) |

---

## 3. Detalle de hallazgos cerrados

### Bloqueantes
- **LV-01 — Pestañas del panel de centro no cambiaban de contenido.** Causa raíz: el `AnimatePresence mode="wait"` nunca completaba el handoff por el re-render de 1 s. Se desacopló el contenido del deadlock. Commit `09c434e`. Reverificado en vivo en Fase 6 (el `aria-labelledby` del panel cambia al mover pestaña → el contenido monta de verdad).
- **S-01 — Lectura abierta de 5 colecciones + auto-registro público.** `aprovisionado()` reemplaza a `signedIn()` en las lecturas (usuario autenticado + con perfil + activo + rol válido). El alta de usuarios pasa a Cloud Function server-side con Admin SDK, verificando al llamador contra Firestore. Commits `c8deec3`, `f8b498c`. **Requiere acción de owner** (sección 7).

### Seguridad
- **S-02** — `centros/{id}/equipos` write acotado por team del operador. `b008f57`.
- **S-03** — El roster de operadores deja de espejar `rut` y `correoPersonal`; la tarjeta de contacto usa el correo corporativo. `6c2a37e`, `053a9c7`.
- **S-04** — `hxDocs/` en Storage restringido por rol (owner/ventas) con `firestore.get()` + filtro de `contentType`. `3798c3e`.
- **S-05** — `hxProspectos` anónimo: el update valida tipo e incremento acotado. `b008f57`.
- **S-06** — Fotos en Storage acotadas por team + `uploadedBy == request.auth.uid` (anti-spoofing). `3798c3e`.
- **S-07** — Validación de tipos/enums en el update de despacho por operador. `9e89f58`.

### Robustez
- **LV-02** — Se eliminan los `permission-denied` no capturados del operador: los listeners esperan a que cargue el rol/team antes de suscribirse (el query sin `where` viola la regla). `06672b4`, `333450c`.
- **T-02** — `onError` en todos los `onSnapshot` (patrón: onNext, onError, cleanup, estado de carga y error). `22f13c7`.
- **T-03** — Guardar una rama del ROV ya no pisa el equipo hermano con estado rancio. `488e3a8`.
- **T-04** — Descuento de stock atómico con `runTransaction` (idempotente). `f15e1a5`.
- **T-10** — Guarda contra config parcial en entregas de turno. `22f13c7`.

### Rendimiento
- **T-01** — Reloj aislado en componente hoja: elimina el re-render por segundo de todo el subárbol (raíz compartida con LV-01). `820855b`.
- **T-05** — Entregas de turno por centro se cargan de forma perezosa (al expandir). `ef98f4d`.
- **T-06** — Fotos de inspección comprimidas antes de subir/embeber. `c40cb07`.

### Integridad de datos
- **LV-03** — Validación de contenido mínimo antes de guardar bitácora, en ambos sinks (modal y tab) + defensa en profundidad (botón deshabilitado + guarda en la función de guardado). `f9e462a`.

### UX / Accesibilidad
- **LV-04** — Patrón WAI-ARIA de tabs en `PanelCentro` (tablist/tab/tabpanel, roving tabindex, navegación por teclado) + `aria-label` en el buscador y botones del mapa. `5ccf642`.

### Limpieza (Fase 7)
- **Scope de ESLint** — `**/dist` y subproyectos fuera del linter; `functions/` lintado como Node/CommonJS. De 390 a 33 errores reales sin silenciar nada de la app. `dd6d3bc`.
- **Código muerto** — 11 variables/imports/props sin uso. `ee9df3b`.
- **Regex** — escapes innecesarios y BOM literal → escape `﻿`. `ff4df6a`.
- **HMR** — no-componentes separados de sus componentes (`toastBus.js`, `AppConfigProvider.jsx`, `themeContext.js`, `config/camposRov.js`); id de toast `Date.now()` → contador monotónico. `fbe73cd`.
- **setState en efectos** — `useIsMobile` → `useSyncExternalStore`; 5 modales + TabROV + MainLayout → ajuste-en-render; 5 hooks de suscripción → derivan el caso vacío. Sin cambiar comportamiento observable. `7196582`, `422c60e`.
- **Robustez de producción** — iconos de Leaflet servidos desde el bundle (no CDN `unpkg`); funciones de PDF con `try/catch` (tragan `AbortError` de cancelar compartir). `8b95a35`.

---

## 4. Archivos modificados

57 archivos, +878 / −450 líneas. Agrupados:

- **Reglas y backend:** `firestore.rules`, `storage.rules`, `functions/index.js`.
- **Infra de QA:** `firebase.json`, `.claude/launch.json`, `eslint.config.js`.
- **Hooks (datos):** `useAppConfig`, `AppConfigProvider`, `useAuth`, `useCentros`, `useDespachos`, `useDespachosGlobal`, `useBitacorasGlobal`, `useFaltantesGlobal`, `useOperadoresGlobal`, `useEquipoTickets`, `useEquipoTicketsGlobal`, `useEntregasTurno`, `useBodegaCentral`, `useEmpresas`, `useResumenCentro`, `useUsuarios`, `useIsMobile`.
- **Componentes:** `PanelCentro`, `MainLayout`, `Reloj` (nuevo), `MapView`, `TabROV`, `TabInventario`, `TabOperador`, `TabBitacora`, `TabEntregaTurno`, `StepInspeccionROV`, los 5 modales de bodega, `ModalEntregaTurno`, `ModalGenerarBitacora`, `Toast`, `toastBus` (nuevo), `ThemeProvider`, `themeContext` (nuevo), `ThemeToggle`.
- **Páginas:** `MapaPage`, `CentrosPage`, `BitacorasPage`, `ReportesPage`, `TurnosPage`, `Login`, `main.jsx`.
- **Lib/config:** `firebase.js`, `generatePDF.js`, `validaciones.js`, `config/appDefaults.js`, `config/camposRov.js` (nuevo).

---

## 5. Riesgos mitigados

- **Fuga de datos entre tenants** (S-01/S-02/S-03/S-06): lecturas y escrituras acotadas por rol/team; PII de operadores ya no world-readable.
- **Registro público no autorizado** (S-01): alta movida a Cloud Function con verificación server-side (pendiente apagar el signUp en consola).
- **Corrupción de datos** (T-03/T-04/LV-03): escrituras sin pisar hermanos, descuento atómico, no se guardan bitácoras vacías.
- **Caídas por errores no manejados** (T-02/T-10/LV-02): todos los listeners con `onError`; sin `permission-denied` ni promesas sueltas (incluye PDF).
- **Dependencia de red externa en runtime** (Fase 7): los assets del mapa ya no dependen del CDN `unpkg`.
- **Rendimiento** (T-01/T-05/T-06): se elimina el re-render por segundo; carga perezosa; fotos comprimidas.

---

## 6. Checklist de producción

- [x] `npm run lint` en verde (0/0)
- [x] `npm run build` compila
- [x] Reglas de Firestore y Storage endurecidas (roles/teams/tipos)
- [x] Alta de usuarios server-side (Cloud Function) implementada
- [x] Todos los `onSnapshot` con manejo de error
- [x] Validación de datos en frontend + reglas
- [x] Accesibilidad de tabs y nombres accesibles en el mapa
- [x] Assets del mapa locales (sin CDN externo)
- [x] QA en vivo (supervisor + operador) sin errores de consola
- [ ] **Owner:** `firebase deploy --only functions` (sección 7)
- [ ] **Owner:** apagar auto-registro Email/Password en consola (sección 7)
- [ ] **Owner:** desplegar `firestore.rules` y `storage.rules` a producción
- [ ] **Owner:** `git push` de la rama (bloqueado por Fortinet; requiere VPN)

---

## 7. Acciones manuales del owner (no automatizables)

Estas acciones son propias de la consola/entorno del owner y **no** deben hacerse desde el código:

1. **Desplegar Cloud Functions:** `firebase deploy --only functions` (runtime Node 20). Sin esto, el alta de usuarios server-side no existe en el entorno real.
2. **Apagar el auto-registro Email/Password** en Firebase Console → Authentication → Sign-in method. Es lo que cierra definitivamente el vector S-01; el código ya no depende del signUp público.
3. **Desplegar reglas:** `firebase deploy --only firestore:rules,storage` para llevar el endurecimiento de S-01…S-07 al entorno real.
4. **Push de la rama:** `git push origin remediacion/produccion` — bloqueado por el filtro Fortinet de esta red; requiere VPN o hotspot. Sin push, la rama vive solo en local.

---

## 8. Verificación / evidencia

- **Lint:** `npx eslint .` → exit 0 (0 errores, 0 warnings).
- **Build:** `npm run build` → 2499 módulos transformados, sin errores (los warnings de chunk-size y jspdf son preexistentes, ajenos a esta remediación).
- **QA en vivo (Playwright, dev server + emuladores Auth/Firestore/Storage/Functions):**
  - Login/sesión (supervisor) OK; navegación por Mapa, Centros, Despachos, Operadores, Reportes, Bodega — 0 errores de consola.
  - Mapa: marcadores renderizan, **cero imágenes de `unpkg`** en la página.
  - Reset de modal de bodega verificado (escribir → cerrar → reabrir → campos limpios).
  - `PanelCentro` → pestaña ROV monta los campos desde `config/camposRov.js`; navegación WAI-ARIA por teclado correcta.
  - Contacto de operadores muestra correo corporativo (S-03 cerrado).

---

## 9. Pendientes conocidos (fuera del alcance cerrado)

No son bloqueantes; se documentan para trazabilidad:

- **Keys por índice** en algunas listas de solo lectura: no es un hallazgo del lint actual (no está `eslint-plugin-react` en el config) y es inocuo en listas que no reordenan. No se abordó para no destapar ruido de bajo valor.
- **Tamaño del bundle** (> 500 kB): oportunidad de code-splitting; warning preexistente del build, no abordado.
- **T-07** (migrar `TabROV` a `onSnapshot`): mejora opcional mencionada junto a T-03; diferida.

---

*Documento generado como cierre del Plan Maestro de Remediación. Vive en la rama `remediacion/produccion`; se integrará al historial junto con el PR correspondiente.*
