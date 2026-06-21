import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../lib/firebase'

export function useHxDocs() {
  const [docs,     setDocs]     = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'hxDocs'), orderBy('creadoEn', 'desc'))
    const unsub = onSnapshot(q,
      snap => { setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setCargando(false) },
      () => setCargando(false)
    )
    return unsub
  }, [])

  function subirDoc({ archivo, nombre, clienteId, tipo, subidoPor }, onProgress) {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `hxDocs/${Date.now()}_${archivo.name}`)
      const task = uploadBytesResumable(storageRef, archivo)
      task.on('state_changed',
        snap => onProgress && onProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
        reject,
        async () => {
          const url = await getDownloadURL(task.snapshot.ref)
          await addDoc(collection(db, 'hxDocs'), {
            nombre, clienteId, tipo, url,
            storageRef: storageRef.fullPath,
            tamaño: archivo.size,
            subidoPor, creadoEn: serverTimestamp(),
          })
          resolve()
        }
      )
    })
  }

  async function eliminarDoc(id, storageRefPath) {
    if (storageRefPath) {
      try { await deleteObject(ref(storage, storageRefPath)) } catch { /* ya eliminado */ }
    }
    await deleteDoc(doc(db, 'hxDocs', id))
  }

  return { docs, subirDoc, eliminarDoc, cargando }
}
