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
          ;['op1', 'op2'].forEach((k) => {
            const op = data[k]
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
