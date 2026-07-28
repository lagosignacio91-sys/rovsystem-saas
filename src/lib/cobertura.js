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
import { kitBase, esTeamEspecial, teamDeEspecialidad } from './kitScope'

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
    especialidad: user.especialidad ?? prev?.especialidad ?? null,
    estado:       prev?.estado ?? 'descanso',
    ingresoTurno: prev?.ingresoTurno ?? '',
    salidaTurno:  prev?.salidaTurno ?? '',
  }
}

// Doc(s) de roster de un team: un team especial (apertura/soberanía) tiene su roster
// en teams/{team}; un team normal, en el/los centro(s) con ese teamAsignado.
function rosterRefsDeTeam(team, centros) {
  if (!team) return []
  if (esTeamEspecial(team)) return [doc(db, 'teams', team, 'datos', 'operadores')]
  return centros.filter(c => c.teamAsignado === team).map(c => doc(db, 'centros', c.id, 'datos', 'operadores'))
}

// Quita al operador de un doc de roster puntual (best-effort).
async function quitarDeRosterRef(ref, uid) {
  try {
    const snap = await getDoc(ref)
    if (!snap.exists()) return
    const lista = (snap.data().lista ?? []).filter(op => op?.uid !== uid)
    await setDoc(ref, { lista }, { merge: true })
  } catch (e) { logError('cobertura/quitarDeRoster', e) }
}

// Agrega al operador a un doc de roster puntual (best-effort), sin duplicar.
async function agregarARosterRef(ref, user) {
  if (!ref) return
  const uid = uidDe(user)
  try {
    const snap = await getDoc(ref)
    const lista = snap.exists() ? (snap.data().lista ?? []) : []
    const prev = lista.find(op => op?.uid === uid)
    const nueva = [...lista.filter(op => op?.uid !== uid), entradaRoster(user, prev)]
    await setDoc(ref, { lista: nueva }, { merge: true })
  } catch (e) { logError('cobertura/agregarARoster', e) }
}

// Quita al operador del roster de un team (todos los centros de ese team, o el kit
// del team si es especial — apertura/soberanía).
async function quitarDeRoster(uid, centros, team) {
  for (const ref of rosterRefsDeTeam(team, centros)) await quitarDeRosterRef(ref, uid)
}

// Agrega al operador al roster de un centro puntual (best-effort).
async function agregarARoster(user, centro) {
  if (!centro) return
  await agregarARosterRef(doc(db, 'centros', centro.id, 'datos', 'operadores'), user)
}

// Ingresar al operador a `centroDestino` para cubrir turno.
export async function moverACentro(user, centroDestino, centros) {
  const uid = uidDe(user)
  if (!uid || !centroDestino?.teamAsignado) throw new Error('datos insuficientes')
  const teamActual = user.teamId ?? null
  const teamOrigen = user.teamOrigen ?? teamActual
  // Sin un team de origen, la cobertura dejaría teamOrigen=null y "Volver a mi
  // centro" nunca funcionaría (el operador queda varado en el centro cubierto).
  // Mejor abortar y pedir que un admin le asigne su equipo antes de cubrir.
  if (!teamOrigen) throw new Error('No tenés un centro de origen asignado. Pedile a un administrador que te asigne tu equipo antes de cubrir turnos.') // preserva el hogar real aunque encadene coberturas

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

  // 3. Agregarse al roster del hogar (ya con teamId = hogar → permitido). Si el hogar
  //    es un team especial (apertura/soberanía), su roster vive en teams/{team}.
  for (const ref of rosterRefsDeTeam(teamHogar, centros)) {
    await agregarARosterRef(ref, { ...user, teamId: teamHogar })
  }
}

// ------------------------------------------------------------
// Reasignación PERMANENTE (rotación, solo admin): el operador pasa de forma
// definitiva a otro centro — el destino es su nuevo hogar, sin "vuelve a X".
// Distinta de moverACentro (cobertura temporal). No toca el rol; sí iguala la
// empresa a la del centro destino y limpia cualquier cobertura abierta.
//
// Resuelve los rosters con kitBase a partir del objeto `centro` (el destino de una
// reasignación siempre es un centro concreto); la cobertura, en cambio, resuelve por
// team (rosterRefsDeTeam) porque su hogar puede ser un team especial sin centro abierto.
// ------------------------------------------------------------
async function quitarDeRosterCentro(uid, centro) {
  if (!centro) return
  try {
    const ref = doc(db, ...kitBase(centro), 'datos', 'operadores')
    const snap = await getDoc(ref)
    if (!snap.exists()) return
    const lista = (snap.data().lista ?? []).filter(op => op?.uid !== uid)
    await setDoc(ref, { lista }, { merge: true })
  } catch (e) { logError('reasignar/quitarDeRoster', e) }
}

async function agregarARosterCentro(user, centro) {
  if (!centro) return
  const uid = uidDe(user)
  try {
    const ref = doc(db, ...kitBase(centro), 'datos', 'operadores')
    const snap = await getDoc(ref)
    const lista = snap.exists() ? (snap.data().lista ?? []) : []
    const prev = lista.find(op => op?.uid === uid)
    const nueva = [...lista.filter(op => op?.uid !== uid), entradaRoster(user, prev)]
    await setDoc(ref, { lista: nueva }, { merge: true })
  } catch (e) { logError('reasignar/agregarARoster', e) }
}

export async function reasignarCentro(user, centroDestino, centros) {
  const uid = uidDe(user)
  if (!uid || !centroDestino?.teamAsignado) throw new Error('datos insuficientes')
  const teamActual = user.teamId ?? null

  // 1. Sacarse del roster de origen (el centro actual, sea normal o el de apertura team08).
  const centroOrigen = centros.find(c => c.teamAsignado === teamActual) ?? null
  await quitarDeRosterCentro(uid, centroOrigen)

  // 2. Update usuarios (fuente de verdad): nuevo team + empresa del destino, sin teamOrigen.
  //    Cierra cualquier cobertura abierta para no dejarlo "cubriendo". NO cambia el rol.
  const ref = doc(db, 'usuarios', uid)
  const snap = await getDoc(ref)
  const coberturas = (snap.exists() ? (snap.data().coberturas ?? []) : [])
  for (let i = coberturas.length - 1; i >= 0; i--) {
    if (coberturas[i]?.hasta == null) { coberturas[i] = { ...coberturas[i], hasta: hoy() }; break }
  }
  await setDoc(ref, {
    teamId: centroDestino.teamAsignado,
    empresaId: centroDestino.empresaId ?? null,
    teamOrigen: null,
    coberturas,
  }, { merge: true })

  // 3. Agregarse al roster del centro destino (ya con teamId = destino).
  await agregarARosterCentro({ ...user, teamId: centroDestino.teamAsignado }, centroDestino)
}

// Devolver a un piloto especial (apertura/soberanía) a SU propio equipo (team08/team14).
// Sirve cuando quedó en un centro normal por una reasignación permanente: lo trae de
// vuelta a su kit viajero con un clic. No cambia rol ni especialidad ni empresa.
export async function volverAEquipoEspecial(user, centros) {
  const uid = uidDe(user)
  const teamEspecial = teamDeEspecialidad(user?.especialidad)
  if (!uid || !teamEspecial) throw new Error('no es piloto especial')
  const teamActual = user.teamId ?? null
  if (teamActual === teamEspecial) return // ya está en su equipo

  // 1. Sacarse del roster actual (centro normal o kit especial).
  await quitarDeRoster(uid, centros, teamActual)

  // 2. Update usuarios: teamId = su equipo especial, sin teamOrigen, cerrar cobertura abierta.
  const ref = doc(db, 'usuarios', uid)
  const snap = await getDoc(ref)
  const coberturas = (snap.exists() ? (snap.data().coberturas ?? []) : [])
  for (let i = coberturas.length - 1; i >= 0; i--) {
    if (coberturas[i]?.hasta == null) { coberturas[i] = { ...coberturas[i], hasta: hoy() }; break }
  }
  await setDoc(ref, { teamId: teamEspecial, teamOrigen: null, coberturas }, { merge: true })

  // 3. Agregarse al roster de su equipo especial (teams/{teamEspecial}).
  for (const r of rosterRefsDeTeam(teamEspecial, centros)) {
    await agregarARosterRef(r, { ...user, teamId: teamEspecial })
  }
}
