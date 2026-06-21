import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useHxEventos() {
  const [eventos,  setEventos]  = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'hxEventos'), orderBy('fecha', 'asc'))
    const unsub = onSnapshot(q,
      snap => { setEventos(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setCargando(false) },
      () => setCargando(false)
    )
    return unsub
  }, [])

  async function agregarEvento({ titulo, fecha, hora, tipo, descripcion, creadoPor }) {
    await addDoc(collection(db, 'hxEventos'), {
      titulo, fecha, hora: hora || null, tipo, descripcion: descripcion || null,
      creadoPor, creadoEn: serverTimestamp(),
    })
  }

  async function eliminarEvento(id) {
    await deleteDoc(doc(db, 'hxEventos', id))
  }

  return { eventos, agregarEvento, eliminarEvento, cargando }
}
