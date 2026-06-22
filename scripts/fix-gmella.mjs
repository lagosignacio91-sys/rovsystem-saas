/**
 * Verifica y corrige el rol de gmella@hyperionx.tech en Firebase Auth + Firestore
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const ft    = 'C:/Users/robotico/AppData/Roaming/npm/node_modules/firebase-tools/lib'
const auth  = require(ft + '/auth')
const apiv2 = require(ft + '/apiv2')

const PROJECT  = 'gl-app-dbdf2'
const EMAIL    = 'gmella@hyperionx.tech'
const FS_BASE  = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`
const IDP_BASE = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}`

const acct = auth.getAllAccounts()[0]
if (!acct) throw new Error('Sin cuenta firebase-tools. Ejecuta: firebase login')
apiv2.setRefreshToken(acct.tokens.refresh_token)

async function getToken() { return apiv2.getAccessToken() }

function toFS(obj) {
  const fields = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'boolean') fields[k] = { booleanValue: v }
    else if (typeof v === 'number') fields[k] = { integerValue: String(v) }
    else if (typeof v === 'string') fields[k] = { stringValue: v }
  }
  return fields
}

async function getUIDByEmail(email) {
  const token = await getToken()
  const res = await fetch(`${IDP_BASE}/accounts:lookup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: [email] }),
  })
  if (!res.ok) throw new Error(`Auth lookup: ${res.status} — ${(await res.text()).substring(0, 300)}`)
  const data = await res.json()
  if (!data.users?.length) return null
  return data.users[0].localId
}

async function getDoc(col, uid) {
  const token = await getToken()
  const res = await fetch(`${FS_BASE}/${col}/${uid}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Firestore GET: ${res.status} — ${(await res.text()).substring(0, 300)}`)
  return res.json()
}

async function upsertDoc(col, docId, data) {
  const token = await getToken()
  const paths = Object.keys(data)
  const mask = paths.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&')
  const res = await fetch(`${FS_BASE}/${col}/${docId}?${mask}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFS(data) }),
  })
  if (!res.ok) throw new Error(`Firestore PATCH: ${res.status} — ${(await res.text()).substring(0, 300)}`)
  return res.json()
}

console.log(`\n🔍  Verificando ${EMAIL}\n`)

try {
  const uid = await getUIDByEmail(EMAIL)
  if (!uid) {
    console.log('  ❌  No existe en Firebase Auth.')
    process.exit(1)
  }
  console.log(`  Auth UID: ${uid}`)

  const doc = await getDoc('usuarios', uid)
  if (!doc) {
    console.log('  ⚠   Sin doc en Firestore — creando...')
  } else {
    const rolActual = doc.fields?.rol?.stringValue
    const movil = doc.fields?.movilHabilitado?.booleanValue
    console.log(`  Firestore actual: rol="${rolActual}", movilHabilitado=${movil}`)
    if (rolActual === 'owner') {
      console.log('\n  ✅  Ya tiene rol=owner. No hay nada que corregir.')
      console.log('     El problema puede ser de sesión activa en el navegador.')
      console.log('     Cierra sesión en la app y vuelve a entrar con este correo.\n')
      process.exit(0)
    }
    console.log(`  ⚠   rol="${rolActual}" — corrigiendo a "owner"...`)
  }

  await upsertDoc('usuarios', uid, { rol: 'owner', movilHabilitado: true })

  const check = await getDoc('usuarios', uid)
  const rolFinal = check?.fields?.rol?.stringValue
  console.log(`\n  ✅  rol actualizado → "${rolFinal}"`)
  console.log(`     UID: ${uid}`)
  console.log('\n  Ahora cierra sesión en la app y vuelve a entrar con gmella@hyperionx.tech\n')
} catch (e) {
  console.error(`\n  ❌  Error: ${e.message}`)
  process.exit(1)
}
