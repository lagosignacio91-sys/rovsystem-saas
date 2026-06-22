import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, CACHE_SIZE_UNLIMITED } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const required = (key) => {
  const val = import.meta.env[key]
  if (!val) throw new Error(`Variable de entorno ${key} no configurada. Revisa .env o Vercel.`)
  return val
}

const firebaseConfig = {
  apiKey:            required('VITE_FIREBASE_API_KEY'),
  authDomain:        required('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId:         required('VITE_FIREBASE_PROJECT_ID'),
  storageBucket:     required('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: required('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId:             required('VITE_FIREBASE_APP_ID'),
}

const app = initializeApp(firebaseConfig)

// App secundaria: crea cuentas Auth sin desloguear al admin de la sesión principal
const secondaryApp = initializeApp(firebaseConfig, 'Secondary')

export const auth          = getAuth(app)
export const secondaryAuth = getAuth(secondaryApp)
export const db      = initializeFirestore(app, {
  localCache: persistentLocalCache({ cacheSizeBytes: CACHE_SIZE_UNLIMITED }),
})
export const storage = getStorage(app)
