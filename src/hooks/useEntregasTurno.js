import { useState, useEffect } from 'react'
import { db, storage } from '../lib/firebase'
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query,
  getDoc, setDoc, updateDoc,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const ITEMS_DEFAULT = [
  { id: 'grasa_dielectrica', label: 'Grasa dieléctrica' },
  { id: 'cargadores',        label: 'Cargadores' },
  { id: 'alicates',          label: 'Alicates' },
  { id: 'caja_cotones',      label: 'Caja cotones' },
  { id: 'atornilladores',    label: 'Atornilladores' },
  { id: 'carpas',            label: 'Carpas plegables' },
  { id: 'limpia_contactos',  label: 'Limpia contactos' },
  { id: 'silla',             label: 'Silla' },
  { id: 'rost_off',          label: 'Rost off' },
  { id: 'umbilicales',       label: 'Umbilicales' },
  { id: 'grasa_adhesiva',    label: 'Grasa adhesiva' },
  { id: 'botiquin',          label: 'Botiquín' },
  { id: 'amarras',           label: 'Amarras plásticas' },
  { id: 'radio_handy',       label: 'Radio Handy' },
]

export function useEntregasTurno(centroId) {
  const [entregas,  setEntregas]  = useState([])
  const [itemsList, setItemsList] = useState([])
  const [cargando,  setCargando]  = useState(true)

  useEffect(() => {
    if (!centroId) return
    const q = query(
      collection(db, 'centros', centroId, 'entregas'),
      orderBy('creadoEn', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setEntregas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setCargando(false)
    })
    return () => unsub()
  }, [centroId])

  useEffect(() => {
    if (!centroId) return
    const ref = doc(db, 'centros', centroId, 'config', 'inventario')
    const unsub = onSnapshot(ref, (snap) => {
      setItemsList(snap.exists() ? snap.data().items : ITEMS_DEFAULT)
    })
    return () => unsub()
  }, [centroId])

  const guardarItemsList = async (items) => {
    const ref = doc(db, 'centros', centroId, 'config', 'inventario')
    await setDoc(ref, { items })
  }

  const subirFoto = async (centroId, entregaId, seccionId, file) => {
    const storageRef = ref(storage, `entregas/${centroId}/${entregaId}/${seccionId}`)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const crearEntrega = async (datos) => {
    try {
      const docRef = await addDoc(
        collection(db, 'centros', centroId, 'entregas'),
        { ...datos, creadoEn: new Date().toISOString() }
      )
      return docRef.id
    } catch (e) {
      console.error('Error creando entrega:', e.code, e.message)
      throw e
    }
  }

  const actualizarEntrega = async (entregaId, data) => {
    await updateDoc(doc(db, 'centros', centroId, 'entregas', entregaId), data)
  }

  const eliminarEntrega = async (entregaId) => {
    await deleteDoc(doc(db, 'centros', centroId, 'entregas', entregaId))
  }

  return { entregas, itemsList, cargando, crearEntrega, actualizarEntrega, eliminarEntrega, subirFoto, guardarItemsList, ITEMS_DEFAULT }
}
