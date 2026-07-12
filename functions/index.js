const { onDocumentDeleted } = require('firebase-functions/v2/firestore')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp }     = require('firebase-admin/app')
const { getAuth }           = require('firebase-admin/auth')
const { getFirestore }      = require('firebase-admin/firestore')

initializeApp()

const ROLES_VALIDOS = ['operador', 'supervisor', 'admin', 'owner', 'ventas']

/**
 * Alta de usuarios server-side (S-01 / auto-registro).
 * Antes el frontend creaba la cuenta con createUserWithEmailAndPassword (API de
 * signUp pública), lo que obligaba a dejar habilitado el auto-registro. Ahora la
 * creación la hace el Admin SDK dentro de esta función, verificando que el
 * llamador sea admin CONTRA Firestore (no se confía en el cliente). Esto permite
 * apagar el signUp público en la consola sin romper el alta de operadores.
 */
exports.crearUsuario = onCall(async (request) => {
  const caller = request.auth
  if (!caller) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')

  const callerSnap = await getFirestore().doc(`usuarios/${caller.uid}`).get()
  if (!callerSnap.exists || callerSnap.data().rol !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo un administrador puede crear usuarios.')
  }

  const { password, ...datos } = request.data || {}
  const email = (datos.correoCorporativo || '').trim()
  const rol   = datos.rol || 'operador'

  if (!email) throw new HttpsError('invalid-argument', 'El correo corporativo es obligatorio.')
  if (typeof password !== 'string' || password.length < 6) {
    throw new HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.')
  }
  if (!ROLES_VALIDOS.includes(rol)) throw new HttpsError('invalid-argument', 'Rol inválido.')

  // 1) Cuenta de Auth (Admin SDK).
  let userRecord
  try {
    userRecord = await getAuth().createUser({ email, password, displayName: datos.nombre || '' })
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'El correo ya tiene una cuenta registrada.')
    }
    throw new HttpsError('internal', e.message)
  }

  // 2) Perfil en Firestore; si falla, rollback de la cuenta Auth (no dejar huérfana).
  try {
    const now = new Date().toISOString()
    await getFirestore().doc(`usuarios/${userRecord.uid}`).set({
      rol,
      nombre:            datos.nombre            ?? '',
      rut:               datos.rut               ?? '',
      telefono:          datos.telefono          ?? '',
      correoCorporativo: email,
      foto:              datos.foto              ?? null,
      teamId:            datos.teamId            ?? null,
      empresaId:         datos.empresaId         ?? null,
      movilHabilitado:   datos.movilHabilitado   ?? false,
      esRelevo:          datos.esRelevo          ?? false,
      area:              datos.area              ?? '',
      proveedor:         datos.proveedor         ?? '',
      estado:            datos.estado            ?? 'pendiente',
      passwordCambiado:  false,
      createdAt:         now,
      createdBy:         caller.uid,
      updatedAt:         now,
      updatedBy:         caller.uid,
    })
  } catch (e) {
    try { await getAuth().deleteUser(userRecord.uid) } catch (_) { /* noop */ }
    throw new HttpsError('internal', 'No se pudo crear el perfil: ' + e.message)
  }

  return { uid: userRecord.uid }
})

/**
 * Al eliminar un documento en /usuarios/{uid}, elimina automáticamente
 * la cuenta de Firebase Auth correspondiente. Esto evita que operadores
 * borrados del sistema puedan seguir iniciando sesión.
 */
exports.eliminarUsuarioAuth = onDocumentDeleted('usuarios/{uid}', async (event) => {
  const uid = event.params.uid
  try {
    await getAuth().deleteUser(uid)
    console.log(`Auth user ${uid} eliminado correctamente`)
  } catch (error) {
    if (error.code === 'auth/user-not-found') return
    console.error(`Error eliminando Auth user ${uid}:`, error)
  }
})
