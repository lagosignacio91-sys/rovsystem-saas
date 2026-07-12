import { useState, useEffect, useMemo } from 'react'
import { db, auth } from '../lib/firebase'
import { collection, onSnapshot, updateDoc, doc, arrayUnion, query, where } from 'firebase/firestore'
import { confirmarRecepcionEquipo } from '../lib/equipoRecepcion'
import { logError } from '../lib/logger'

// Escucha todos los tickets de equipo. Si role='operador' y hay teamId, filtra solo los propios.
export function useEquipoTicketsGlobal({ role, teamId } = {}) {
  const [tickets, setTickets]   = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    // Esperar a que el rol esté cargado (LV-02): con role null pero usuario operador,
    // un query sin `where` por team se deniega ('false for list').
    if (!role) { setCargando(true); return }
    if (role === 'operador' && !teamId) { setCargando(true); return }

    const ref = (role === 'operador' && teamId)
      ? query(collection(db, 'equipoTickets'), where('teamAsignado', '==', teamId))
      : collection(db, 'equipoTickets')

    const unsub = onSnapshot(ref, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !d.eliminado)
      if (role === 'operador' && teamId) {
        data = data.filter(d => d.teamAsignado === teamId)
      }
      data.sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? ''))
      setTickets(data)
      setCargando(false)
    }, (e) => {
      logError('useEquipoTicketsGlobal', e)
      setCargando(false)
    })
    return () => unsub()
  }, [role, teamId])

  const marcarDespachadoTaller = async (id) => {
    const uid = auth.currentUser?.uid ?? null
    const ts  = new Date().toISOString()
    await updateDoc(doc(db, 'equipoTickets', id), {
      estado: 'despachado_taller',
      despachadoTallerEn: ts, despachadoTallerPor: uid,
      historial: arrayUnion({ tipo: 'despachado_taller', uid, ts }),
    })
  }

  const marcarReemplazoEnviado = async (id, { detalle } = {}) => {
    const uid = auth.currentUser?.uid ?? null
    const ts  = new Date().toISOString()
    await updateDoc(doc(db, 'equipoTickets', id), {
      estado: 'reemplazo_enviado',
      reemplazoEnviadoEn: ts, reemplazoEnviadoPor: uid,
      reemplazoDetalle: detalle ?? '',
      historial: arrayUnion({ tipo: 'reemplazo_enviado', uid, ts }),
    })
  }

  const confirmarRecepcion = async (id, { observacion } = {}) => {
    await confirmarRecepcionEquipo(id, { observacion })
  }

  const eliminarTicket = async (id) => {
    await updateDoc(doc(db, 'equipoTickets', id), {
      eliminado: true, eliminadoPor: auth.currentUser?.uid ?? null, eliminadoEn: new Date().toISOString(),
    })
  }

  const abiertos = useMemo(() => tickets.filter(t => t.estado !== 'recibido'), [tickets])

  return { tickets, abiertos, cargando, marcarDespachadoTaller, marcarReemplazoEnviado, confirmarRecepcion, eliminarTicket }
}
