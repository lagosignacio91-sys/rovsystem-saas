import { useState, useEffect } from 'react'
import { auth } from '../lib/firebase'
import { logError } from '../lib/logger'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth'
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useAuth() {
  const [user,       setUser]       = useState(null)
  const [role,       setRole]       = useState(null)
  const [teamId,     setTeamId]     = useState(null)
  const [empresaId,  setEmpresaId]  = useState(null)
  const [nombre,     setNombre]     = useState(null)
  const [movilHabilitado, setMovilHabilitado] = useState(false)
  const [aceptoTerminos,  setAceptoTerminos]  = useState(false)
  const [correoPersonal,  setCorreoPersonal]  = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [authError,  setAuthError]  = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        setAuthError(null)
        try {
          const docRef  = doc(db, 'usuarios', firebaseUser.uid)
          const docSnap = await getDoc(docRef)
          if (!docSnap.exists()) {
            // Cuenta de Auth sin perfil (huérfana): NO asignar rol por defecto.
            setAuthError('Tu cuenta no tiene un perfil asignado. Contacta al administrador.')
            setRole(null); setTeamId(null); setEmpresaId(null); setNombre(null); setMovilHabilitado(false)
            setCorreoPersonal(null)
            setLoading(false)
            return
          }
          const data = docSnap.data()
          setRole((data.rol || 'operador').toLowerCase())
          setTeamId(data.teamId || null)
          setEmpresaId(data.empresaId || null)
          setNombre(data.nombre || null)
          setMovilHabilitado(data.movilHabilitado === true)
          setAceptoTerminos(!!data.aceptoTerminos?.fecha)
          setCorreoPersonal(data.correoPersonal || null)
        } catch (e) {
          // No asignar rol por defecto ante error de red — mostrar error y pedir re-login.
          logError('useAuth/perfil', e)
          setAuthError('No se pudo cargar tu perfil. Verifica tu conexión y vuelve a iniciar sesión.')
          setRole(null)
          setTeamId(null)
          setEmpresaId(null)
          setNombre(null)
          setCorreoPersonal(null)
        }
      } else {
        setUser(null)
        setRole(null)
        setTeamId(null)
        setEmpresaId(null)
        setNombre(null)
        setMovilHabilitado(false)
        setAceptoTerminos(false)
        setCorreoPersonal(null)
        setAuthError(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return { error: null }
    } catch (error) {
      logError('useAuth/login', error)
      return { error }
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  // Cambia la contraseña del usuario logueado. Firebase exige "login reciente"
  // para operaciones sensibles, así que primero re-autenticamos con la clave
  // actual (esto valida que sea correcta) y recién ahí actualizamos a la nueva.
  const cambiarPassword = async (actual, nueva) => {
    const u = auth.currentUser
    if (!u || !u.email) return { error: { code: 'auth/no-user' } }
    try {
      const cred = EmailAuthProvider.credential(u.email, actual)
      await reauthenticateWithCredential(u, cred)
      await updatePassword(u, nueva)
      // Marca que ya cambió la clave inicial (flag que crea `crearUsuario`).
      // Es no-crítico: si falla, la clave igual quedó cambiada.
      try { await updateDoc(doc(db, 'usuarios', u.uid), { passwordCambiado: true }) }
      catch (e) { logError('useAuth/passwordCambiado', e) }
      return { error: null }
    } catch (error) {
      logError('useAuth/cambiarPassword', error)
      return { error }
    }
  }

  const aceptarTerminos = async (version = '1.0') => {
    if (!auth.currentUser) return
    await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), {
      aceptoTerminos: { fecha: serverTimestamp(), version },
    })
    setAceptoTerminos(true)
  }

  const guardarCorreoPersonal = async (correo) => {
    if (!auth.currentUser) return
    const uid = auth.currentUser.uid
    await updateDoc(doc(db, 'usuarios', uid), { correoPersonal: correo })
    setCorreoPersonal(correo)

    // Refleja el correo también en la ficha del centro (centros/{id}/datos/operadores),
    // para no depender de que un admin apriete "Sincronizar operadores" en Centros.
    if (teamId) {
      try {
        const centrosSnap = await getDocs(query(collection(db, 'centros'), where('teamAsignado', '==', teamId)))
        for (const centroDoc of centrosSnap.docs) {
          const ref = doc(db, 'centros', centroDoc.id, 'datos', 'operadores')
          const opsSnap = await getDoc(ref)
          if (!opsSnap.exists()) continue
          const lista = opsSnap.data().lista ?? []
          const idx = lista.findIndex(op => op?.uid === uid)
          if (idx === -1) continue
          const nuevaLista = [...lista]
          nuevaLista[idx] = { ...nuevaLista[idx], correoPersonal: correo }
          await updateDoc(ref, { lista: nuevaLista })
        }
      } catch (e) {
        logError('useAuth/guardarCorreoPersonal', e)
      }
    }
  }

  return { user, role, teamId, empresaId, nombre, movilHabilitado, aceptoTerminos, correoPersonal, isOwner: role === 'owner', isVentas: role === 'ventas', loading, authError, signIn, signOut, cambiarPassword, aceptarTerminos, guardarCorreoPersonal }
}