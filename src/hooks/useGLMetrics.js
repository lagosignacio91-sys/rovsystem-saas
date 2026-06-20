import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useGLMetrics(empresaId) {
  const [metricas, setMetricas] = useState({
    totalUsuarios: 0,
    porRol: { admin: 0, supervisor: 0, operador: 0 },
    movilesHabilitados: 0,
    totalCentros: 0,
    cargando: true,
  })

  useEffect(() => {
    if (!empresaId) return

    async function cargar() {
      try {
        const [usersSnap, centrosSnap] = await Promise.all([
          getDocs(query(collection(db, 'usuarios'),  where('empresaId', '==', empresaId))),
          getDocs(query(collection(db, 'centros'),   where('empresaId', '==', empresaId))),
        ])

        const porRol = { admin: 0, supervisor: 0, operador: 0 }
        let movilesHabilitados = 0
        usersSnap.docs.forEach(d => {
          const u = d.data()
          if (u.rol in porRol) porRol[u.rol]++
          if (u.movilHabilitado) movilesHabilitados++
        })

        setMetricas({ totalUsuarios: usersSnap.size, porRol, movilesHabilitados, totalCentros: centrosSnap.size, cargando: false })
      } catch (e) {
        console.error('useGLMetrics:', e)
        setMetricas(m => ({ ...m, cargando: false }))
      }
    }

    cargar()
  }, [empresaId])

  return metricas
}
