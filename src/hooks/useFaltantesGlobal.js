import { useState, useEffect, useMemo } from 'react'
import { db } from '../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { logError } from '../lib/logger'

// Para el badge de "Centros" y el resaltado del Mapa: qué centros tienen algo
// marcado "falta" (estuche de herramientas o caja de herramientas), sin tener
// que abrir cada centro. Mismo patrón que useBitacorasGlobal (suscripción
// por-centro, sin collectionGroup, no requiere cambios en firestore.rules).
export function useFaltantesGlobal(centros) {
  const [estadoPorCentro, setEstadoPorCentro] = useState({})

  useEffect(() => {
    if (!centros || centros.length === 0) { setEstadoPorCentro({}); return }

    const state = {}
    const unsubs = []
    const flush = () => setEstadoPorCentro({ ...state })

    for (const centro of centros) {
      state[centro.id] = state[centro.id] ?? { estuche: false, caja: false }

      unsubs.push(onSnapshot(doc(db, 'centros', centro.id, 'datos', 'estucheHerramientas'), snap => {
        const d = snap.exists() ? snap.data() : {}
        const valores = [...Object.values(d.principal ?? {}), ...Object.values(d.backup ?? {})]
        state[centro.id] = { ...state[centro.id], estuche: valores.some(v => v === 'falta') }
        flush()
      }, (e) => logError('useFaltantesGlobal/estuche', e)))
      unsubs.push(onSnapshot(doc(db, 'centros', centro.id, 'datos', 'cajaHerramientas'), snap => {
        const lista = snap.exists() ? (snap.data().lista ?? []) : []
        state[centro.id] = { ...state[centro.id], caja: lista.some(i => i.falta === true) }
        flush()
      }, (e) => logError('useFaltantesGlobal/caja', e)))
    }

    return () => unsubs.forEach(u => u())
  }, [centros.map(c => c.id).join(',')])

  const centrosConFaltantes = useMemo(
    () => new Set(Object.entries(estadoPorCentro).filter(([, v]) => v.estuche || v.caja).map(([id]) => id)),
    [estadoPorCentro]
  )

  return { centrosConFaltantes, totalCentrosConFaltantes: centrosConFaltantes.size }
}
