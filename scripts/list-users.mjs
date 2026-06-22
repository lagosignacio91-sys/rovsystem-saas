/**
 * READ-ONLY: lista todos los usuarios de Firebase Auth + su doc en Firestore.
 * node scripts/list-users.mjs
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const ft    = 'C:/Users/robotico/AppData/Roaming/npm/node_modules/firebase-tools/lib'
const auth  = require(ft + '/auth')
const apiv2 = require(ft + '/apiv2')

const PROJECT  = 'gl-app-dbdf2'
const FS_BASE  = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`
const IDP_BASE = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}`

const acct = auth.getAllAccounts()[0]
if (!acct) throw new Error('Sin cuenta firebase-tools. Ejecuta: firebase login')
apiv2.setRefreshToken(acct.tokens.refresh_token)
async function getToken() { return apiv2.getAccessToken() }

// Listar todas las cuentas de Auth (paginado)
async function listAuthUsers() {
  const token = await getToken()
  const out = []
  let nextPageToken = undefined
  do {
    const res = await fetch(`${IDP_BASE}/accounts:batchGet?maxResults=200${nextPageToken ? `&nextPageToken=${nextPageToken}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Auth list: ${res.status} — ${(await res.text()).substring(0,300)}`)
    const data = await res.json()
    for (const u of (data.users || [])) out.push({ uid: u.localId, email: u.email })
    nextPageToken = data.nextPageToken
  } while (nextPageToken)
  return out
}

async function getUserDoc(uid) {
  const token = await getToken()
  const res = await fetch(`${FS_BASE}/usuarios/${uid}`, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`FS GET: ${res.status}`)
  return res.json()
}

console.log('\n📋  Usuarios en Firebase Auth + Firestore (proyecto ' + PROJECT + ')\n')

const users = await listAuthUsers()
console.log(`Total cuentas Auth: ${users.length}\n`)
console.log('EMAIL'.padEnd(38) + 'ROL'.padEnd(12) + 'teamId'.padEnd(10) + 'UID')
console.log('-'.repeat(110))

for (const u of users) {
  let rol = '—', teamId = '—'
  try {
    const doc = await getUserDoc(u.uid)
    if (doc?.fields) {
      rol    = doc.fields.rol?.stringValue ?? '(sin doc-rol)'
      teamId = doc.fields.teamId?.stringValue ?? '—'
    } else {
      rol = '(SIN DOC Firestore)'
    }
  } catch (e) { rol = 'ERR:' + e.message }
  console.log((u.email || '(sin email)').padEnd(38) + String(rol).padEnd(12) + String(teamId).padEnd(10) + u.uid)
}

console.log('\n✅  Fin del listado (solo lectura, nada modificado).\n')
