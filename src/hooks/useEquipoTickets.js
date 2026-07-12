import { useState, useEffect, useRef } from 'react'
import { db, auth } from '../lib/firebase'
import {
  collection, addDoc, onSnapshot,
  updateDoc, doc, query, where, arrayUnion
} from 'firebase/firestore'
import { confirmarRecepcionEquipo } from '../lib/equipoRecepcion'
import { claveFalla } from '../lib/equipoTickets'
import { CAMPOS } from '../components/tabs/TabROV'
import { logError } from '../lib/logger'

// `teamId`: opcional, mismo criterio que useDespachos.js (operador con team propio filtra,
// admin/supervisor no).
export function useEquipoTickets(centroId, teamId) {
  const [tickets, setTickets]           = useState([])
  const [fallasSinTicket, setFallasSinTicket] = useState([])
  const [cargando, setCargando]         = useState(true)
  const ticketsRef = useRef([])
  const recalcRef  = useRef(null)

  useEffect(() => {
    if (!centroId) return
    const filtros = [where('centroId', '==', centroId)]
    if (teamId) filtros.push(where('teamAsignado', '==', teamId))
    const q     = query(collection(db, 'equipoTickets'), ...filtros)
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !d.eliminado)
      setTickets(data.sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? '')))
      setCargando(false)
    }, (e) => {
      logError('useEquipoTickets', e)
      setCargando(false)
    })
    return () => unsub()
  }, [centroId, teamId])

  useEffect(() => {
    ticketsRef.current = tickets
    if (recalcRef.current) recalcRef.current()
  }, [tickets])

  // Fallas activas en equipos/rov sin ticket abierto (estado !== 'recibido') que las cubra.
  useEffect(() => {
    if (!centroId) return
    let rovData = { principal: {}, backup: {} }

    const recalc = () => {
      const candidatos = []
      for (const equipo of ['principal', 'backup']) {
        const estados = rovData[equipo]?.estados ?? {}
        const fallas  = rovData[equipo]?.fallas ?? {}
        CAMPOS.filter(c => !c.sinFalla).forEach(c => {
          if (estados[c.key] === 'falla') {
            candidatos.push({ centroId, equipo, campo: c.key, campoLabel: c.label, fallaMotivo: fallas[c.key] ?? '' })
          }
        })
      }
      const cubiertas = new Set(
        ticketsRef.current.filter(t => t.estado !== 'recibido').map(claveFalla)
      )
      setFallasSinTicket(candidatos.filter(c => !cubiertas.has(claveFalla(c))))
    }
    recalcRef.current = recalc

    const unsub = onSnapshot(doc(db, 'centros', centroId, 'equipos', 'rov'), snap => {
      const d = snap.exists() ? snap.data() : {}
      rovData = { principal: d.principal ?? {}, backup: d.backup ?? {} }
      recalc()
    })
    return () => { unsub(); recalcRef.current = null }
  }, [centroId])

  const solicitarBaja = async ({ centroId, centroNombre, teamAsignado, equipo, campo, campoLabel, fallaMotivo }) => {
    const uid = auth.currentUser?.uid ?? null
    const ts  = new Date().toISOString()
    await addDoc(collection(db, 'equipoTickets'), {
      centroId, centroNombre,
      teamAsignado: teamAsignado ?? null,
      origen: 'falla_equipo',
      equipo, campo, campoLabel,
      fallaMotivo: fallaMotivo ?? '',
      estado: 'solicitado',
      creadoEn: ts, creadoPor: uid,
      historial: [{ tipo: 'solicitado', uid, ts }],
    })
  }

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

  // Soft-delete: conserva la evidencia para auditoría.
  const eliminarTicket = async (id) => {
    await updateDoc(doc(db, 'equipoTickets', id), {
      eliminado: true, eliminadoPor: auth.currentUser?.uid ?? null, eliminadoEn: new Date().toISOString(),
    })
  }

  return {
    tickets, fallasSinTicket, cargando,
    solicitarBaja, marcarDespachadoTaller, marcarReemplazoEnviado, confirmarRecepcion, eliminarTicket,
  }
}
