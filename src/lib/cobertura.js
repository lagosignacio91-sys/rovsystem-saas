// ============================================================
// Cobertura de turnos: un operador se ingresa a otro centro a cubrir "días extra"
// y vuelve al suyo. Se mueve del todo (deja su centro, pasa al destino). El vínculo
// operador↔centro es el `teamId`; cada cobertura queda documentada en usuarios/{uid}.coberturas.
//
// Todo dentro de los permisos del que ejecuta (operador self o admin): el ORDEN importa —
// primero se saca del roster de origen (mientras teamId sigue = origen, la regla lo permite),
// después cambia su teamId (fuente de verdad), y recién ahí se agrega al roster destino.
// Los writes de roster son best-effort: si alguno falla, el admin "Sincronizar operadores"
// reconcilia. El inventario de cada centro NO se toca (vive pegado al centro, no al operador).
// ============================================================
import { db } from './firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { logError } from './logger'

// Fecha LOCAL (no UTC), mismo criterio que las bitácoras.
function hoy() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const uidDe = (u) => u?.id ?? u?.uid ?? null

// Entrada de roster con la misma forma que escribirRoster() en useCentros.js.
function entradaRoster(user, prev) {
  return {
    uid:          uidDe(user),
    nombre:       user.nombre ?? '',
    telefono:     user.telefono ?? '',
    correoCorp:   user.correoCorporativo ?? '',
    foto:         user.foto ?? prev?.foto ?? null,
    esRelevo:     user.esRelevo ?? false,
    estado:       prev?.estado ?? 'descanso',
    ingresoTurno: prev?.ingresoTurno ?? '',
    salidaTurno:  prev?.salidaTurno ?? '',
  }
}

// Quita al operador del roster de todos los centros con ese team (best-effort).
async function quitarDeRoster(uid, centros, team) {
  if (!team) return
  for (const c of centros.filter(c => c.teamAsignado === team)) {
    try {
      const ref = doc(db, 'centros', c.id, 'datos', 'operadores')
      const snap = await getDoc(ref)
      if (!snap.exists()) continue
      const lista = (snap.data().lista ?? []).filter(op => op?.uid !== uid)
      await setDoc(ref, { lista }, { merge: true })
    } catch (e) { logError('cobertura/quitarDeRoster', e) }
  }
}

// Agrega al operador al roster de un centro puntual (best-effort), sin duplicar.
async function agregarARoster(user, centro) {
  if (!centro) return
  const uid = uidDe(user)
  try {
    const ref = doc(db, 'centros', centro.id, 'datos', 'operadores')
    const snap = await getDoc(ref)
    const lista = snap.exists() ? (snap.data().lista ?? []) : []
    const prev = lista.find(op => op?.uid === uid)
    const nueva = [...lista.filter(op => op?.uid !== uid), entradaRoster(user, prev)]
    await setDoc(ref, { lista: nueva }, { merge: true })
  } catch (e) { logError('cobertura/agregarARoster', e) }
}

// Ingresar al operador a `centroDestino` para cubrir turno.
export async function moverACentro(user, centroDestino, centros) {
  const uid = uidDe(user)
  if (!uid || !centroDestino?.teamAsignado) throw new Error('datos insuficientes')
  const teamActual = user.teamId ?? null
  const teamOrigen = user.teamOrigen ?? teamActual // preserva el hogar real aunque encadene coberturas

  // 1. Sacarse del roster de origen (aún con teamId = origen → permitido).
  await quitarDeRoster(uid, centros, teamActual)

  // 2. Update usuarios (fuente de verdad). Lee fresco coberturas para no pisar historial.
  const ref = doc(db, 'usuarios', uid)
  const snap = await getDoc(ref)
  const coberturas = (snap.exists() ? (snap.data().coberturas ?? []) : [])
  coberturas.push({
    centroId: centroDestino.id,
    centroNombre: centroDestino.nombre ?? '',
    teamDestino: centroDestino.teamAsignado,
    teamOrigen,
    desde: hoy(),
    hasta: null,
  })
  await setDoc(ref, { teamId: centroDestino.teamAsignado, teamOrigen, coberturas }, { merge: true })

  // 3. Agregarse al roster destino (ya con teamId = destino → permitido).
  await agregarARoster({ ...user, teamId: centroDestino.teamAsignado }, centroDestino)
}

// Devolver al operador a su centro de origen y cerrar la cobertura abierta.
export async function devolverACentro(user, centros) {
  const uid = uidDe(user)
  if (!uid) throw new Error('datos insuficientes')
  const teamActual = user.teamId ?? null       // el centro que estaba cubriendo
  const teamHogar  = user.teamOrigen ?? null    // a dónde vuelve
  if (!teamHogar) throw new Error('el operador no está cubriendo (sin teamOrigen)')

  // 1. Sacarse del roster del centro cubierto (aún con teamId = destino → permitido).
  await quitarDeRoster(uid, centros, teamActual)

  // 2. Update usuarios: volver al hogar, limpiar teamOrigen, cerrar la última cobertura abierta.
  const ref = doc(db, 'usuarios', uid)
  const snap = await getDoc(ref)
  const coberturas = (snap.exists() ? (snap.data().coberturas ?? []) : [])
  for (let i = coberturas.length - 1; i >= 0; i--) {
    if (coberturas[i]?.hasta == null) { coberturas[i] = { ...coberturas[i], hasta: hoy() }; break }
  }
  await setDoc(ref, { teamId: teamHogar, teamOrigen: null, coberturas }, { merge: true })

  // 3. Agregarse al roster del hogar (ya con teamId = hogar → permitido).
  const centroHogar = centros.find(c => c.teamAsignado === teamHogar) ?? null
  await agregarARoster({ ...user, teamId: teamHogar }, centroHogar)
}
