import { useState, useEffect, useRef, useMemo } from 'react'
import { db, auth } from '../lib/firebase'
import { collection, onSnapshot, updateDoc, doc, arrayUnion, query, where } from 'firebase/firestore'
import { confirmarRecepcionItems } from '../lib/recepcion'
import { calcularEstadoDespacho, claveItem, normalizarItemsLegacy } from '../lib/despachos'
import { logError } from '../lib/logger'

// Escucha los despachos. Si se pasa role='operador' y teamId, filtra solo los del propio team.
// onNuevaSolicitud(d): callback opcional llamado cuando llega un despacho nuevo (para toasts).
export function useDespachosGlobal({ role, teamId, onNuevaSolicitud, onDespachoCambia } = {}) {
  const [despachos, setDespachos] = useState([])
  const [cargando, setCargando]   = useState(true)
  const prevIds = useRef(null)

  useEffect(() => {
    // Operador: esperar a que cargue el team antes de suscribirse (evita un query sin
    // el `where` que la regla de Firestore exige para poder listar).
    if (role === 'operador' && !teamId) { setCargando(true); return }

    const ref = (role === 'operador' && teamId)
      ? query(collection(db, 'despachos'), where('teamAsignado', '==', teamId))
      : collection(db, 'despachos')

    const unsub = onSnapshot(ref, (snap) => {
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
    }, (e) => { logError('useDespachosGlobal', e); setCargando(false) })
    return () => unsub()
  }, [role, teamId])

  // Sin cambios: único punto de acoplamiento con Bodega Virtual (marca todo el despacho
  // enviado + descuenta stock central). No tocar firma ni comportamiento.
  const marcarEnviado = async (id, itemsEnviados, extras = {}) => {
    const uid = auth.currentUser?.uid ?? null
    const ts  = new Date().toISOString()
    await updateDoc(doc(db, 'despachos', id), {
      estado: 'enviado', enviadoEn: ts, despachadoPor: uid, itemsEnviados: itemsEnviados ?? [],
      historial: arrayUnion({ tipo: 'enviado', uid, ts }),
      ...extras,
    })
  }

  // Pasa ítems puntuales de 'pendiente' a 'enviado' dentro del mismo despacho.
  const enviarItemsPendientes = async (id, itemKeys) => {
    const uid  = auth.currentUser?.uid ?? null
    const ts   = new Date().toISOString()
    const desp = despachos.find(d => d.id === id)
    if (!desp) return
    const items = normalizarItemsLegacy(desp).map(it =>
      itemKeys.includes(claveItem(it)) && it.estadoItem === 'pendiente'
        ? { ...it, estadoItem: 'enviado', enviadoEn: ts, enviadoPor: uid }
        : it
    )
    await updateDoc(doc(db, 'despachos', id), {
      items,
      estado:    calcularEstadoDespacho(items),
      historial: arrayUnion({ tipo: 'enviado_items', uid, ts, itemKeys }),
    })
  }

  const confirmarRecepcion = async (id, itemKeys, observacion = '') => {
    await confirmarRecepcionItems(id, itemKeys, { observacion })
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

  return { despachos, pendientes, cargando, marcarEnviado, enviarItemsPendientes, confirmarRecepcion, eliminarDespacho }
}
