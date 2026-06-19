import { useState, useEffect } from 'react'
import { auth } from '../lib/firebase'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useAuth() {
  const [user,       setUser]       = useState(null)
  const [role,       setRole]       = useState(null)
  const [teamId,     setTeamId]     = useState(null)
  const [empresaId,  setEmpresaId]  = useState(null)
  const [nombre,     setNombre]     = useState(null)
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
            setRole(null); setTeamId(null); setEmpresaId(null); setNombre(null)
            setLoading(false)
            return
          }
          const data = docSnap.data()
          setRole((data.rol || 'operador').toLowerCase())
          setTeamId(data.teamId || null)
          setEmpresaId(data.empresaId || null)
          setNombre(data.nombre || null)
        } catch (e) {
          // No asignar rol por defecto ante error de red — mostrar error y pedir re-login.
          console.error('Error obteniendo perfil de usuario:', e)
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
      console.error('Error login:', error.code, error.message)
      return { error }
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return { user, role, teamId, empresaId, nombre, loading, authError, signIn, signOut }
}