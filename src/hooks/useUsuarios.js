import { useState, useEffect } from 'react'
import { db, auth, functions } from '../lib/firebase'
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { logError } from '../lib/logger'
import { darDeBajaOperador } from '../lib/bajaOperador'

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'usuarios'), snap => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, (e) => logError('useUsuarios', e))
    return () => unsub()
  }, [])

  // El alta la hace una Cloud Function con Admin SDK (verifica que el llamador sea
  // admin server-side). Antes se creaba la cuenta desde el navegador con el signUp
  // público; moverlo al servidor permite apagar ese signUp sin romper el alta.
  const crearOperador = async (datos, password) => {
    setError(null)
    try {
      const crearUsuario = httpsCallable(functions, 'crearUsuario')
      const res = await crearUsuario({ ...datos, password })
      return { uid: res.data?.uid ?? null, error: null }
    } catch (e) {
      const msg = e.code === 'functions/already-exists'
        ? 'El correo ya tiene una cuenta registrada'
        : (e.message || 'No se pudo crear el usuario')
      setError(msg)
      return { uid: null, error: msg }
    }
  }

  const actualizarOperador = async (uid, datos) => {
    setError(null)
    try {
      const CAMPOS_EDITABLES = [
        'nombre', 'rut', 'telefono', 'correoCorporativo', 'foto',
        'teamId', 'teamOrigen', 'coberturas', 'empresaId', 'esRelevo', 'area', 'proveedor', 'estado', 'rol',
        'passwordCambiado', 'movilHabilitado', 'whatsappBitacora',
      ]
      const patch = Object.fromEntries(
        Object.entries(datos).filter(([k]) => CAMPOS_EDITABLES.includes(k))
      )
      await updateDoc(doc(db, 'usuarios', uid), {
        ...patch,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.uid ?? '',
      })
    } catch (e) {
      setError(e.message)
    }
  }

  // Baja completa: además de la ficha, limpia los rosters espejo de todos los
  // centros y del kit de apertura, y anonimiza su nombre en el historial del
  // centro (bitácoras y entregas). Ver lib/bajaOperador.js.
  const eliminarOperador = async (uid) => {
    setError(null)
    try {
      const resumen = await darDeBajaOperador(uid)
      return { resumen, error: null }
    } catch (e) {
      logError('useUsuarios/eliminarOperador', e)
      const msg = 'No se pudo eliminar por completo. No se borró nada: revisa tu conexión e intenta de nuevo.'
      setError(msg)
      return { resumen: null, error: msg }
    }
  }

  // Importación masiva desde lista de objetos. onProgreso(actual, total) es callback opcional.
  const importarLista = async (lista, passwordDefault, onProgreso) => {
    setCargando(true)
    const resultados = []
    for (let i = 0; i < lista.length; i++) {
      const op = lista[i]
      const r  = await crearOperador(op, (op.password?.trim() || passwordDefault))
      resultados.push({ nombre: op.nombre, correoCorporativo: op.correoCorporativo, ...r })
      onProgreso?.(i + 1, lista.length)
    }
    setCargando(false)
    return resultados
  }

  return { usuarios, cargando, error, crearOperador, actualizarOperador, eliminarOperador, importarLista }
}
