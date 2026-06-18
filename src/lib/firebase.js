import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, CACHE_SIZE_UNLIMITED } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? 'AIzaSyCaXUspHhay2WPo_9LuFx8kAwPKAn6M2WE',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? 'gl-app-dbdf2.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? 'gl-app-dbdf2',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? 'gl-app-dbdf2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '363876625056',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '1:363876625056:web:b1de5cbda3a69f8fd7b7c5',
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
