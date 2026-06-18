const { onDocumentDeleted } = require('firebase-functions/v2/firestore')
const { initializeApp }     = require('firebase-admin/app')
const { getAuth }           = require('firebase-admin/auth')

initializeApp()

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
