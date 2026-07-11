import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { HERRAMIENTAS_BASICAS_DEFAULT } from '../config/appDefaults'

export function useResumenCentro(centroId) {
  const [resumen, setResumen] = useState({ fallas: [], solicitudes: [] })

  useEffect(() => {
    if (!centroId) return

    let rovData = null
    let estData = null

    const actualizar = () => {
      const resultado = { fallas: [], solicitudes: [] }

      // Fallas ROV
      if (rovData) {
        const equipos = [
          { nombre: 'Equipo Principal', datos: rovData.principal ?? {} },
          { nombre: 'Equipo Backup',    datos: rovData.backup ?? {} },
        ]
        equipos.forEach(eq => {
          Object.entries(eq.datos.estados ?? {}).forEach(([key, estado]) => {
            if (estado === 'falla') {
              const campo  = { modelo: 'Modelo', codigoRov: 'Código ROV', codigoControl: 'Código Control', codigoUmbilical: 'Código Umbilical' }[key] ?? key
              const razon  = eq.datos.fallas?.[key] ?? 'Sin descripción'
              resultado.fallas.push({ tipo: 'ROV', equipo: eq.nombre, campo, razon })
            }
          })
        })
      }

      // Faltantes en estuches de herramientas (Principal/Backup)
      if (estData) {
        const equipos = [
          { nombre: 'Equipo Principal', estado: estData.principal ?? {} },
          { nombre: 'Equipo Backup',    estado: estData.backup ?? {} },
        ]
        equipos.forEach(eq => {
          Object.entries(eq.estado).forEach(([itemId, valor]) => {
            if (valor === 'falta') {
              const label = HERRAMIENTAS_BASICAS_DEFAULT.find(i => i.id === itemId)?.label ?? itemId
              resultado.fallas.push({ tipo: 'Herramienta', equipo: eq.nombre, campo: label, razon: 'Falta en el estuche' })
            }
          })
        })
      }

      setResumen(resultado)
    }

    const unsubRov = onSnapshot(doc(db, 'centros', centroId, 'equipos', 'rov'), snap => {
      rovData = snap.exists() ? snap.data() : null
      actualizar()
    })
    const unsubEst = onSnapshot(doc(db, 'centros', centroId, 'datos', 'estucheHerramientas'), snap => {
      estData = snap.exists() ? snap.data() : null
      actualizar()
    })

    return () => { unsubRov(); unsubEst() }
  }, [centroId])

  return resumen
}
