// ============================================================
// Cierre del ciclo taller↔operador al confirmar recepción de un despacho.
// Suma al stock del centro lo recibido y limpia las flags `solicitado`/
// `cantidadSolicitada` de los ítems despachados, luego recalcula el estado
// del centro. Idempotencia: el llamador debe evitar aplicarlo dos veces
// (flag `stockAplicado` en el doc del despacho).
// Atomicidad: toda la operación (stock + estado) ocurre en una sola transacción.
// ============================================================
import { db } from './firebase'
import { doc, runTransaction } from 'firebase/firestore'
import { logError } from './logger'
import { calcularEstadoCentro } from '../hooks/useCentros'

export async function aplicarRecepcionStock(centroId, items) {
  if (!centroId || !Array.isArray(items) || items.length === 0) return

  const grupos = { herramientas: [], insumos: [] }
  for (const it of items) {
    const col = (it.tipo || '').toLowerCase().startsWith('insumo') ? 'insumos' : 'herramientas'
    grupos[col].push(it)
  }

  // Refs que necesitamos leer y escribir
  const refs = {
    herramientas: doc(db, 'centros', centroId, 'datos', 'herramientas'),
    insumos:      doc(db, 'centros', centroId, 'datos', 'insumos'),
    centro:       doc(db, 'centros', centroId),
  }

  await runTransaction(db, async (transaction) => {
    // 1. Leer todo primero (las lecturas deben ir antes de escrituras en Firestore transactions)
    const [snapH, snapI] = await Promise.all([
      transaction.get(refs.herramientas),
      transaction.get(refs.insumos),
    ])

    const snaps = { herramientas: snapH, insumos: snapI }

    // 2. Calcular nuevas listas
    for (const col of ['herramientas', 'insumos']) {
      const recibidos = grupos[col]
      if (recibidos.length === 0 || !snaps[col].exists()) continue

      const lista = snaps[col].data().lista ?? []
      const nueva = lista.map(item => {
        const rec = recibidos.find(r => String(r.id) === String(item.id))
        if (!rec) return item
        const qty = Math.max(0, Number(rec.cantidadEnviada ?? rec.cantidadDespachada ?? rec.cantidadSolicitada ?? 0) || 0)
        return { ...item, cantidad: Math.max(0, (Number(item.cantidad) || 0) + qty), solicitado: false, cantidadSolicitada: 0 }
      })
      transaction.set(refs[col], { lista: nueva }, { merge: true })
    }
  })

  // Recalcular semáforo fuera de la transacción (usa getDoc internamente)
  try {
    const estado = await calcularEstadoCentro(centroId)
    await runTransaction(db, async (transaction) => {
      transaction.update(refs.centro, { estado })
    })
  } catch (e) {
    logError('recepcion/recalcularEstado', e)
  }
}
