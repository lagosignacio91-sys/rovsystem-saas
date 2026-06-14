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
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email ?? 'null')
      if (firebaseUser) {
        setUser(firebaseUser)
        try {
          const docRef  = doc(db, 'usuarios', firebaseUser.uid)
          const docSnap = await getDoc(docRef)
          const rolReal = docSnap.exists() ? docSnap.data().rol : 'operador'
          setRole(rolReal)
        } catch (e) {
          console.error('Error obteniendo rol:', e)
          // Sin permiso de lectura → privilegio mínimo (operador), nunca admin
          setRole('operador')
        }
      } else {
        setUser(null)
        setRole(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    try {
      console.log('Intentando login con:', email)
      const result = await signInWithEmailAndPassword(auth, email, password)
      console.log('Login exitoso:', result.user.email)
      return { error: null }
    } catch (error) {
      console.error('Error login:', error.code, error.message)
      return { error }
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return { user, role, loading, signIn, signOut }
}