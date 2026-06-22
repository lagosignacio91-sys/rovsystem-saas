/**
 * Script one-shot: configura Firestore para el Panel Maestro Olimpo
 * node scripts/setup-olimpo.mjs
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const ft    = 'C:/Users/robotico/AppData/Roaming/npm/node_modules/firebase-tools/lib'
const auth  = require(ft + '/auth')
const apiv2 = require(ft + '/apiv2')

const PROJECT = 'gl-app-dbdf2'
const BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

// Inicializar apiv2 con el refresh token almacenado por firebase login
const acct = auth.getAllAccounts()[0]
if (!acct) throw new Error('No hay cuenta en firebase-tools. Ejecuta: firebase login')
apiv2.setRefreshToken(acct.tokens.refresh_token)

async function getToken() {
  return apiv2.getAccessToken()
}

// ---- UIDs obtenidos via firebase auth:export ----
const USUARIOS = [
  { uid: 'CWyJOHFwkudtvua5Bho1Q8GRaGx2', email: 'omar.guajardo@glrobotica.cl',  movilHabilitado: true, rol: null    },
  { uid: 'Ztf6VciPI8YD7qS5a6z8x0pXlHI2', email: 'dario.ruz@glrobotica.cl',      movilHabilitado: true, rol: null    },
  { uid: 'x8w1h6jq4oPp4Swvb5jz9VhpWHo2', email: 'mleal@glrobotica.cl',           movilHabilitado: true, rol: null    },
  { uid: 'ybN2JguNKxZob19pEdyIlLR17ph2', email: 'adminapp@hyperionx.tech',       movilHabilitado: true, rol: 'owner' },
]

function toFS(obj) {
  const fields = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) fields[k] = { nullValue: null }
    else if (typeof v === 'boolean')   fields[k] = { booleanValue: v }
    else if (typeof v === 'number')    fields[k] = { integerValue: String(v) }
    else if (typeof v === 'string')    fields[k] = { stringValue: v }
    else if (typeof v === 'object')    fields[k] = { mapValue: { fields: toFS(v) } }
  }
  return fields
}

async function patch(path, data, fieldPaths) {
  const token = await getToken()
  const mask  = fieldPaths.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&')
  const res   = await fetch(`${BASE}/${path}?${mask}`, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ fields: toFS(data) }),
  })
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).substring(0, 300)}`)
  return res.json()
}

async function createDoc(col, docId, data) {
  const token = await getToken()
  const res   = await fetch(`${BASE}/${col}?documentId=${docId}`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ fields: toFS(data) }),
  })
  if (res.status === 409) return patch(`${col}/${docId}`, data, Object.keys(data))
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).substring(0, 300)}`)
  return res.json()
}

// ---- MAIN ----
console.log('🔧  Configurando Firestore — Panel Maestro HyperionX Olimpo\n')

for (const u of USUARIOS) {
  try {
    const data  = { movilHabilitado: u.movilHabilitado }
    const paths = ['movilHabilitado']
    if (u.rol) { data.rol = u.rol; paths.push('rol') }
    await patch(`usuarios/${u.uid}`, data, paths)
    console.log(`  ✅  ${u.email}  →  movilHabilitado=true${u.rol ? `  +  rol=${u.rol}` : ''}`)
  } catch (e) {
    console.error(`  ❌  ${u.email}:  ${e.message}`)
  }
}

try {
  await createDoc('hxOlimpo', 'gl-robotica', {
    nombre: 'GL Robótica', empresaId: null, planMensual: 1000000, moneda: 'CLP',
    estado: 'activa', diaVencimiento: 19, fechaInicio: new Date().toISOString(),
    contacto: { nombre: 'Omar Guajardo', email: 'omar.guajardo@glrobotica.cl', tel: '' },
  })
  console.log('\n  ✅  hxOlimpo/gl-robotica  →  creado')
} catch (e) { console.error('\n  ❌  hxOlimpo/gl-robotica:', e.message) }

try {
  await createDoc('hxOlimpo', 'config', {
    ownerEmail: 'adminapp@hyperionx.tech', creadoEn: new Date().toISOString(),
  })
  console.log('  ✅  hxOlimpo/config  →  creado')
} catch (e) { console.error('  ❌  hxOlimpo/config:', e.message) }

console.log('\n🎉  Todo listo.')
