# Runbook de despliegue a producción — RovSystem

**Proyecto Firebase:** `gl-app-dbdf2` (prod-only, sin staging) · **Plan:** Blaze (activo) · **Frontend:** Vercel
**Objetivo:** miércoles 2026-07-15 · **Rama:** `remediacion/produccion`

> Regla de oro: **una fase a la vez**, verificar antes de pasar a la siguiente. Si una verificación falla, **detener** y revertir esa fase antes de seguir.

---

## Estado confirmado (auditado 2026-07-13)
- **Blaze activo** (cuenta "Pago de Firebase" vinculada). Falta solo crear la **alerta de presupuesto** (~10.000 CLP) en Cloud Console → Facturación → Presupuestos.
- **5 usuarios, todos `estado:'activo'` + rol válido** → nadie se bloquea con las reglas nuevas:
  omar.guajardo=admin · mleal=admin · dario.ruz=supervisor · richard.lagos=operador(team09) · ivan.anabalon=operador(team09).
- **Prod casi vacío:** 1 centro (`auchile`, sin team). ivan/richard sin datos operativos → **borrables sin riesgo**.
- **Ensayo en emuladores:** crearUsuario 7/7 · reglas 8/8 · phase2 11/11 · storage 8/8.

---

## Fase 0 — Pre-flight (se puede hacer hoy/martes)

```bash
# En _codigo/gl-app. El proyecto ya está fijado por .firebaserc (default: gl-app-dbdf2).
firebase use            # confirmar que dice gl-app-dbdf2
firebase login:list     # confirmar sesión lagosignacio91@gmail.com
npm run lint            # 0/0
npm run build           # compila
```

- [ ] **Guardar copia de las reglas actualmente desplegadas** (rollback). En la consola: Firestore → Reglas → copiar el texto vigente a un archivo local `rollback/firestore.rules.prod-YYYYMMDD`; ídem Storage → Reglas.
- [ ] **Alerta de presupuesto** en Cloud Console (si aún no está).
- [x] **Env vars de Vercel confirmadas** (proyecto `hyperionx-rovsystem`): están las 6 `VITE_FIREBASE_*` y **NO existe `VITE_USE_EMULATORS`** → el build de prod no usa emuladores. ✅
- [x] **Mecanismo de deploy confirmado** (ver Fase 5): proyecto `hyperionx-rovsystem` @ **app.hyperionx.tech**, auto-deploy desde `main` de `lagosignacio91-sys/rovsystem-saas`. **Vercel CLI instalado** → plan B sin VPN disponible.

---

## Fase 1 — Backup de Firestore

`gcloud` **no está instalado** en este PC → hacer el backup **por consola**:
- Firebase Console → Firestore Database → pestaña **"Importar/Exportar"** (o **"Recuperación ante desastres"**) → **Exportar** → elegir/crear bucket (ej. `gs://gl-app-dbdf2.appspot.com/backups/pre-deploy-YYYYMMDD`) → exportar toda la base.
- [ ] Export terminado sin error.

> Alternativa si se instala gcloud: `gcloud firestore export gs://gl-app-dbdf2.appspot.com/backups/pre-deploy-$(date +%Y%m%d-%H%M)`. Prod está casi vacío, así que el export es chico y rápido.

---

## Fase 2 — Deploy de backend (reglas + functions)

```bash
firebase deploy --only firestore:rules,storage,functions
```
La primera vez, functions puede pedir habilitar APIs (Cloud Functions, Cloud Build, Artifact Registry) y tardar unos minutos.

**Verificar:**
- [ ] Deploy sin errores; en consola → Functions aparece **`crearUsuario`** (y `onDocumentDeleted`).
- [ ] Reglas nuevas visibles en Firestore → Reglas y Storage → Reglas.

**Rollback:** `firebase deploy --only firestore:rules` con la copia guardada en Fase 0. Functions: redeploy de la versión anterior o `firebase functions:delete` si hiciera falta.

---

## Fase 3 — Verificar que los admins/supervisor siguen entrando

Como las reglas ahora exigen `aprovisionado()`, confirmar en caliente:
- [ ] Login como **omar** (o mleal) → carga el panel sin `permission-denied` en consola.
- [ ] Login como **dario** (supervisor) → ídem.

(Sus perfiles ya están `activo` + rol correcto — verificado el 13/07 —, así que esto debe pasar. Si NO pasara, revisar el perfil de ese usuario antes de seguir.)

---

## Fase 4 — Borrar los 2 operadores de prueba (ivan, richard)

Con functions ya desplegadas, **borrar el documento `usuarios/{uid}` dispara `onDocumentDeleted`, que elimina la cuenta de Auth sola** (sin huérfanos):

- [ ] Firestore → `usuarios` → borrar doc `PKFqaGObG7ew00pPdXSKfzqi0qk2` (ivan.anabalon).
- [ ] Firestore → `usuarios` → borrar doc `UwzT5hFyJ9RWZExTQXZS8NdFoVC2` (richard.lagos).
- [ ] Verificar en Authentication que sus cuentas desaparecieron (la función las borra; si no, borrarlas a mano ahí).

> No borrar los otros 3. No tocar la colección `centros`.

---

## Fase 5 — Deploy del frontend (Vercel)

**Producción:** proyecto `hyperionx-rovsystem` → **https://app.hyperionx.tech** → auto-deploy desde `main` de `lagosignacio91-sys/rovsystem-saas` (el remoto local `origin` ya apunta ahí). Hoy la rama `remediacion/produccion` está ~29 commits adelante de `main`.

Dos vías (elegir una):

**Vía A — GitHub (flujo normal, requiere VPN por Fortinet):**
```bash
git checkout main
git merge --no-ff remediacion/produccion
git push origin main          # ← necesita VPN / hotspot (Fortinet bloquea github.com)
```
Vercel detecta el push a `main` y despliega solo.

**Vía B — Vercel CLI (sin VPN, plan recomendado si no hay VPN):**
```bash
# Vercel CLI ya instalado (v54.21.x). Desde _codigo/gl-app:
vercel link          # una vez: elegir scope gmella-s-projects → proyecto hyperionx-rovsystem
vercel --prod        # build + deploy a producción usando las env vars del proyecto
```
Sube el código local directo a producción sin pasar por GitHub. Después, cuando haya VPN, igual conviene mergear+pushear `main` para que el repo quede como fuente de verdad.

**Verificar en https://app.hyperionx.tech:**
- [ ] Login de un admin OK · mapa carga con marcadores · panel de centro abre · pestañas ROV/Inventario cambian.
- [ ] Consola del navegador **sin errores** ni `permission-denied`.

**Rollback:** Vercel → Deployments → "Promote to Production" del deploy anterior (instantáneo).

---

## Fase 6 — Cerrar el auto-registro (último paso)

Recién ahora, con admins vivos y `crearUsuario` desplegada:
- [ ] Firebase Console → Authentication → **Método de acceso** → Email/Password → **desactivar el registro público** (dejar habilitado el inicio de sesión, quitar el alta pública / "sign-up").

**Verificar:**
- [ ] Un intento de auto-registro falla.
- [ ] Un admin crea un **operador de prueba** desde la app (usa `crearUsuario`) → OK. Luego borrar ese operador de prueba.

---

## Fase 7 — Carga de datos reales (post-lanzamiento, sin apuro)

1. Cargar operadores desde el **Excel** (alta en la app / ImportarCSV).
   - ⚠️ **El importador crea a los operadores en `estado:'pendiente'`, y `aprovisionado()` solo deja entrar a los `'activo'`.** Tras cargar, **activarlos** (editar estado → Activo, o incluir la columna estado en la carga). Si no, "no van a poder entrar".
2. Crear/asignar **centros y teams** (auchile ya existe pero sin team; inicializar el resto y asignar `teamAsignado`).
3. Entregar usuario/clave a cada operador.
4. Cada **operador ingresa el inventario** de equipos/herramientas de **su** centro (las reglas se lo permiten solo para su team — validado).
5. El **owner** carga la **Bodega Virtual** (taller físico central).

---

## Tabla de rollback rápido

| Fase | Reversión |
|---|---|
| Reglas Firestore/Storage | `firebase deploy --only firestore:rules` con la copia de Fase 0 |
| Functions | Redeploy versión anterior / `functions:delete crearUsuario` |
| Frontend | Vercel → promover el deploy anterior |
| Auto-registro | Volver a habilitarlo en Authentication |
| Borrado de usuarios | (irreversible fácil) por eso se hace solo con ivan/richard, ya confirmados vacíos |

---

*Runbook generado el 2026-07-13. Mecánica validada en emuladores (crearUsuario 7/7, reglas 27/27). Acompañar cada fase con verificación antes de avanzar.*
