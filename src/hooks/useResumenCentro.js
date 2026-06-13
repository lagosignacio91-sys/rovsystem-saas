import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'

export function useResumenCentro(centroId) {
  const [resumen, setResumen] = useState({ fallas: [], solicitudes: [] })

  useEffect(() => {
    if (!centroId) return

    const fallas      = []
    const solicitudes = []
    let rovData       = null
    let herData       = null
    let insData       = null

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

      // Solicitudes herramientas
      if (herData?.lista) {
        herData.lista.forEach(h => {
          if (h.cantidad === 0 || h.solicitado) {
            resultado.solicitudes.push({ tipo: 'Herramienta', nombre: h.nombre, cantidad: h.cantidad })
          }
        })
      }

      // Solicitudes insumos
      if (insData?.lista) {
        insData.lista.forEach(i => {
          if (i.cantidad === 0 || i.solicitado) {
            resultado.solicitudes.push({ tipo: 'Insumo', nombre: i.nombre, cantidad: i.cantidad })
          }
        })
      }

      setResumen(resultado)
    }

    const unsubRov = onSnapshot(doc(db, 'centros', centroId, 'equipos', 'rov'), snap => {
      rovData = snap.exists() ? snap.data() : null
      actualizar()
    })
    const unsubHer = onSnapshot(doc(db, 'centros', centroId, 'datos', 'herramientas'), snap => {
      herData = snap.exists() ? snap.data() : null
      actualizar()
    })
    const unsubIns = onSnapshot(doc(db, 'centros', centroId, 'datos', 'insumos'), snap => {
      insData = snap.exists() ? snap.data() : null
      actualizar()
    })

    return () => { unsubRov(); unsubHer(); unsubIns() }
  }, [centroId])

  return resumen
}