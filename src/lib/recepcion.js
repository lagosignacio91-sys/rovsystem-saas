// ============================================================
// Cierre del ciclo taller↔operador al confirmar recepción de ítems de un despacho.
// Por cada ítem confirmado: si venía del estuche de herramientas, ese equipo
// (principal/backup) vuelve a 'ok'; si venía de la caja de herramientas, se suma
// la cantidad recibida y se le quita el flag `falta`. Todo en una transacción
// atómica (despacho + estucheHerramientas + cajaHerramientas del centro).
// Idempotencia: solo se aplica a ítems cuyo estadoItem sea 'enviado' (evita
// reaplicar el efecto si se confirma dos veces).
// ============================================================
import { db, auth } from './firebase'
import { doc, runTransaction, arrayUnion, updateDoc } from 'firebase/firestore'
import { logError } from './logger'
import { calcularEstadoCentro } from '../hooks/useCentros'
import { calcularEstadoDespacho, claveItem, normalizarItemsLegacy } from './despachos'
import { kitBase, esCentroApertura } from './kitScope'

export async function confirmarRecepcionItems(despachoId, itemKeys, { observacion } = {}) {
  const uid = auth.currentUser?.uid ?? null
  const ts  = new Date().toISOString()
  const despRef = doc(db, 'despachos', despachoId)
  let centroId = null
  let centroEsApertura = false

  await runTransaction(db, async (tx) => {
    const despSnap = await tx.get(despRef)
    if (!despSnap.exists()) throw new Error('Despacho no existe')
    const desp = despSnap.data()
    centroId = desp.centroId
    // El estuche/caja de herramientas de un centro en apertura vive en teams/team08,
    // no en centros/{id} (ver kitScope.js) — hay que leer el centro para saber cuál es.
    const centroSnap = await tx.get(doc(db, 'centros', centroId))
    const centroData = centroSnap.exists() ? centroSnap.data() : {}
    centroEsApertura = esCentroApertura(centroData)
    const base = kitBase({ id: centroId, teamAsignado: centroData.teamAsignado })
    const estRef  = doc(db, ...base, 'datos', 'estucheHerramientas')
    const cajaRef = doc(db, ...base, 'datos', 'cajaHerramientas')
    const [estSnap, cajaSnap] = await Promise.all([tx.get(estRef), tx.get(cajaRef)])

    const estData = estSnap.exists() ? { principal: {}, backup: {}, ...estSnap.data() } : { principal: {}, backup: {} }
    const cajaLista = cajaSnap.exists() ? (cajaSnap.data().lista ?? []) : []
    let estChanged = false
    // Cantidad recibida a sumar por itemId (acumulada; NO se reconstruye la caja desde un
    // Map que deduplicaría por id → antes se perdía un ítem si había ids repetidos).
    const restockPorId = new Map()

    const nuevosItems = normalizarItemsLegacy(desp).map(item => {
      if (!itemKeys.includes(claveItem(item))) return item
      if (item.estadoItem !== 'enviado') return item // idempotencia: solo enviado → recibido

      if (item.origen === 'estuche') {
        const equipo = item.equipo === 'backup' ? 'backup' : 'principal'
        estData[equipo] = { ...estData[equipo], [item.itemId]: 'ok' }
        estChanged = true
      } else if (item.origen === 'caja') {
        const id = String(item.itemId)
        restockPorId.set(id, (restockPorId.get(id) ?? 0) + (Number(item.cantidad) || 0))
      }
      return { ...item, estadoItem: 'recibido', recibidoEn: ts, recibidoPor: uid }
    })

    // Aplicar el restock mapeando sobre la lista ORIGINAL: preserva todos los ítems
    // (aunque existan ids repetidos de datos viejos) y limpia el flag `falta`.
    let cajaChanged = false
    const nuevaCaja = cajaLista.map(entry => {
      const extra = restockPorId.get(String(entry.id))
      if (extra == null) return entry
      cajaChanged = true
      return { ...entry, cantidad: Math.max(0, (Number(entry.cantidad) || 0) + extra), falta: false }
    })
    for (const id of restockPorId.keys()) {
      if (!cajaLista.some(e => String(e.id) === id)) {
        logError('recepcion/itemCajaNoEncontrado', new Error(`itemId=${id} centro=${centroId}`))
      }
    }

    if (estChanged)  tx.set(estRef,  estData, { merge: true })
    if (cajaChanged) tx.set(cajaRef, { lista: nuevaCaja }, { merge: true })

    tx.update(despRef, {
      items: nuevosItems,
      estado: calcularEstadoDespacho(nuevosItems),
      observacion: observacion ?? desp.observacion ?? '',
      recibidoEn: ts,
      recibidoPor: uid,
      historial: arrayUnion({ tipo: 'recibido_items', uid, ts, itemKeys }),
    })
  })

  if (centroId && !centroEsApertura) {
    try {
      const estado = await calcularEstadoCentro(centroId)
      await updateDoc(doc(db, 'centros', centroId), { estado })
    } catch (e) {
      logError('recepcion/recalcularEstado', e)
    }
  }
}
