import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useClienteMetrics(queryMetricas) {
  const [totalUsuarios,      setTotalUsuarios]      = useState(0)
  const [porRol,             setPorRol]             = useState({ admin: 0, supervisor: 0, operador: 0 })
  const [movilesHabilitados, setMovilesHabilitados] = useState(0)
  const [totalCentros,       setTotalCentros]       = useState(0)
  const [cargando,           setCargando]           = useState(true)

  useEffect(() => {
    if (!queryMetricas) { setCargando(false); return }

    const { campo, valor } = queryMetricas

    async function load() {
      try {
        const usersSnap = await getDocs(
          query(collection(db, 'usuarios'), where(campo, '==', valor))
        )
        const users = usersSnap.docs.map(d => d.data())

        setTotalUsuarios(users.length)
        setPorRol({
          admin:      users.filter(u => u.rol === 'admin').length,
          supervisor: users.filter(u => u.rol === 'supervisor').length,
          operador:   users.filter(u => u.rol === 'operador').length,
        })
        setMovilesHabilitados(users.filter(u => u.movilHabilitado).length)

        // GL Robótica opera todos los centros del sistema
        const centrosSnap = await getDocs(collection(db, 'centros'))
        setTotalCentros(centrosSnap.size)
      } catch {
        // sin permisos o sin datos
      } finally {
        setCargando(false)
      }
    }

    load()
  }, [queryMetricas?.campo, queryMetricas?.valor])

  return { totalUsuarios, porRol, movilesHabilitados, totalCentros, cargando }
}
