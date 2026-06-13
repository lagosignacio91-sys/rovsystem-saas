import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? 'AIzaSyCaXUspHhay2WPo_9LuFx8kAwPKAn6M2WE',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? 'gl-app-dbdf2.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? 'gl-app-dbdf2',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? 'gl-app-dbdf2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '363876625056',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '1:363876625056:web:b1de5cbda3a69f8fd7b7c5',
}

const app  = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db   = getFirestore(app)