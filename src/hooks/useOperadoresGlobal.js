import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

// Junta los operadores (op1/op2) de todos los centros en una lista plana.
export function useOperadoresGlobal(centros) {
  const [operadores, setOperadores] = useState([])
  const [cargando, setCargando]     = useState(true)

  const ids = centros.map(c => c.id).join(',')

  useEffect(() => {
    let cancelado = false
    const cargar = async () => {
      setCargando(true)
      const acc = []
      await Promise.all(centros.map(async (c) => {
        try {
          const snap = await getDoc(doc(db, 'centros', c.id, 'datos', 'operadores'))
          if (!snap.exists()) return
          const data = snap.data()
          // La sincronización guarda los operadores en `lista` (array). Se mantiene
          // compatibilidad con el formato antiguo op1/op2.
          const lista = data.lista ?? [data.op1, data.op2].filter(Boolean)
          lista.forEach((op) => {
            if (op && op.nombre) acc.push({ ...op, centroId: c.id, centroNombre: c.nombre, empresaNombre: c.empresaNombre })
          })
        } catch { /* ignore */ }
      }))
      if (!cancelado) { setOperadores(acc); setCargando(false) }
    }
    if (centros.length) cargar(); else { setOperadores([]); setCargando(false) }
    return () => { cancelado = true }
  }, [ids])

  return { operadores, cargando }
}
