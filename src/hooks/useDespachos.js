import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import {
  collection, addDoc, onSnapshot,
  updateDoc, deleteDoc, doc, query, where, getDoc
} from 'firebase/firestore'

export function useDespachos(centroId) {
  const [despachos, setDespachos]       = useState([])
  const [itemsPendientes, setItemsPendientes] = useState([])
  const [cargando, setCargando]         = useState(true)

  // Escuchar despachos en tiempo real
  useEffect(() => {
    if (!centroId) return
    const q     = query(collection(db, 'despachos'), where('centroId', '==', centroId))
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setDespachos(data.sort((a, b) => b.creadoEn?.localeCompare(a.creadoEn)))
      setCargando(false)
    })
    return () => unsub()
  }, [centroId])

  // Escuchar herramientas e insumos solicitados en tiempo real
  useEffect(() => {
    if (!centroId) return

    let herData = []
    let insData = []

    const actualizar = () => {
      const items = [
        ...herData.filter(h => h.solicitado || h.cantidad === 0).map(h => ({ ...h, tipo: 'Herramienta' })),
        ...insData.filter(i => i.solicitado || i.cantidad === 0).map(i => ({ ...i, tipo: 'Insumo' })),
      ]
      setItemsPendientes(items)
    }

    const unsubHer = onSnapshot(doc(db, 'centros', centroId, 'datos', 'herramientas'), snap => {
      herData = snap.exists() ? (snap.data().lista ?? []) : []
      actualizar()
    })
    const unsubIns = onSnapshot(doc(db, 'centros', centroId, 'datos', 'insumos'), snap => {
      insData = snap.exists() ? (snap.data().lista ?? []) : []
      actualizar()
    })

    return () => { unsubHer(); unsubIns() }
  }, [centroId])

  const crearDespacho = async ({ centroId, centroNombre, items }) => {
    await addDoc(collection(db, 'despachos'), {
      centroId,
      centroNombre,
      items,
      estado:    'pendiente',
      creadoEn:  new Date().toISOString(),
      historial: [],
    })
  }

  const marcarEnviado = async (id, itemsEnviados) => {
    await updateDoc(doc(db, 'despachos', id), {
      estado:       'enviado',
      enviadoEn:    new Date().toISOString(),
      itemsEnviados,
    })
  }

  const confirmarRecepcion = async (id, observacion, completo) => {
    await updateDoc(doc(db, 'despachos', id), {
      estado:      completo ? 'recibido' : 'parcial',
      recibidoEn:  new Date().toISOString(),
      observacion,
    })
  }

  const eliminarDespacho = async (id) => {
    await deleteDoc(doc(db, 'despachos', id))
  }

  const despachoPendiente = despachos.find(d =>
    d.estado === 'pendiente' || d.estado === 'enviado' || d.estado === 'parcial'
  )

  return { despachos, itemsPendientes, cargando, crearDespacho, marcarEnviado, confirmarRecepcion, eliminarDespacho, despachoPendiente }
}