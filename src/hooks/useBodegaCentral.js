import { useState, useEffect } from 'react'
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

      const data      = equipoSnap.data()
      let unidades    = [...(data.unidades || [])]
      let totalOperativos = data.totalOperativos || 0
      let totalConFalla   = data.totalConFalla   || 0

      const idx = unidades.findIndex(u => u.serial === serial)
      if (idx === -1) throw new Error(`Unidad ${serial} no encontrada`)

      const oldUnit = unidades[idx]
      if (oldUnit.estado === 'operativo') totalOperativos--
      else if (oldUnit.estado === 'conFalla') totalConFalla--

      unidades[idx] = {
        ...oldUnit,
        estado:        nuevoEstado,
        detallesFalla: nuevoEstado === 'conFalla' ? (detallesFalla || null) : null,
        desde:         new Date().toISOString(),
      }

      if (nuevoEstado === 'operativo') totalOperativos++
      else if (nuevoEstado === 'conFalla') totalConFalla++

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

      const data = equipoSnap.data()
      let unidades        = data.unidades || []
      let totalOperativos = data.totalOperativos || 0
      let totalConFalla   = data.totalConFalla   || 0

      const idx = unidades.findIndex(u => u.serial === serial)
      if (idx === -1) throw new Error(`Unidad ${serial} no encontrada`)

      const old = unidades[idx]
      if (old.estado === 'operativo') totalOperativos--
      else if (old.estado === 'conFalla') totalConFalla--

      const nuevasUnidades = unidades.filter((_, i) => i !== idx)

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
  const descontarStockDespacho = async (items) => {
    for (const item of items) {
      const nombre = item.nombre?.toLowerCase()
      if (!nombre) continue
      const qty = item.cantidadEnviada ?? item.cantidadDespachada ?? item.cantidad ?? 1

      const repuesto = repuestos.find(r => r.nombre?.toLowerCase() === nombre)
      if (repuesto) {
        await updateDoc(doc(db, 'bodegaCentral', 'almacen', 'repuestos', repuesto.id), {
          cantidad: increment(-qty), updatedAt: new Date().toISOString(),
        })
        continue
      }

      const hi = herramientasInsumos.find(h => h.nombre?.toLowerCase() === nombre)
      if (hi) {
        await updateDoc(doc(db, 'bodegaCentral', 'almacen', 'herramientasInsumos', hi.id), {
          cantidad: increment(-qty), updatedAt: new Date().toISOString(),
        })
      }
    }
  }

  return {
    equipos, repuestos, herramientasInsumos, cargando,
    agregarEquipo, cambiarEstadoEquipo, eliminarUnidadEquipo,
    agregarRepuesto, editarRepuestoCantidad, eliminarRepuesto,
    agregarHerramientaInsumo, editarHerramientaInsumo, eliminarHerramientaInsumo,
    descontarStockDespacho,
  }
}
