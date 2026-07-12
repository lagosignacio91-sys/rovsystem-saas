import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, CACHE_SIZE_UNLIMITED, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

const required = (key) => {
  const val = import.meta.env[key]
  if (!val) throw new Error(`Variable de entorno ${key} no configurada. Revisa .env o Vercel.`)
  return val.replace(/^﻿/, '')
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

// ── Emuladores locales (SOLO desarrollo/QA) ──────────────────────────
// Se activan únicamente con VITE_USE_EMULATORS=true en el entorno de build.
// En producción esta rama nunca corre: la app usa el Firebase real.
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  const host = '127.0.0.1'
  connectAuthEmulator(auth,          `http://${host}:9099`, { disableWarnings: true })
  connectAuthEmulator(secondaryAuth, `http://${host}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db,      host, 8080)
  connectStorageEmulator(storage,   host, 9199)
  // eslint-disable-next-line no-console
  console.info('[firebase] Emuladores locales conectados (Auth 9099 · Firestore 8080 · Storage 9199)')
}
