import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { HERRAMIENTAS_BASICAS_DEFAULT } from '../config/appDefaults'
import { kitBase } from '../lib/kitScope'
import { logError } from '../lib/logger'

// Orden fijo de las categorías en el popup.
const ORDEN = ['ROV', 'Herramientas', 'Esenciales']

// Agrega, POR CATEGORÍA, las alertas activas de un centro para el popup del mapa:
//   - ROV:         fallas de equipo (equipos/rov, estados === 'falla')
//   - Herramientas: faltantes de estuche (datos/estucheHerramientas) + caja (datos/cajaHerramientas)
//   - Esenciales:  ítems del catálogo global (config/esenciales) con cantidad 0 en el kit
// Todo el kit se lee vía kitBase(centro) para que un centro de apertura (team08) muestre
// las fallas de su kit viajero (viven en teams/team08, no en el centro).
// Devuelve { grupos: [{ categoria, items: [{ titulo, detalle, severidad }] }], total }.
export function useResumenCentro(centro) {
  const [resumen, setResumen] = useState({ grupos: [], total: 0 })

  const centroId = centro?.id
  const teamAsignado = centro?.teamAsignado

  useEffect(() => {
    if (!centroId) return

    let rovData = null
    let estData = null
    let cajaData = null
    let esencCant = null   // { [id]: number } del kit
    let esencCat = null    // [{ id, label }] catálogo global

    const actualizar = () => {
      const rov = []
      const herramientas = []
      const esenciales = []

      // ── ROV ──
      if (rovData) {
        const equipos = [
          { nombre: 'Equipo Principal', datos: rovData.principal ?? {} },
          { nombre: 'Equipo Backup',    datos: rovData.backup ?? {} },
        ]
        equipos.forEach(eq => {
          Object.entries(eq.datos.estados ?? {}).forEach(([key, estado]) => {
            if (estado === 'falla') {
              const campo = { modelo: 'Modelo', codigoRov: 'Código ROV', codigoControl: 'Código Control', codigoUmbilical: 'Código Umbilical' }[key] ?? key
              rov.push({ titulo: `${eq.nombre} — ${campo}`, detalle: eq.datos.fallas?.[key] ?? 'Sin descripción', severidad: 'falla' })
            }
          })
        })
      }

      // ── Herramientas: estuche ──
      if (estData) {
        const equipos = [
          { nombre: 'Equipo Principal', estado: estData.principal ?? {} },
          { nombre: 'Equipo Backup',    estado: estData.backup ?? {} },
        ]
        equipos.forEach(eq => {
          Object.entries(eq.estado).forEach(([itemId, valor]) => {
            if (valor === 'falta') {
              const label = HERRAMIENTAS_BASICAS_DEFAULT.find(i => i.id === itemId)?.label ?? itemId
              herramientas.push({ titulo: `${eq.nombre} — ${label}`, detalle: 'Falta en el estuche', severidad: 'falta' })
            }
          })
        })
      }

      // ── Herramientas: caja ──
      if (Array.isArray(cajaData)) {
        cajaData.filter(i => i?.falta === true).forEach(i => {
          herramientas.push({ titulo: i.nombre, detalle: `Falta · Cant: ${i.cantidad ?? 0}`, severidad: 'falta' })
        })
      }

      // ── Esenciales (catálogo global × cantidades del kit) ──
      if (Array.isArray(esencCat)) {
        esencCat.forEach(item => {
          const cant = esencCant?.[item.id] ?? 0
          if (cant === 0) esenciales.push({ titulo: item.label, detalle: 'En 0', severidad: 'falta' })
        })
      }

      const porCategoria = { ROV: rov, Herramientas: herramientas, Esenciales: esenciales }
      const grupos = ORDEN
        .map(categoria => ({ categoria, items: porCategoria[categoria] }))
        .filter(g => g.items.length > 0)
      const total = grupos.reduce((n, g) => n + g.items.length, 0)
      setResumen({ grupos, total })
    }

    const base = kitBase({ id: centroId, teamAsignado })
    const unsubs = [
      onSnapshot(doc(db, ...base, 'equipos', 'rov'), snap => { rovData = snap.exists() ? snap.data() : null; actualizar() }, (e) => logError('useResumenCentro/rov', e)),
      onSnapshot(doc(db, ...base, 'datos', 'estucheHerramientas'), snap => { estData = snap.exists() ? snap.data() : null; actualizar() }, (e) => logError('useResumenCentro/estuche', e)),
      onSnapshot(doc(db, ...base, 'datos', 'cajaHerramientas'), snap => { cajaData = snap.exists() ? (snap.data().lista ?? []) : []; actualizar() }, (e) => logError('useResumenCentro/caja', e)),
      onSnapshot(doc(db, ...base, 'datos', 'esenciales'), snap => { esencCant = snap.exists() ? (snap.data().cantidades ?? {}) : {}; actualizar() }, (e) => logError('useResumenCentro/esenciales', e)),
      onSnapshot(doc(db, 'config', 'esenciales'), snap => { esencCat = snap.exists() ? (snap.data().lista ?? []) : []; actualizar() }, (e) => logError('useResumenCentro/esenciales-cat', e)),
    ]

    return () => unsubs.forEach(u => u())
  }, [centroId, teamAsignado])

  return resumen
}
