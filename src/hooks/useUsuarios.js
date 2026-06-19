import { useState, useEffect } from 'react'
import { db, secondaryAuth, auth } from '../lib/firebase'
import { collection, onSnapshot, setDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signOut, deleteUser } from 'firebase/auth'

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'usuarios'), snap => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  const crearOperador = async (datos, password) => {
    setError(null)
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, datos.correoCorporativo, password)
      const uid  = cred.user.uid
      try {
        await setDoc(doc(db, 'usuarios', uid), {
          rol:                datos.rol                ?? 'operador',
          nombre:             datos.nombre             ?? '',
          rut:                datos.rut                ?? '',
          telefono:           datos.telefono           ?? '',
          correoCorporativo:  datos.correoCorporativo,
          foto:               datos.foto               ?? null,
          teamId:             datos.teamId             ?? null,
          empresaId:          datos.empresaId          ?? null,
          esRelevo:           datos.esRelevo           ?? false,
          area:               datos.area               ?? '',
          proveedor:          datos.proveedor          ?? '',
          estado:             datos.estado             ?? 'pendiente',
          passwordCambiado:   false,
          createdAt:          new Date().toISOString(),
          createdBy:          auth.currentUser?.uid    ?? '',
          updatedAt:          new Date().toISOString(),
          updatedBy:          auth.currentUser?.uid    ?? '',
        })
      } catch (e) {
        // Rollback: borrar la cuenta de Auth recién creada para no dejar huérfana.
        try { await deleteUser(secondaryAuth.currentUser) } catch (_) { /* noop */ }
        throw e
      } finally {
        await signOut(secondaryAuth)
      }
      return { uid, error: null }
    } catch (e) {
      const msg = e.code === 'auth/email-already-in-use'
        ? 'El correo ya tiene una cuenta registrada'
        : e.message
      setError(msg)
      return { uid: null, error: msg }
    }
  }

  const actualizarOperador = async (uid, datos) => {
    setError(null)
    try {
      const CAMPOS_EDITABLES = [
        'nombre', 'rut', 'telefono', 'correoCorporativo', 'foto',
        'teamId', 'empresaId', 'esRelevo', 'area', 'proveedor', 'estado', 'rol',
        'passwordCambiado',
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

  const eliminarOperador = async (uid) => {
    try {
      await deleteDoc(doc(db, 'usuarios', uid))
    } catch (e) {
      setError(e.message)
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
