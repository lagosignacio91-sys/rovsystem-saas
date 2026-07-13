import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { logError } from '../lib/logger'

export function useOperadoresGlobal(centros) {
  const [operadores, setOperadores] = useState([])
  const [cargando, setCargando]     = useState(true)

  // Sorted join → mismo resultado sin importar el orden de llegada de Firestore
  const idsStable = [...centros.map(c => c.id)].sort().join(',')

  useEffect(() => {
    if (!centros.length) return   // sin centros no hay nada que suscribir; el vacío se deriva abajo

    let active = true
    const dataMap = new Map()
    centros.forEach(c => dataMap.set(c.id, []))
    const firedSet = new Set()

    const unsubs = centros.map(c =>
      onSnapshot(doc(db, 'centros', c.id, 'datos', 'operadores'), snap => {
        if (!active) return
        const raw  = snap.exists() ? (snap.data().lista ?? [snap.data().op1, snap.data().op2].filter(Boolean)) : []
        dataMap.set(c.id, raw.filter(op => op?.nombre).map(op => ({
          ...op, centroId: c.id, centroNombre: c.nombre, empresaNombre: c.empresaNombre,
        })))

        firedSet.add(c.id)
        if (firedSet.size >= centros.length) setCargando(false)

        const all = []
        centros.forEach(centro => all.push(...(dataMap.get(centro.id) || [])))
        setOperadores(all)
      }, (e) => { logError('useOperadoresGlobal', e); setCargando(false) })
    )

    return () => { active = false; unsubs.forEach(u => u()) }
  }, [idsStable]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!centros.length) return { operadores: [], cargando: false }
  return { operadores, cargando }
}
