import { useState, useEffect } from 'react'
import {
  collection, doc, onSnapshot,
  addDoc, updateDoc, deleteDoc, setDoc, getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const mesStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export function useHxData() {
  const [clientes,  setClientes]  = useState([])
  const [productos, setProductos] = useState([])
  const [pagos,     setPagos]     = useState([])
  const [gastos,    setGastos]    = useState([])
  const [config,    setConfig]    = useState(null)
  const [cargando,  setCargando]  = useState(true)

  useEffect(() => {
    let loaded = { clientes: false, productos: false, pagos: false, gastos: false, config: false }
    const check = () => { if (Object.values(loaded).every(Boolean)) setCargando(false) }

    const err = (key) => () => { loaded[key] = true; check() }

    const unsubs = [
      onSnapshot(collection(db, 'hxClientes'),
        snap => { setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() }))); loaded.clientes = true; check() },
        err('clientes')),

      onSnapshot(collection(db, 'hxProductos'),
        snap => { setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() }))); loaded.productos = true; check() },
        err('productos')),

      onSnapshot(collection(db, 'hxPagos'),
        snap => {
          const hace12 = mesStr(new Date(new Date().setMonth(new Date().getMonth() - 11)))
          setPagos(
            snap.docs.map(d => ({ id: d.id, ...d.data() }))
              .filter(p => (p.mes ?? '') >= hace12)
              .sort((a, b) => (b.mes ?? '').localeCompare(a.mes ?? ''))
          )
          loaded.pagos = true; check()
        },
        err('pagos')),

      onSnapshot(collection(db, 'hxGastos'),
        snap => {
          setGastos(
            snap.docs.map(d => ({ id: d.id, ...d.data() }))
              .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
          )
          loaded.gastos = true; check()
        },
        err('gastos')),

      onSnapshot(doc(db, 'hxOlimpo', 'config'),
        snap => { setConfig(snap.exists() ? snap.data() : {}); loaded.config = true; check() },
        err('config')),
    ]

    return () => unsubs.forEach(u => u())
  }, [])

  // ─── Pagos ────────────────────────────────────────────────────────────────
  async function registrarPago(data) {
    await addDoc(collection(db, 'hxPagos'), { ...data, creadoEn: serverTimestamp() })
  }

  async function eliminarPago(id) {
    await deleteDoc(doc(db, 'hxPagos', id))
  }

  // ─── Gastos ───────────────────────────────────────────────────────────────
  async function registrarGasto(data) {
    await addDoc(collection(db, 'hxGastos'), { ...data, creadoEn: serverTimestamp() })
  }

  async function eliminarGasto(id) {
    await deleteDoc(doc(db, 'hxGastos', id))
  }

  // ─── Clientes ─────────────────────────────────────────────────────────────
  async function actualizarCliente(id, cambios) {
    await updateDoc(doc(db, 'hxClientes', id), cambios)
  }

  async function registrarMejora(clienteId, { descripcion, fecha }) {
    await addDoc(collection(db, 'hxClientes', clienteId, 'mejoras'), {
      descripcion, fecha, creadoEn: serverTimestamp(),
    })
    const ref  = doc(db, 'hxClientes', clienteId)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const usadas = (snap.data().licencia?.mejorasUsadas ?? 0) + 1
      await updateDoc(ref, { 'licencia.mejorasUsadas': usadas })
    }
  }

  // ─── Config ───────────────────────────────────────────────────────────────
  async function actualizarConfig(cambios) {
    await setDoc(doc(db, 'hxOlimpo', 'config'), cambios, { merge: true })
  }

  return {
    clientes, productos, pagos, gastos, config, cargando,
    registrarPago, eliminarPago,
    registrarGasto, eliminarGasto,
    actualizarCliente, registrarMejora,
    actualizarConfig,
    mesActual: mesStr,
  }
}
