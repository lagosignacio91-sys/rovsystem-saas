import { useState, useEffect } from 'react'
import { db, auth } from '../lib/firebase'
import { collection, onSnapshot, updateDoc, doc, arrayUnion } from 'firebase/firestore'
import { aplicarRecepcionStock } from '../lib/recepcion'

// Escucha TODOS los despachos (vista global de la sección Despachos).
export function useDespachosGlobal() {
  const [despachos, setDespachos] = useState([])
  const [cargando, setCargando]   = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'despachos'), (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => !d.eliminado)   // ocultar soft-deleted
      data.sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? ''))
      setDespachos(data)
      setCargando(false)
    })
    return () => unsub()
  }, [])

  const marcarEnviado = async (id, itemsEnviados, extras = {}) => {
    const uid = auth.currentUser?.uid ?? null
    const ts  = new Date().toISOString()
    await updateDoc(doc(db, 'despachos', id), {
      estado: 'enviado', enviadoEn: ts, despachadoPor: uid, itemsEnviados: itemsEnviados ?? [],
      historial: arrayUnion({ tipo: 'enviado', uid, ts }),
      ...extras,
    })
  }
  const confirmarRecepcion = async (id, observacion = '', completo = true) => {
    const uid  = auth.currentUser?.uid ?? null
    const ts   = new Date().toISOString()
    const desp = despachos.find(d => d.id === id)
    const aplicar = desp && !desp.stockAplicado
    await updateDoc(doc(db, 'despachos', id), {
      estado: completo ? 'recibido' : 'parcial', recibidoEn: ts, recibidoPor: uid, observacion,
      historial: arrayUnion({ tipo: completo ? 'recibido' : 'parcial', uid, ts }),
      ...(aplicar ? { stockAplicado: true } : {}),
    })
    if (aplicar) {
      await aplicarRecepcionStock(desp.centroId, desp.itemsEnviados ?? desp.items ?? [])
    }
  }
  // Soft-delete: conserva la evidencia para auditoría.
  const eliminarDespacho = async (id) => {
    await updateDoc(doc(db, 'despachos', id), {
      eliminado: true, eliminadoPor: auth.currentUser?.uid ?? null, eliminadoEn: new Date().toISOString(),
    })
  }

  const pendientes = despachos.filter(d => d.estado === 'pendiente' || d.estado === 'enviado' || d.estado === 'parcial')

  return { despachos, pendientes, cargando, marcarEnviado, confirmarRecepcion, eliminarDespacho }
}
