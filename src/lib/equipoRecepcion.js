// ============================================================
// Cierre del ciclo de un ticket de equipo (falla → baja → reemplazo) al
// confirmar la recepción del equipo operativo. Limpia la falla en
// centros/{centroId}/equipos/rov con el mismo efecto exacto que "Marcar
// operativo" en TabROV.jsx (estados.{campo}='operativo', fallas.{campo}='').
// Idempotencia: solo aplica si el ticket sigue en 'reemplazo_enviado'.
// ============================================================
import { db, auth } from './firebase'
import { doc, runTransaction, arrayUnion, updateDoc } from 'firebase/firestore'
import { logError } from './logger'
import { calcularEstadoCentro } from '../hooks/useCentros'
import { kitBase, esCentroApertura } from './kitScope'

export async function confirmarRecepcionEquipo(ticketId, { observacion } = {}) {
  const uid = auth.currentUser?.uid ?? null
  const ts  = new Date().toISOString()
  const ticketRef = doc(db, 'equipoTickets', ticketId)
  let centroId = null
  let centroEsApertura = false

  await runTransaction(db, async (tx) => {
    const ticketSnap = await tx.get(ticketRef)
    if (!ticketSnap.exists()) throw new Error('Ticket no existe')
    const ticket = ticketSnap.data()
    if (ticket.estado !== 'reemplazo_enviado') return

    centroId = ticket.centroId
    // El kit (equipos/rov) de un centro en apertura vive en teams/team08, no en
    // centros/{id} (ver kitScope.js) — hay que leer el centro para saber cuál es.
    const centroSnap = await tx.get(doc(db, 'centros', centroId))
    const centroData = centroSnap.exists() ? centroSnap.data() : {}
    centroEsApertura = esCentroApertura(centroData)
    const rovRef  = doc(db, ...kitBase({ id: centroId, teamAsignado: centroData.teamAsignado }), 'equipos', 'rov')
    const rovSnap = await tx.get(rovRef)
    const rovData = rovSnap.exists() ? rovSnap.data() : { principal: {}, backup: {} }
    const equipoData = { ...(rovData[ticket.equipo] ?? {}) }

    tx.set(rovRef, {
      ...rovData,
      [ticket.equipo]: {
        ...equipoData,
        estados: { ...equipoData.estados, [ticket.campo]: 'operativo' },
        fallas:  { ...equipoData.fallas,  [ticket.campo]: '' },
      },
    }, { merge: true })

    tx.update(ticketRef, {
      estado: 'recibido',
      recibidoEn: ts,
      recibidoPor: uid,
      recepcionObservacion: observacion ?? '',
      historial: arrayUnion({ tipo: 'recibido', uid, ts }),
    })
  })

  if (centroId && !centroEsApertura) {
    try {
      const estado = await calcularEstadoCentro(centroId)
      await updateDoc(doc(db, 'centros', centroId), { estado })
    } catch (e) {
      logError('equipoRecepcion/recalcularEstado', e)
    }
  }
}
