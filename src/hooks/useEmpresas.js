import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import {
  collection, addDoc, onSnapshot, deleteDoc, doc
} from 'firebase/firestore'

export function useEmpresas() {
  const [empresas, setEmpresas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'empresas'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setEmpresas(data.sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setCargando(false)
    })
    return () => unsub()
  }, [])

  const agregarEmpresa = async (nombre) => {
    await addDoc(collection(db, 'empresas'), {
      nombre,
      creadoEn: new Date().toISOString(),
    })
  }

  const eliminarEmpresa = async (id) => {
    await deleteDoc(doc(db, 'empresas', id))
  }

  return { empresas, cargando, agregarEmpresa, eliminarEmpresa }
}