/**
 * scripts/migrate-olimpo.mjs
 * Migra datos del panel Olimpo v0.1 → v2.0
 *   - Crea hxProductos/rovsystem-acuicultura
 *   - Crea hxClientes/gl-robotica (desde hxOlimpo/gl-robotica)
 *   - Agrega empresaId: "gl-robotica" a usuarios omar/mleal/dario
 *
 * Uso: node scripts/migrate-olimpo.mjs
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const ft    = 'C:/Users/robotico/AppData/Roaming/npm/node_modules/firebase-tools/lib'
const auth  = require(ft + '/auth')
const apiv2 = require(ft + '/apiv2')

const PROJECT = 'gl-app-dbdf2'
const BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

const acct = auth.getAllAccounts()[0]
if (!acct) throw new Error('No hay cuenta en firebase-tools. Ejecuta: firebase login')
apiv2.setRefreshToken(acct.tokens.refresh_token)

async function getToken() { return apiv2.getAccessToken() }

function toFS(obj) {
  const fields = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined)  fields[k] = { nullValue: null }
    else if (typeof v === 'boolean')    fields[k] = { booleanValue: v }
    else if (typeof v === 'number')     fields[k] = { integerValue: String(v) }
    else if (typeof v === 'string')     fields[k] = { stringValue: v }
    else if (v instanceof Date)         fields[k] = { timestampValue: v.toISOString() }
    else if (typeof v === 'object')     fields[k] = { mapValue: { fields: toFS(v) } }
  }
  return fields
}

async function getDoc(path) {
  const token = await getToken()
  const res   = await fetch(`${BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

async function patch(path, data, fieldPaths) {
  const token = await getToken()
  const mask  = fieldPaths.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&')
  const res   = await fetch(`${BASE}/${path}?${mask}`, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ fields: toFS(data) }),
  })
  if (!res.ok) throw new Error(`PATCH ${path}: ${res.status} ${(await res.text()).slice(0, 300)}`)
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
  if (!res.ok) throw new Error(`POST ${col}/${docId}: ${res.status} ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

// ─── UIDs de operadores GL Robótica ───────────────────────────────────────────
const GL_USUARIOS = [
  { uid: 'CWyJOHFwkudtvua5Bho1Q8GRaGx2', email: 'omar.guajardo@glrobotica.cl' },
  { uid: 'Ztf6VciPI8YD7qS5a6z8x0pXlHI2', email: 'dario.ruz@glrobotica.cl' },
  { uid: 'x8w1h6jq4oPp4Swvb5jz9VhpWHo2', email: 'mleal@glrobotica.cl' },
]

// ─── MAIN ─────────────────────────────────────────────────────────────────────
console.log('\n🚀  Migración Olimpo v0.1 → v2.0\n')

// 1. hxProductos/rovsystem-acuicultura
try {
  await createDoc('hxProductos', 'rovsystem-acuicultura', {
    nombre:      'RovSystem Acuicultura',
    descripcion: 'Sistema de gestión de ROVs para centros acuícolas',
    estado:      'activo',
    creadoEn:    new Date().toISOString(),
  })
  console.log('  ✅  hxProductos/rovsystem-acuicultura  →  creado')
} catch (e) { console.error('  ❌  hxProductos:', e.message) }

// 2. hxClientes/gl-robotica — migrar desde hxOlimpo/gl-robotica
try {
  const oldDoc = await getDoc('hxOlimpo/gl-robotica')
  const old    = oldDoc ? Object.fromEntries(
    Object.entries(oldDoc.fields ?? {}).map(([k, v]) => [k, v.stringValue ?? v.integerValue ?? v.booleanValue ?? v.nullValue ?? null])
  ) : {}

  await createDoc('hxClientes', 'gl-robotica', {
    nombre:      old.nombre      ?? 'GL Robótica',
    productoId:  'rovsystem-acuicultura',
    estado:      old.estado      ?? 'activa',
    plan: {
      tarifaBase:      1000000,
      moneda:          'CLP',
      descripcion:     'Plan Estándar',
      diaVencimiento:  19,
    },
    licencia: {
      fechaInicio:        old.fechaInicio ?? new Date().toISOString(),
      tipo:               'mensual',
      mejorasDisponibles: 2,
      mejorasUsadas:      0,
    },
    soporte: {
      mensualidad: 0,
      activo:      true,
    },
    moviles: {
      plan:         'tarifa-plana',
      incluidos:    4,
      tarifaExtra:  0,
    },
    contacto: {
      nombre: 'Omar Guajardo',
      email:  'omar.guajardo@glrobotica.cl',
      tel:    '',
    },
    queryMetricas: {
      campo: 'empresaId',
      valor: 'gl-robotica',
    },
    creadoEn: new Date().toISOString(),
  })
  console.log('  ✅  hxClientes/gl-robotica  →  creado (migrado desde hxOlimpo)')
} catch (e) { console.error('  ❌  hxClientes/gl-robotica:', e.message) }

// 3. empresaId en usuarios GL Robótica
console.log('\n  Asignando empresaId: "gl-robotica" a operadores...')
for (const u of GL_USUARIOS) {
  try {
    await patch(`usuarios/${u.uid}`, { empresaId: 'gl-robotica' }, ['empresaId'])
    console.log(`  ✅  ${u.email}  →  empresaId: "gl-robotica"`)
  } catch (e) {
    console.error(`  ❌  ${u.email}: ${e.message}`)
  }
}

// 4. Expandir hxOlimpo/config con campos nuevos
try {
  await patch('hxOlimpo/config', {
    empresa: {
      razonSocial: '',
      rut:         '',
      email:       'adminapp@hyperionx.tech',
    },
    cuentaBancaria: {
      banco:          '',
      numero:         '',
      tipo:           '',
      rut:            '',
      nombreTitular:  '',
    },
  }, ['empresa', 'cuentaBancaria'])
  console.log('\n  ✅  hxOlimpo/config  →  expandido con empresa + cuentaBancaria')
} catch (e) { console.error('\n  ❌  hxOlimpo/config:', e.message) }

console.log('\n🎉  Migración completada.\n')
