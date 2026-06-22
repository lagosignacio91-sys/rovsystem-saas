import { useState, useEffect, useRef, useMemo } from 'react'
import { db, auth } from '../lib/firebase'
import { collection, onSnapshot, updateDoc, doc, arrayUnion } from 'firebase/firestore'
import { aplicarRecepcionStock } from '../lib/recepcion'

// Escucha los despachos. Si se pasa role='operador' y teamId, filtra solo los del propio team.
// onNuevaSolicitud(d): callback opcional llamado cuando llega un despacho nuevo (para toasts).
export function useDespachosGlobal({ role, teamId, onNuevaSolicitud, onDespachoCambia } = {}) {
  const [despachos, setDespachos] = useState([])
  const [cargando, setCargando]   = useState(true)
  const prevIds = useRef(null)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'despachos'), (snap) => {
      let data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => !d.eliminado)

      // Operador solo ve despachos de su propio team
      if (role === 'operador' && teamId) {
        data = data.filter(d => d.teamAsignado === teamId)
      }

      data.sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? ''))

      // Detectar nuevas solicitudes pendientes para notificar al supervisor
      if (prevIds.current !== null && onNuevaSolicitud) {
        const nuevos = data.filter(d => d.estado === 'pendiente' && !prevIds.current.has(d.id))
        nuevos.forEach(d => onNuevaSolicitud(d))
      }

      // Detectar cambios de estado para notificar al operador
      if (prevIds.current !== null && onDespachoCambia) {
        snap.docChanges().forEach(change => {
          if (change.type === 'modified') {
            const d = { id: change.doc.id, ...change.doc.data() }
            if (!d.eliminado && (role === 'operador' ? d.teamAsignado === teamId : true)) {
              onDespachoCambia(d)
            }
          }
        })
      }

      prevIds.current = new Set(data.map(d => d.id))
      setDespachos(data)
      setCargando(false)
    })
    return () => unsub()
  }, [role, teamId])

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

  const pendientes = useMemo(
    () => despachos.filter(d => d.estado === 'pendiente' || d.estado === 'enviado' || d.estado === 'parcial'),
    [despachos]
  )

  return { despachos, pendientes, cargando, marcarEnviado, confirmarRecepcion, eliminarDespacho }
}
