import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'

// Para cada centro retorna { centro, bitacora, operadores }
// bitacora lee de centros/{id}/datos/bitacora
// operadores lee de centros/{id}/datos/operadores
export function useBitacorasGlobal(centros) {
  const [datos,    setDatos]    = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!centros || centros.length === 0) {
      setDatos([])
      setCargando(false)
      return
    }

    setCargando(true)
    const state = {}
    const unsubs = []

    const flush = () => {
      const lista = centros.map(c => ({
        centro:     c,
        bitacora:   state[c.id]?.bitacora   ?? null,
        operadores: state[c.id]?.operadores ?? null,
      }))
      setDatos(lista)
      if (Object.keys(state).length >= centros.length) setCargando(false)
    }

    for (const centro of centros) {
      if (!state[centro.id]) state[centro.id] = {}

      const refBit = doc(db, 'centros', centro.id, 'datos', 'bitacora')
      unsubs.push(onSnapshot(refBit, snap => {
        state[centro.id].bitacora = snap.exists() ? snap.data() : null
        flush()
      }))

      const refOps = doc(db, 'centros', centro.id, 'datos', 'operadores')
      unsubs.push(onSnapshot(refOps, snap => {
        const lista = snap.exists() ? (snap.data().lista ?? []) : []
        state[centro.id].operadores = {
          op1: lista[0] ?? null,
          op2: lista[1] ?? null,
        }
        flush()
      }))
    }

    return () => unsubs.forEach(u => u())
  }, [centros.map(c => c.id).join(',')])

  return { datos, cargando }
}
