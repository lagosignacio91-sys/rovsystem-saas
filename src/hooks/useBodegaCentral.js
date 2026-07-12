import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/firebase'
import { logError } from '../lib/logger'
import { collection, onSnapshot, updateDoc, deleteDoc, doc, addDoc, runTransaction, increment } from 'firebase/firestore'

// Estado de un ítem de herramientas/insumos derivado de su cantidad y su stock mínimo.
// 0 → agotado; ≤ stockMinimo → bajo_stock; resto → disponible.
export function estadoPorCantidad(cantidad, stockMinimo = 3) {
  const n = Number(cantidad) || 0
  const min = Number(stockMinimo)
  const umbral = Number.isFinite(min) && min >= 0 ? min : 3
  if (n <= 0) return 'agotado'
  if (n <= umbral) return 'bajo_stock'
  return 'disponible'
}

export function useBodegaCentral() {
  const [equipos,            setEquipos]            = useState([])
  const [repuestos,          setRepuestos]          = useState([])
  const [herramientasInsumos, setHerramientasInsumos] = useState([])
  const [cargando,           setCargando]           = useState(false)

  useEffect(() => {
    const unsubEquipos = onSnapshot(
      collection(db, 'bodegaCentral', 'almacen', 'equipos'),
      snap => setEquipos(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => logError('useBodegaCentral/equipos', e)
    )
    const unsubRepuestos = onSnapshot(
      collection(db, 'bodegaCentral', 'almacen', 'repuestos'),
      snap => setRepuestos(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => logError('useBodegaCentral/repuestos', e)
    )
    const unsubHI = onSnapshot(
      collection(db, 'bodegaCentral', 'almacen', 'herramientasInsumos'),
      snap => setHerramientasInsumos(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => logError('useBodegaCentral/herramientasInsumos', e)
    )
    return () => { unsubEquipos(); unsubRepuestos(); unsubHI() }
  }, [])

  // ── EQUIPOS ──────────────────────────────────────────────
  const agregarEquipo = async (modelo, serial, estado, detallesFalla = null) => {
    setCargando(true)
    try {
      const equipoRef = doc(db, 'bodegaCentral', 'almacen', 'equipos', modelo)
      await runTransaction(db, async (tx) => {
        const snap     = await tx.get(equipoRef)
        const data     = snap.exists() ? snap.data() : {}
        const unidades = data.unidades || []
        if (unidades.some(u => u.serial === serial)) {
          throw new Error(`Ya existe una unidad con serial "${serial}" en ${modelo}`)
        }
        const nuevas = [...unidades, { serial, estado, detallesFalla: detallesFalla || null, desde: new Date().toISOString() }]
        tx.set(equipoRef, {
          modelo,
          unidades:        nuevas,
          totalOperativos: nuevas.filter(u => u.estado === 'operativo').length,
          totalConFalla:   nuevas.filter(u => u.estado === 'conFalla').length,
          updatedAt:       new Date().toISOString(),
        })
      })
    } catch (e) {
      logError('bodega/agregarEquipo', e)
      throw e
    } finally {
      setCargando(false)
    }
  }

  const cambiarEstadoEquipo = async (modelo, serial, nuevoEstado, detallesFalla = null) => {
    setCargando(true)
    try {
      const equipoRef = doc(db, 'bodegaCentral', 'almacen', 'equipos', modelo)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(equipoRef)
        if (!snap.exists()) throw new Error(`Equipo ${modelo} no encontrado`)
        const data     = snap.data()
        const unidades = [...(data.unidades || [])]
        const idx      = unidades.findIndex(u => u.serial === serial)
        if (idx === -1) throw new Error(`Unidad ${serial} no encontrada`)
        unidades[idx] = {
          ...unidades[idx],
          estado:        nuevoEstado,
          detallesFalla: nuevoEstado === 'conFalla' ? (detallesFalla || null) : null,
          desde:         new Date().toISOString(),
        }
        tx.set(equipoRef, {
          ...data,
          unidades,
          totalOperativos: unidades.filter(u => u.estado === 'operativo').length,
          totalConFalla:   unidades.filter(u => u.estado === 'conFalla').length,
          updatedAt:       new Date().toISOString(),
        })
      })
    } catch (e) {
      logError('bodega/cambiarEstado', e)
      throw e
    } finally {
      setCargando(false)
    }
  }

  // ── REPUESTOS ─────────────────────────────────────────────
  const agregarRepuesto = async (nombre, modeloEquipo, cantidad) => {
    setCargando(true)
    try {
      const nombreNorm = nombre.trim().toLowerCase()
      if (repuestos.some(r => r.modeloEquipo === modeloEquipo && r.nombre?.trim().toLowerCase() === nombreNorm)) {
        throw new Error(`Ya existe un repuesto "${nombre.trim()}" para el modelo ${modeloEquipo}`)
      }
      await addDoc(collection(db, 'bodegaCentral', 'almacen', 'repuestos'),
        { nombre, modeloEquipo, cantidad, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    } catch (e) {
      logError('bodega/agregarRepuesto', e)
      throw e
    } finally {
      setCargando(false)
    }
  }

  const editarRepuestoCantidad = async (repuestoId, delta) => {
    try {
      await updateDoc(doc(db, 'bodegaCentral', 'almacen', 'repuestos', repuestoId), {
        cantidad: increment(delta),
        updatedAt: new Date().toISOString(),
      })
    } catch (e) {
      logError('bodega/editarRepuesto', e)
    }
  }

  // ── HERRAMIENTAS / INSUMOS ───────────────────────────────
  const agregarHerramientaInsumo = async (nombre, cantidad, categoria, stockMinimo = 3) => {
    setCargando(true)
    try {
      const nombreNorm = nombre.trim().toLowerCase()
      if (herramientasInsumos.some(h => h.nombre?.trim().toLowerCase() === nombreNorm)) {
        throw new Error(`Ya existe un ítem "${nombre.trim()}" en herramientas/insumos`)
      }
      await addDoc(collection(db, 'bodegaCentral', 'almacen', 'herramientasInsumos'),
        { nombre, cantidad, categoria, stockMinimo, estado: estadoPorCantidad(cantidad, stockMinimo), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    } catch (e) {
      logError('bodega/agregarHI', e)
      throw e
    } finally {
      setCargando(false)
    }
  }

  const editarHerramientaInsumo = async (itemId, delta, newEstado = null) => {
    try {
      const data = { cantidad: increment(delta), updatedAt: new Date().toISOString() }
      if (newEstado !== null) data.estado = newEstado
      await updateDoc(doc(db, 'bodegaCentral', 'almacen', 'herramientasInsumos', itemId), data)
    } catch (e) {
      logError('bodega/editarHI', e)
    }
  }

  // ── ELIMINAR ─────────────────────────────────────────────
  const eliminarUnidadEquipo = async (modelo, serial) => {
    setCargando(true)
    try {
      const equipoRef = doc(db, 'bodegaCentral', 'almacen', 'equipos', modelo)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(equipoRef)
        if (!snap.exists()) throw new Error(`Equipo ${modelo} no encontrado`)
        const data    = snap.data()
        const nuevas  = (data.unidades || []).filter(u => u.serial !== serial)
        if (nuevas.length === 0) {
          tx.delete(equipoRef)
        } else {
          tx.set(equipoRef, {
            ...data,
            unidades:        nuevas,
            totalOperativos: nuevas.filter(u => u.estado === 'operativo').length,
            totalConFalla:   nuevas.filter(u => u.estado === 'conFalla').length,
            updatedAt:       new Date().toISOString(),
          })
        }
      })
    } catch (e) {
      logError('bodega/eliminarUnidad', e)
      throw e
    } finally {
      setCargando(false)
    }
  }

  const eliminarRepuesto = async (repuestoId) => {
    try {
      await deleteDoc(doc(db, 'bodegaCentral', 'almacen', 'repuestos', repuestoId))
    } catch (e) {
      logError('bodega/eliminarRepuesto', e)
      throw e
    }
  }

  const eliminarHerramientaInsumo = async (itemId) => {
    try {
      await deleteDoc(doc(db, 'bodegaCentral', 'almacen', 'herramientasInsumos', itemId))
    } catch (e) {
      logError('bodega/eliminarHI', e)
      throw e
    }
  }

  // ── DESPACHO: descontar stock por nombre (match contra repuestos y herramientas/insumos) ──
  const descontarStockDespacho = useCallback(async (items) => {
    for (const item of items) {
      const nombre = item.nombre?.toLowerCase()
      if (!nombre) continue
      const qty = Number(item.cantidadEnviada ?? item.cantidadDespachada ?? item.cantidad ?? 1) || 0

      const repuesto = repuestos.find(r =>
        (item.id && String(r.id) === String(item.id)) || r.nombre?.toLowerCase() === nombre
      )
      if (repuesto) {
        const nuevo = Math.max(0, (Number(repuesto.cantidad) || 0) - qty)
        await updateDoc(doc(db, 'bodegaCentral', 'almacen', 'repuestos', repuesto.id), {
          cantidad: nuevo, updatedAt: new Date().toISOString(),
        })
        continue
      }

      const hi = herramientasInsumos.find(h =>
        (item.id && String(h.id) === String(item.id)) || h.nombre?.toLowerCase() === nombre
      )
      if (hi) {
        const nuevo = Math.max(0, (Number(hi.cantidad) || 0) - qty)
        await updateDoc(doc(db, 'bodegaCentral', 'almacen', 'herramientasInsumos', hi.id), {
          cantidad: nuevo, updatedAt: new Date().toISOString(),
        })
        continue
      }

      logError('bodega/descontarStock', new Error(`Ítem "${item.nombre}" no encontrado en bodega`))
    }
  }, [repuestos, herramientasInsumos])

  return {
    equipos, repuestos, herramientasInsumos, cargando,
    agregarEquipo, cambiarEstadoEquipo, eliminarUnidadEquipo,
    agregarRepuesto, editarRepuestoCantidad, eliminarRepuesto,
    agregarHerramientaInsumo, editarHerramientaInsumo, eliminarHerramientaInsumo,
    descontarStockDespacho,
  }
}
