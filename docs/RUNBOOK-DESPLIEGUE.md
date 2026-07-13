# Runbook de despliegue a producción — RovSystem

**Proyecto Firebase:** `gl-app-dbdf2` (prod-only, sin staging) · **Frontend:** Vercel (`hyperionx-rovsystem` @ app.hyperionx.tech)
**Objetivo:** miércoles 2026-07-15 · **Rama:** `remediacion/produccion` · **Requiere: internet normal (sin Fortinet/VPN)**

> Regla de oro: **una fase a la vez**, verificar antes de pasar a la siguiente. Si una verificación falla, **detener** y revertir esa fase antes de seguir.

---

## 🔴 PRERREQUISITOS CRÍTICOS (hallados el 2026-07-13 — resolver ANTES de desplegar)

El 2026-07-13 se intentó desplegar y se toparon 2 bloqueadores que **solo se resuelven en consola** y necesitan **internet normal**:

1. **Cuenta de facturación de Blaze NO está abierta.** El plan figura "Blaze" y la cuenta "Pago de Firebase" aparece *vinculada*, pero **no hay ninguna cuenta de facturación activa** (en Cloud Console → Facturación, filtro "Activo" = 0 filas). Por eso `firebase deploy --only functions` falla con *"Billing account ... is not open"* al no poder habilitar Artifact Registry / Cloud Build.
   - **Causa probable:** el flujo de pago de Google se rompió por el bloqueo de páginas del Fortinet. **Con internet normal debería completarse.**
   - **Acción:** Cloud Console → Facturación → abrir/crear una cuenta con **método de pago (tarjeta) válido** y **vincularla** a `gl-app-dbdf2`. Verificar que en el filtro "Activo" aparezca la cuenta.
   - Sin esto **no se pueden desplegar Functions ni las APIs pagas de Storage.**
2. **Firebase Storage NO está inicializado** en el proyecto. `firebase deploy --only storage` falla con *"Firebase Storage has not been set up"*.
   - **Acción:** Firebase Console → **Storage** → **"Get Started"** → elegir ubicación (idealmente **us-east1**, igual que Firestore) y aceptar. Recién ahí se puede desplegar `storage.rules`.

> Nota: el 2026-07-13 las **reglas de Firestore SÍ se desplegaron y se revirtieron** de prueba (funcionó 2 veces) → esa parte está probada. Prod quedó con las reglas **originales** (revertidas); el repo tiene las nuevas listas para redeplegar.

---

## Estado confirmado (auditado 2026-07-13)
- **5 usuarios, todos `estado:'activo'` + rol válido** → nadie se bloquea con las reglas nuevas:
  omar.guajardo=admin · mleal=admin · dario.ruz=supervisor · richard.lagos=operador(team09) · ivan.anabalon=operador(team09).
- **Prod casi vacío:** 1 centro (`auchile`, sin team). ivan/richard sin datos operativos → **borrables sin riesgo**.
- **Ensayo en emuladores:** crearUsuario 7/7 · reglas 8/8 · phase2 11/11 · storage 8/8.
- **Alerta de presupuesto** (~10.000 CLP) en Cloud Console → Facturación → Presupuestos: pendiente (se pudo hacer una vez que la cuenta esté abierta).

---

## Fase 0 — Pre-flight (se puede hacer hoy/martes)

```bash
# En _codigo/gl-app. El proyecto ya está fijado por .firebaserc (default: gl-app-dbdf2).
firebase use            # confirmar que dice gl-app-dbdf2
firebase login:list     # confirmar sesión lagosignacio91@gmail.com
npm run lint            # 0/0
npm run build           # compila
```

- [x] **Copia de rollback de reglas ya lista** en `rollback/firestore.rules.prod-baseline` y `rollback/storage.rules.prod-baseline` (baseline pre-remediación = lo que corre prod hoy). Para revertir Firestore: `cp rollback/firestore.rules.prod-baseline firestore.rules && firebase deploy --only firestore:rules && git checkout firestore.rules`.
- [ ] **Prerrequisitos críticos resueltos** (billing abierto + Storage inicializado — ver sección arriba). ⛔ Sin esto no sigas.
- [ ] **Alerta de presupuesto** en Cloud Console (una vez billing abierto).
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

Desplegar en **3 pasos** (el orden importa; el 13/07 se validó que el paso de reglas funciona):

```bash
# 1) Reglas de Firestore (ya probado 2 veces el 13/07, funciona)
firebase deploy --only firestore:rules

# 2) Reglas de Storage — SOLO después de haber inicializado Storage ("Get Started", prereq)
firebase deploy --only storage

# 3) Functions — SOLO con la cuenta de facturación ABIERTA (prereq). Primera vez tarda
#    unos minutos: habilita Cloud Functions, Cloud Build y Artifact Registry.
firebase deploy --only functions
```

**Verificar:**
- [ ] Reglas nuevas visibles en Firestore → Reglas y Storage → Reglas.
- [ ] En consola → Functions aparece **`crearUsuario`** (y `onDocumentDeleted`).

**Rollback:** reglas → `cp rollback/firestore.rules.prod-baseline firestore.rules && firebase deploy --only firestore:rules && git checkout firestore.rules` (ídem storage). Functions: `firebase functions:delete crearUsuario` o redeploy anterior.

> Si `firestore:rules` se despliega pero storage/functions quedan bloqueados por un prereq, **revertir las reglas de Firestore** (comando de arriba) para no dejar prod en estado mixto, y resolver el prereq antes de reintentar. (Es lo que se hizo el 13/07.)

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
