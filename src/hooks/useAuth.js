import { useState, useEffect } from 'react'
import { auth } from '../lib/firebase'
import { logError } from '../lib/logger'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useAuth() {
  const [user,       setUser]       = useState(null)
  const [role,       setRole]       = useState(null)
  const [teamId,     setTeamId]     = useState(null)
  const [empresaId,  setEmpresaId]  = useState(null)
  const [nombre,     setNombre]     = useState(null)
  const [movilHabilitado, setMovilHabilitado] = useState(false)
  const [aceptoTerminos,  setAceptoTerminos]  = useState(false)
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
        } catch (e) {
          // No asignar rol por defecto ante error de red — mostrar error y pedir re-login.
          logError('useAuth/perfil', e)
          setAuthError('No se pudo cargar tu perfil. Verifica tu conexión y vuelve a iniciar sesión.')
          setRole(null)
          setTeamId(null)
          setEmpresaId(null)
          setNombre(null)
        }
      } else {
        setUser(null)
        setRole(null)
        setTeamId(null)
        setEmpresaId(null)
        setNombre(null)
        setMovilHabilitado(false)
        setAceptoTerminos(false)
        setAuthError(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      return { error: null }
    } catch (error) {
      logError('useAuth/login', error)
      return { error }
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  const aceptarTerminos = async (version = '1.0') => {
    if (!auth.currentUser) return
    await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), {
      aceptoTerminos: { fecha: serverTimestamp(), version },
    })
    setAceptoTerminos(true)
  }

  return { user, role, teamId, empresaId, nombre, movilHabilitado, aceptoTerminos, isOwner: role === 'owner', isVentas: role === 'ventas', loading, authError, signIn, signOut, aceptarTerminos }
}