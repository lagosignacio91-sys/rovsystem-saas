import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/firebase'
import { collection, onSnapshot, updateDoc, deleteDoc, doc, getDoc, setDoc, increment } from 'firebase/firestore'

export function useBodegaCentral() {
  const [equipos,            setEquipos]            = useState([])
  const [repuestos,          setRepuestos]          = useState([])
  const [herramientasInsumos, setHerramientasInsumos] = useState([])
  const [cargando,           setCargando]           = useState(false)

  useEffect(() => {
    const unsubEquipos = onSnapshot(
      collection(db, 'bodegaCentral', 'almacen', 'equipos'),
      snap => setEquipos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    const unsubRepuestos = onSnapshot(
      collection(db, 'bodegaCentral', 'almacen', 'repuestos'),
      snap => setRepuestos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    const unsubHI = onSnapshot(
      collection(db, 'bodegaCentral', 'almacen', 'herramientasInsumos'),
      snap => setHerramientasInsumos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    return () => { unsubEquipos(); unsubRepuestos(); unsubHI() }
  }, [])

  // ── EQUIPOS ──────────────────────────────────────────────
  const agregarEquipo = async (modelo, serial, estado, detallesFalla = null) => {
    setCargando(true)
    try {
      const equipoRef  = doc(db, 'bodegaCentral', 'almacen', 'equipos', modelo)
      const equipoSnap = await getDoc(equipoRef)

      const nuevaUnidad = { serial, estado, detallesFalla: detallesFalla || null, desde: new Date().toISOString() }

      let unidades = [], totalOperativos = 0, totalConFalla = 0
      if (equipoSnap.exists()) {
        const data = equipoSnap.data()
        unidades        = data.unidades        || []
        totalOperativos = data.totalOperativos || 0
        totalConFalla   = data.totalConFalla   || 0
      }

      unidades = [...unidades, nuevaUnidad]
      if (estado === 'operativo') totalOperativos++
      else totalConFalla++

      await setDoc(equipoRef, { modelo, unidades, totalOperativos, totalConFalla, updatedAt: new Date().toISOString() })
    } catch (e) {
      console.error('Error agregando equipo:', e)
      throw e
    } finally {
      setCargando(false)
    }
  }

  const cambiarEstadoEquipo = async (modelo, serial, nuevoEstado, detallesFalla = null) => {
    setCargando(true)
    try {
      const equipoRef  = doc(db, 'bodegaCentral', 'almacen', 'equipos', modelo)
      const equipoSnap = await getDoc(equipoRef)
      if (!equipoSnap.exists()) throw new Error(`Equipo ${modelo} no encontrado`)

      const data     = equipoSnap.data()
      const unidades = [...(data.unidades || [])]

      const idx = unidades.findIndex(u => u.serial === serial)
      if (idx === -1) throw new Error(`Unidad ${serial} no encontrada`)

      unidades[idx] = {
        ...unidades[idx],
        estado:        nuevoEstado,
        detallesFalla: nuevoEstado === 'conFalla' ? (detallesFalla || null) : null,
        desde:         new Date().toISOString(),
      }

      const totalOperativos = unidades.filter(u => u.estado === 'operativo').length
      const totalConFalla   = unidades.filter(u => u.estado === 'conFalla').length

      await setDoc(equipoRef, { ...data, unidades, totalOperativos, totalConFalla, updatedAt: new Date().toISOString() })
    } catch (e) {
      console.error('Error cambiando estado:', e)
      throw e
    } finally {
      setCargando(false)
    }
  }

  // ── REPUESTOS ─────────────────────────────────────────────
  const agregarRepuesto = async (nombre, modeloEquipo, cantidad) => {
    setCargando(true)
    try {
      const ref = doc(db, 'bodegaCentral', 'almacen', 'repuestos', Date.now().toString())
      await setDoc(ref, { nombre, modeloEquipo, cantidad, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    } catch (e) {
      console.error('Error agregando repuesto:', e)
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
      console.error('Error editando repuesto:', e)
    }
  }

  // ── HERRAMIENTAS / INSUMOS ───────────────────────────────
  const agregarHerramientaInsumo = async (nombre, cantidad, categoria, estado = 'disponible') => {
    setCargando(true)
    try {
      const ref = doc(db, 'bodegaCentral', 'almacen', 'herramientasInsumos', Date.now().toString())
      await setDoc(ref, { nombre, cantidad, categoria, estado, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    } catch (e) {
      console.error('Error agregando herramienta/insumo:', e)
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
      console.error('Error editando herramienta/insumo:', e)
    }
  }

  // ── ELIMINAR ─────────────────────────────────────────────
  const eliminarUnidadEquipo = async (modelo, serial) => {
    setCargando(true)
    try {
      const equipoRef  = doc(db, 'bodegaCentral', 'almacen', 'equipos', modelo)
      const equipoSnap = await getDoc(equipoRef)
      if (!equipoSnap.exists()) throw new Error(`Equipo ${modelo} no encontrado`)

      const data           = equipoSnap.data()
      const nuevasUnidades = (data.unidades || []).filter(u => u.serial !== serial)
      const totalOperativos = nuevasUnidades.filter(u => u.estado === 'operativo').length
      const totalConFalla   = nuevasUnidades.filter(u => u.estado === 'conFalla').length

      if (nuevasUnidades.length === 0) {
        await deleteDoc(equipoRef)
      } else {
        await setDoc(equipoRef, { ...data, unidades: nuevasUnidades, totalOperativos, totalConFalla, updatedAt: new Date().toISOString() })
      }
    } catch (e) {
      console.error('Error eliminando unidad:', e)
      throw e
    } finally {
      setCargando(false)
    }
  }

  const eliminarRepuesto = async (repuestoId) => {
    try {
      await deleteDoc(doc(db, 'bodegaCentral', 'almacen', 'repuestos', repuestoId))
    } catch (e) {
      console.error('Error eliminando repuesto:', e)
      throw e
    }
  }

  const eliminarHerramientaInsumo = async (itemId) => {
    try {
      await deleteDoc(doc(db, 'bodegaCentral', 'almacen', 'herramientasInsumos', itemId))
    } catch (e) {
      console.error('Error eliminando herramienta/insumo:', e)
      throw e
    }
  }

  // ── DESPACHO: descontar stock por nombre (match contra repuestos y herramientas/insumos) ──
  const descontarStockDespacho = useCallback(async (items) => {
    for (const item of items) {
      const nombre = item.nombre?.toLowerCase()
      if (!nombre) continue
      const qty = Number(item.cantidadEnviada ?? item.cantidadDespachada ?? item.cantidad ?? 1) || 0

      const repuesto = repuestos.find(r => r.nombre?.toLowerCase() === nombre)
      if (repuesto) {
        const nuevo = Math.max(0, (Number(repuesto.cantidad) || 0) - qty)
        await updateDoc(doc(db, 'bodegaCentral', 'almacen', 'repuestos', repuesto.id), {
          cantidad: nuevo, updatedAt: new Date().toISOString(),
        })
        continue
      }

      const hi = herramientasInsumos.find(h => h.nombre?.toLowerCase() === nombre)
      if (hi) {
        const nuevo = Math.max(0, (Number(hi.cantidad) || 0) - qty)
        await updateDoc(doc(db, 'bodegaCentral', 'almacen', 'herramientasInsumos', hi.id), {
          cantidad: nuevo, updatedAt: new Date().toISOString(),
        })
        continue
      }

      console.warn(`Bodega: ítem despachado "${item.nombre}" no existe en bodega — no se descontó stock.`)
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
