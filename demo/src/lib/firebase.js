import { initializeApp } from 'firebase/app'
import { getFirestore }  from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            'AIzaSyCaXUspHhay2WPo_9LuFx8kAwPKAn6M2WE',
  authDomain:        'gl-app-dbdf2.firebaseapp.com',
  projectId:         'gl-app-dbdf2',
  storageBucket:     'gl-app-dbdf2.firebasestorage.app',
  messagingSenderId: '363876625056',
  appId:             '1:363876625056:web:b1de5cbda3a69f8fd7b7c5',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
