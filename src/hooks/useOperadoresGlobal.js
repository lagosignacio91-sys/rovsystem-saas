import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'

export function useOperadoresGlobal(centros) {
  const [operadores, setOperadores] = useState([])
  const [cargando, setCargando]     = useState(true)

  const ids = centros.map(c => c.id).join(',')

  useEffect(() => {
    if (!centros.length) { setOperadores([]); setCargando(false); return }

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
      })
    )

    return () => { active = false; unsubs.forEach(u => u()) }
  }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps

  return { operadores, cargando }
}
