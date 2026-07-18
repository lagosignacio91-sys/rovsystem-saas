# Diseño: Rol "Apertura" — RovSystem

**Fecha:** 2026-07-17 · **Estado:** aprobado para plan de implementación · **Entorno:** desarrollo local + emuladores; despliegue a producción **después** de validar.

## Contexto y problema

GL Robótica tiene un equipo de **apertura** (team08): 2 personas que viajan a centros que se están **abriendo** (nuevos). Montan el centro, lo operan un tiempo con su **propio kit** (ROV + inventario), y cuando terminan se van al siguiente centro. Su equipamiento **viaja con ellos** — no pertenece al centro.

Hoy el sistema no soporta esto:
- No existe un rol `apertura` (roles actuales: operador, supervisor, admin, owner, ventas).
- Crear centros es **solo admin**.
- Los equipos ROV e inventario cuelgan **del centro** (`centros/{id}/equipos/...`), no de un team; no hay forma de que "viajen".

## Objetivo

Que las 2 personas de apertura, con su propio usuario rol `apertura`, puedan:
1. **Crear centros** nuevos (eligiendo el cliente/empresa) directamente desde el mapa.
2. **Operar** el centro que están abriendo (ROV, inventario, bitácora, turno) usando un **kit propio del team que viaja** con ellos.
3. **Cerrar la apertura** de un centro con un botón explícito: el centro queda **solo con su registro** (nombre + ubicación + empresa), sin team, esperando que un admin le asigne el team definitivo.

### No-objetivos (YAGNI)
- No se automatiza el traspaso al team definitivo (lo hace el admin, flujo ya existente).
- Apertura no gestiona despachos ni bodega central.
- El kit no se copia entre centros: vive en el team y por eso "viaja" sin mover datos.

## Conceptos clave

| Concepto | Definición |
|---|---|
| Rol `apertura` | Nuevo rol. Usuarios `teamId = 'team08'`, `empresaId = null` (recorren varios clientes). Faena/descanso como operadores (1 activo, 1 en descanso). |
| Kit del team | Equipos ROV + inventario + bitácora que **viven en `teams/team08`** y viajan con el equipo. |
| Centro actual de apertura | El (único) centro con `teamAsignado = 'team08'`. Solo uno a la vez. |
| Cerrar apertura | Poner `teamAsignado = null` en el centro actual → queda registro puro. |

## Modelo de datos

### Nueva colección `teams/{teamId}` (kit que viaja)
Para apertura, `teams/team08` contiene el kit, con la **misma forma** que hoy tienen los centros:
- `teams/team08/equipos/rov` — equipos ROV (mismo shape que `centros/{id}/equipos/rov`).
- `teams/team08/datos/cajaHerramientas` y `teams/team08/datos/estucheHerramientas` — inventario.
- `teams/team08/datos/bitacora` — bitácora (viaja con el team; **no** queda en el centro).
- `teams/team08/datos/operadores` — roster de las 2 personas de apertura (faena/descanso).

> El kit se carga **una vez** dentro de la app y persiste. Al cambiar de centro no se mueve nada: sigue colgando de `teams/team08`.

### Centro creado por apertura
```
centros/{autoId} = {
  nombre, lat, lng,
  empresaId, empresaNombre,      // el cliente que apertura eligió
  teamAsignado: 'team08',        // marca "centro actual de apertura"
  estado: 'OK',
  estadoCiclo: 'apertura',
  creadoEn, creadoPor            // uid del usuario apertura
}
```
El centro **nunca** recibe subcolecciones de kit (equipos/datos): esas viven en el team. Por eso, al cerrar, queda solo con su registro sin necesidad de borrar nada.

### Cierre de apertura
`teamAsignado: 'team08' → null`. El centro queda registrado, sin team, `estadoCiclo` pasa a algo neutro (ej. `'registrado'`). Un admin luego le asigna el team definitivo (flujo actual).

## Permisos (firestore.rules)

- Agregar `apertura` a `rolValido` y helper `isApertura()`.
- **Centros — create:** `isAdmin() || (isApertura() && request.resource.data.teamAsignado == 'team08')`. Apertura solo puede crear centros marcados como suyos.
- **Centros — update (cerrar):** además de las reglas actuales, permitir que apertura ponga `teamAsignado` de `'team08'` a `null` en un centro cuyo `teamAsignado` actual sea `'team08'` (y solo ese campo + estadoCiclo).
- **Nueva colección `teams/{teamId}` y subcolecciones:**
  - `read`: `aprovisionado()`.
  - `write`: `isAdmin() || (isApertura() && teamId == usuario.teamId)` → apertura escribe **solo** el kit de su propio team (team08). Mantiene el aislamiento cross-tenant (S-02/S-03).
- El usuario apertura no puede escribir kit ni datos de otros teams/centros.

## Pantallas / UX

1. **Crear centro (Mapa):** apertura clickea la ubicación → `FormCentro` con **selector de empresa habilitado** (hoy solo admin). Al guardar, se crea con `teamAsignado='team08'`.
   - **Guardia uno-a-la-vez:** si ya existe un centro con `teamAsignado='team08'`, se bloquea con aviso *"Ya tenés un centro en apertura ({nombre}). Cerralo antes de abrir otro."*
2. **Operar centro actual:** el panel del centro team08 muestra pestañas **ROV, Inventario, Bitácora, Turno**, pero leyendo/escribiendo **`teams/team08/…`** en vez de `centros/{id}/…`. **Criterio canónico de detección:** el panel trata al centro como "de apertura" cuando `teamAsignado === 'team08'` (fuente de verdad única). `estadoCiclo: 'apertura'` es solo informativo/visual, no se usa para decidir el redirect.
3. **Cerrar apertura:** botón *"Cerrar apertura / Salir del centro"* en el panel, con diálogo de confirmación → setea `teamAsignado=null`. Tras cerrar, apertura no tiene centro actual y puede crear el siguiente.
4. **Navegación de apertura:** Mapa + panel del centro actual. Sin páginas de admin (Despachos, Bodega, Operadores, Reportes).

## Importación (pestaña "apertura" del Excel)

Extender `ImportarCSV` con un **selector de tipo**: *Operadores* (actual) / *Apertura*.
- En modo **Apertura**: crea usuarios con `rol='apertura'`, `teamId='team08'`, `empresaId=null`, sin mapeo de centro. Mismas columnas que operadores **menos** Centro (o Centro ignorado).
- El resto del flujo (validación de correo/RUT, contraseña por defecto, estado activo) igual que operadores.

## Flujo completo (ciclo de vida)

1. Admin importa/crea las 2 personas de apertura (rol apertura, team08) y cargan su kit una vez en `teams/team08`.
2. Apertura llega a un sitio nuevo → crea el centro en el mapa, elige el cliente. Centro nace `teamAsignado='team08'`.
3. Operan el centro (ROV/inventario/bitácora/turno) sobre el kit del team.
4. Terminan → **Cerrar apertura**. El centro queda registrado sin team; el kit sigue en team08.
5. Van al siguiente centro (paso 2). El kit "viaja" solo.
6. Más tarde, un admin asigna el team definitivo al centro registrado (flujo actual) y ese team trae su propio equipamiento.

## Casos borde

- **Dos aperturas simultáneas:** bloqueadas por la guardia uno-a-la-vez (solo un centro team08).
- **Cerrar sin centro actual:** el botón solo aparece si hay centro team08.
- **Centro registrado sin kit:** correcto por diseño (el kit nunca estuvo en el centro).
- **Admin asigna team definitivo a un centro aún en apertura (team08):** el admin primero debería cerrar la apertura; documentar/validar que no se pise team08 sin cerrar.

## Verificación (emuladores + navegador)

- Seed: usuario apertura (team08) + kit en `teams/team08`.
- Crear centro con empresa elegida → `teamAsignado='team08'`, sin subcolecciones de kit.
- Guardia uno-a-la-vez: intentar crear un 2º centro en apertura → bloqueado.
- Operar: editar ROV/inventario/bitácora → se escribe en `teams/team08`, no en el centro.
- Cerrar apertura → `teamAsignado=null`, centro queda solo registro; kit intacto en team08.
- Reglas: apertura NO puede escribir kit de otro team, ni crear centro con otro `teamAsignado`, ni tocar datos de centros ajenos.
- Import modo Apertura: crea 2 usuarios rol apertura/team08/empresa nula.

## Rollout

Desarrollo y prueba en **local + emuladores Firebase**. Recién con todo verde (reglas + UI + import), desplegar a producción: reglas, frontend, y correr el import de las 2 personas de apertura.
