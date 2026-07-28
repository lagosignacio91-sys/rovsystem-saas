/**
 * Aplica la config CORS de `cors.json` al bucket de Storage de producción.
 * Necesario para que las FOTOS se vean en los PDF (el navegador hace fetch() de
 * las fotos de Storage para embeberlas; sin CORS, el fetch falla y la foto queda
 * en blanco). Se ven en la app —los <img> no exigen CORS— pero no en el PDF.
 *
 * Uso (con `firebase login` ya hecho):
 *   node scripts/set-cors.mjs
 *
 * Equivale a `gsutil cors set cors.json gs://gl-app-dbdf2.firebasestorage.app`,
 * pero por la API JSON de Storage (no requiere tener gsutil/gcloud instalado).
 */
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

// firebase-tools instalado global en este PC (reusa la sesión de `firebase login`).
const ft = 'C:/Users/Lagos/AppData/Roaming/npm/node_modules/firebase-tools/lib'
const auth = require(ft + '/auth')
const apiv2 = require(ft + '/apiv2')
const acct = auth.getAllAccounts()[0]
if (!acct) throw new Error('Sin sesión de firebase-tools. Ejecuta: firebase login')
apiv2.setRefreshToken(acct.tokens.refresh_token)
const tok = () => apiv2.getAccessToken()

const BUCKET = 'gl-app-dbdf2.firebasestorage.app'
const cors = JSON.parse(readFileSync(join(__dirname, '..', 'cors.json'), 'utf8'))

console.log('Aplicando CORS a', BUCKET, '…')
let t = await tok()
const r = await fetch(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ cors }),
})
if (!r.ok) { console.error('PATCH FALLÓ', r.status, (await r.text()).slice(0, 400)); process.exit(1) }
console.log('PATCH OK (HTTP', r.status + ')')

t = await tok()
const v = await fetch(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}?fields=cors`, { headers: { Authorization: `Bearer ${t}` } })
console.log('\n=== CORS ahora en el bucket ===')
console.log(JSON.stringify((await v.json()).cors, null, 2))
console.log('\n✅ Listo. Ahora las fotos se verán en los PDF.')
