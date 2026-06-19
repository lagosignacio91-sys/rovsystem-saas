import { useState, useEffect } from 'react'
import { db, auth } from '../lib/firebase'
import {
  collection, addDoc, onSnapshot,
  updateDoc, doc, query, where, arrayUnion
} from 'firebase/firestore'
import { aplicarRecepcionStock } from '../lib/recepcion'

export function useDespachos(centroId) {
  const [despachos, setDespachos]       = useState([])
  const [itemsPendientes, setItemsPendientes] = useState([])
  const [cargando, setCargando]         = useState(true)

  // Escuchar despachos en tiempo real
  useEffect(() => {
    if (!centroId) return
    const q     = query(collection(db, 'despachos'), where('centroId', '==', centroId))
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !d.eliminado)
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

  const crearDespacho = async ({ centroId, centroNombre, items, teamAsignado }) => {
    const uid = auth.currentUser?.uid ?? null
    const ts  = new Date().toISOString()
    await addDoc(collection(db, 'despachos'), {
      centroId,
      centroNombre,
      teamAsignado: teamAsignado ?? null,
      items,
      estado:    'pendiente',
      creadoEn:  ts,
      creadoPor: uid,
      historial: [{ tipo: 'creado', uid, ts }],
    })
  }

  const marcarEnviado = async (id, itemsEnviados) => {
    const uid = auth.currentUser?.uid ?? null
    const ts  = new Date().toISOString()
    await updateDoc(doc(db, 'despachos', id), {
      estado:        'enviado',
      enviadoEn:     ts,
      despachadoPor: uid,
      itemsEnviados,
      historial:     arrayUnion({ tipo: 'enviado', uid, ts }),
    })
  }

  const confirmarRecepcion = async (id, observacion, completo) => {
    const uid  = auth.currentUser?.uid ?? null
    const ts   = new Date().toISOString()
    const desp = despachos.find(d => d.id === id)
    const aplicar = desp && !desp.stockAplicado
    await updateDoc(doc(db, 'despachos', id), {
      estado:      completo ? 'recibido' : 'parcial',
      recibidoEn:  ts,
      recibidoPor: uid,
      observacion,
      historial:   arrayUnion({ tipo: completo ? 'recibido' : 'parcial', uid, ts }),
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

  const despachoPendiente = despachos.find(d =>
    d.estado === 'pendiente' || d.estado === 'enviado' || d.estado === 'parcial'
  )

  return { despachos, itemsPendientes, cargando, crearDespacho, marcarEnviado, confirmarRecepcion, eliminarDespacho, despachoPendiente }
}