import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { collection, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore'

// Escucha TODOS los despachos (vista global de la sección Despachos).
export function useDespachosGlobal() {
  const [despachos, setDespachos] = useState([])
  const [cargando, setCargando]   = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'despachos'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? ''))
      setDespachos(data)
      setCargando(false)
    })
    return () => unsub()
  }, [])

  const marcarEnviado = async (id, itemsEnviados, extras = {}) => {
    await updateDoc(doc(db, 'despachos', id), {
      estado: 'enviado', enviadoEn: new Date().toISOString(), itemsEnviados: itemsEnviados ?? [],
      ...extras,
    })
  }
  const confirmarRecepcion = async (id, observacion = '', completo = true) => {
    await updateDoc(doc(db, 'despachos', id), {
      estado: completo ? 'recibido' : 'parcial', recibidoEn: new Date().toISOString(), observacion,
    })
  }
  const eliminarDespacho = async (id) => { await deleteDoc(doc(db, 'despachos', id)) }

  const pendientes = despachos.filter(d => d.estado === 'pendiente' || d.estado === 'enviado' || d.estado === 'parcial')

  return { despachos, pendientes, cargando, marcarEnviado, confirmarRecepcion, eliminarDespacho }
}
