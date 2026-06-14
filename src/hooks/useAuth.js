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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        try {
          const docRef  = doc(db, 'usuarios', firebaseUser.uid)
          const docSnap = await getDoc(docRef)
          const data    = docSnap.exists() ? docSnap.data() : {}
          setRole(data.rol || 'operador')
          setTeamId(data.teamId || null)
          setEmpresaId(data.empresaId || null)
          setNombre(data.nombre || null)
        } catch (e) {
          console.error('Error obteniendo rol:', e)
          setRole('operador')
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

  return { user, role, teamId, empresaId, nombre, loading, signIn, signOut }
}