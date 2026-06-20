/**
 * Script one-shot: crea el perfil Firestore para rol ventas
 * node scripts/setup-ventas.mjs
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const ft    = 'C:/Users/robotico/AppData/Roaming/npm/node_modules/firebase-tools/lib'
const auth  = require(ft + '/auth')
const apiv2 = require(ft + '/apiv2')

const PROJECT   = 'gl-app-dbdf2'
const EMAIL     = 'belen.urra@hyperionx.tech'
const FS_BASE   = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`
const IDP_BASE  = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}`

const acct = auth.getAllAccounts()[0]
if (!acct) throw new Error('Sin cuenta firebase-tools. Ejecuta: firebase login')
apiv2.setRefreshToken(acct.tokens.refresh_token)

async function getToken() { return apiv2.getAccessToken() }

function toFS(obj) {
  const fields = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) fields[k] = { nullValue: null }
    else if (typeof v === 'boolean')   fields[k] = { booleanValue: v }
    else if (typeof v === 'number')    fields[k] = { integerValue: String(v) }
    else if (typeof v === 'string')    fields[k] = { stringValue: v }
  }
  return fields
}

async function getUIDByEmail(email) {
  const token = await getToken()
  const res = await fetch(`${IDP_BASE}/accounts:lookup`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email: [email] }),
  })
  if (!res.ok) throw new Error(`Auth lookup: ${res.status} — ${(await res.text()).substring(0, 300)}`)
  const data = await res.json()
  if (!data.users?.length) return null
  return data.users[0].localId
}

async function createAuthUser(email, password) {
  const token = await getToken()
  const res = await fetch(`${IDP_BASE}/accounts`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password, emailVerified: false }),
  })
  if (!res.ok) throw new Error(`Auth create: ${res.status} — ${(await res.text()).substring(0, 300)}`)
  const data = await res.json()
  return data.localId
}

async function upsertDoc(col, docId, data) {
  const token = await getToken()
  const paths = Object.keys(data)
  const mask  = paths.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&')
  const res   = await fetch(`${FS_BASE}/${col}/${docId}?${mask}`, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ fields: toFS(data) }),
  })
  if (!res.ok) throw new Error(`Firestore PATCH: ${res.status} — ${(await res.text()).substring(0, 300)}`)
  return res.json()
}

// ── MAIN ──────────────────────────────────────────────────────────
console.log(`\n🔧  Configurando rol ventas para ${EMAIL}\n`)

try {
  console.log('  1/3  Buscando UID en Firebase Auth...')
  let uid = await getUIDByEmail(EMAIL)

  if (!uid) {
    console.log('       No existe — creando cuenta Auth...')
    uid = await createAuthUser(EMAIL, 'HyperionX2024!')
    console.log(`       Cuenta creada. Contraseña temporal: HyperionX2024!`)
  }
  console.log(`       UID: ${uid}`)

  console.log('  2/3  Escribiendo perfil en Firestore usuarios/' + uid + '...')
  await upsertDoc('usuarios', uid, {
    rol:             'ventas',
    movilHabilitado: false,
  })
  console.log('       Firestore actualizado.')

  console.log('  3/3  Verificando escritura...')
  const token = await getToken()
  const check = await fetch(`${FS_BASE}/usuarios/${uid}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const doc = await check.json()
  const rol = doc.fields?.rol?.stringValue
  console.log(`       rol en Firestore = "${rol}"`)
  if (rol !== 'ventas') throw new Error('Verificación fallida: rol no se guardó correctamente')

  console.log(`\n  ✅  ${EMAIL}  →  rol=ventas  movilHabilitado=false`)
  console.log('\n🎉  Listo. La cuenta ya puede ingresar a /olimpo con rol ventas.')
  if (uid) console.log(`\n     UID final: ${uid}`)
} catch (e) {
  console.error(`\n  ❌  Error: ${e.message}`)
  process.exit(1)
}
