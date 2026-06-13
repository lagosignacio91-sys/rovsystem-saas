import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import {
  collection, addDoc, onSnapshot,
  updateDoc, deleteDoc, doc, getDoc
} from 'firebase/firestore'

// Verifica el estado real de un centro leyendo sus subcolecciones
async function calcularEstadoCentro(centroId) {
  try {
    // 1. Verificar fallas ROV
    const rovSnap = await getDoc(doc(db, 'centros', centroId, 'equipos', 'rov'))
    if (rovSnap.exists()) {
      const { principal = {}, backup = {} } = rovSnap.data()
      const tieneFallaROV = (eq) => Object.values(eq.estados ?? {}).some(e => e === 'falla')
      if (tieneFallaROV(principal) || tieneFallaROV(backup)) {
        return 'EQUIPMENT_FAULT'
      }
    }

    // 2. Verificar herramientas e insumos
    const herSnap = await getDoc(doc(db, 'centros', centroId, 'datos', 'herramientas'))
    const insSnap = await getDoc(doc(db, 'centros', centroId, 'datos', 'insumos'))

    const herLista = herSnap.exists() ? (herSnap.data().lista ?? []) : []
    const insLista = insSnap.exists() ? (insSnap.data().lista ?? []) : []

    const hayPendiente = [
      ...herLista.filter(h => h.cantidad === 0 || h.solicitado),
      ...insLista.filter(i => i.cantidad === 0 || i.solicitado),
    ].length > 0

    if (hayPendiente) return 'LOW_STOCK'

    return 'OK'
  } catch (e) {
    console.error('Error calculando estado:', e)
    return 'OK'
  }
}

export function useCentros() {
  const [centros, setCentros]   = useState([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'centros'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setCentros(data)
    })
    return () => unsub()
  }, [])

  const agregarCentro = async (datos) => {
    setCargando(true)
    try {
      await addDoc(collection(db, 'centros'), {
        ...datos,
        creadoEn: new Date().toISOString(),
      })
    } catch (e) {
      console.error('Error agregando centro:', e)
    }
    setCargando(false)
  }

  const actualizarCentro = async (id, datos) => {
    try {
      await updateDoc(doc(db, 'centros', id), datos)
    } catch (e) {
      console.error('Error actualizando centro:', e)
    }
  }

  const eliminarCentro = async (id) => {
    try {
      await deleteDoc(doc(db, 'centros', id))
    } catch (e) {
      console.error('Error eliminando centro:', e)
    }
  }

  // Recalcula y guarda el estado real del centro
  const sincronizarEstado = async (centroId) => {
    const nuevoEstado = await calcularEstadoCentro(centroId)
    await updateDoc(doc(db, 'centros', centroId), { estado: nuevoEstado })
    return nuevoEstado
  }

  return { centros, cargando, agregarCentro, actualizarCentro, eliminarCentro, sincronizarEstado }
}