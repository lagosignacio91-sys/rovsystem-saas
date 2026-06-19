// ============================================================
// Cierre del ciclo taller↔operador al confirmar recepción de un despacho.
// Suma al stock del centro lo recibido y limpia las flags `solicitado`/
// `cantidadSolicitada` de los ítems despachados, luego recalcula el estado
// del centro. Idempotencia: el llamador debe evitar aplicarlo dos veces
// (flag `stockAplicado` en el doc del despacho).
// ============================================================
import { db } from './firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { calcularEstadoCentro } from '../hooks/useCentros'

export async function aplicarRecepcionStock(centroId, items) {
  if (!centroId || !Array.isArray(items) || items.length === 0) return

  const grupos = { herramientas: [], insumos: [] }
  for (const it of items) {
    const col = (it.tipo || '').toLowerCase().startsWith('insumo') ? 'insumos' : 'herramientas'
    grupos[col].push(it)
  }

  for (const col of ['herramientas', 'insumos']) {
    const recibidos = grupos[col]
    if (recibidos.length === 0) continue
    const ref  = doc(db, 'centros', centroId, 'datos', col)
    const snap = await getDoc(ref)
    if (!snap.exists()) continue
    const lista = snap.data().lista ?? []
    const nueva = lista.map(item => {
      const rec = recibidos.find(r => String(r.id) === String(item.id))
      if (!rec) return item
      const qty = Number(rec.cantidadEnviada ?? rec.cantidadDespachada ?? rec.cantidadSolicitada ?? 0) || 0
      return { ...item, cantidad: (Number(item.cantidad) || 0) + qty, solicitado: false, cantidadSolicitada: 0 }
    })
    await setDoc(ref, { lista: nueva }, { merge: true })
  }

  // Recalcular el semáforo del centro tras reponer stock.
  try {
    const estado = await calcularEstadoCentro(centroId)
    await updateDoc(doc(db, 'centros', centroId), { estado })
  } catch (e) {
    console.error('Error recalculando estado tras recepción:', e)
  }
}
