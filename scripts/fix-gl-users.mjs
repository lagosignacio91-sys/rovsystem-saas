/**
 * Verifica y corrige roles de usuarios GL Robótica en Firebase Auth + Firestore
 * node scripts/fix-gl-users.mjs
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
  if (!res.ok) throw new Error(`Auth lookup: ${res.status}`)
  const data = await res.json()
  if (!data.users?.length) return null
  return data.users[0].localId
}

async function getDoc(uid) {
  const token = await getToken()
  const res = await fetch(`${FS_BASE}/usuarios/${uid}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Firestore GET: ${res.status}`)
  return res.json()
}

async function upsertDoc(uid, data) {
  const token = await getToken()
  const paths = Object.keys(data)
  const mask = paths.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&')
  const res = await fetch(`${FS_BASE}/usuarios/${uid}?${mask}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFS(data) }),
  })
  if (!res.ok) throw new Error(`Firestore PATCH: ${res.status} — ${(await res.text()).substring(0,300)}`)
  return res.json()
}

// Usuarios GL Robótica a verificar/corregir
const USUARIOS = [
  { email: 'mleal@glrobotica.cl',         rolEsperado: 'admin',      nombre: 'M. Leal' },
  { email: 'omar.guajardo@glrobotica.cl',  rolEsperado: 'supervisor', nombre: 'Omar Guajardo' },
  { email: 'dario.ruz@glrobotica.cl',      rolEsperado: 'operador',   nombre: 'Dario Ruz' },
]

console.log('\n🔧  Verificando/corrigiendo usuarios GL Robótica\n')

for (const u of USUARIOS) {
  console.log(`── ${u.email} (${u.nombre})`)
  try {
    const uid = await getUIDByEmail(u.email)
    if (!uid) {
      console.log(`   ❌ No existe en Firebase Auth — necesita ser creado`)
      continue
    }
    console.log(`   UID: ${uid}`)

    const doc = await getDoc(uid)
    const rolActual = doc?.fields?.rol?.stringValue
    const movilActual = doc?.fields?.movilHabilitado?.booleanValue

    if (!doc) {
      console.log(`   ⚠  Sin doc Firestore — creando con rol="${u.rolEsperado}"`)
    } else if (rolActual !== u.rolEsperado) {
      console.log(`   ⚠  rol="${rolActual}" → corrigiendo a "${u.rolEsperado}"`)
    } else {
      console.log(`   ✅ rol="${rolActual}", movilHabilitado=${movilActual} — OK`)
      continue
    }

    await upsertDoc(uid, {
      rol: u.rolEsperado,
      movilHabilitado: true,
      nombre: u.nombre,
    })
    console.log(`   ✅ Corregido → rol="${u.rolEsperado}"`)
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`)
  }
  console.log()
}

console.log('\n✅  Listo. Los usuarios deben cerrar sesión y volver a entrar.\n')
