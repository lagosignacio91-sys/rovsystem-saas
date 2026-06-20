import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot, addDoc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useOlimpo() {
  const [clientes, setClientes] = useState([])
  const [config,   setConfig]   = useState({})
  const [pagos,    setPagos]    = useState([])
  const [gastos,   setGastos]   = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let ready = 0
    const check = () => { ready++; if (ready >= 3) setCargando(false) }
    const unsubs = []

    unsubs.push(onSnapshot(collection(db, 'hxOlimpo'), snap => {
      const cfg = snap.docs.find(d => d.id === 'config')
      if (cfg) setConfig(cfg.data())
      setClientes(snap.docs.filter(d => d.id !== 'config').map(d => ({ id: d.id, ...d.data() })))
      check()
    }))

    unsubs.push(onSnapshot(collection(db, 'hxPagos'), snap => {
      setPagos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      check()
    }))

    unsubs.push(onSnapshot(collection(db, 'hxGastos'), snap => {
      setGastos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      check()
    }))

    return () => unsubs.forEach(u => u())
  }, [])

  const registrarPago = async (datos) => {
    await addDoc(collection(db, 'hxPagos'), { ...datos, creadoEn: new Date().toISOString() })
  }

  const registrarGasto = async (datos) => {
    await addDoc(collection(db, 'hxGastos'), { ...datos, creadoEn: new Date().toISOString() })
  }

  const actualizarCliente = async (clienteId, cambios, empresaId) => {
    await updateDoc(doc(db, 'hxOlimpo', clienteId), { ...cambios, updatedAt: new Date().toISOString() })
    if (cambios.estado !== undefined && empresaId) {
      await updateDoc(doc(db, 'empresas', empresaId), { estado: cambios.estado })
    }
  }

  const actualizarConfig = async (cambios) => {
    await setDoc(doc(db, 'hxOlimpo', 'config'), cambios, { merge: true })
  }

  const eliminarPago  = async (id) => deleteDoc(doc(db, 'hxPagos',  id))
  const eliminarGasto = async (id) => deleteDoc(doc(db, 'hxGastos', id))

  return { clientes, config, pagos, gastos, cargando, registrarPago, registrarGasto, actualizarCliente, actualizarConfig, eliminarPago, eliminarGasto }
}
