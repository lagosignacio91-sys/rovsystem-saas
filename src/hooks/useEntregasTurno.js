import { useState, useEffect } from 'react'
import { db, storage, auth } from '../lib/firebase'
import { logError } from '../lib/logger'
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query,
  setDoc, updateDoc,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage'

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

// `base` es el prefijo de ruta del kit (['centros', centroId] normalmente, o
// ['teams', 'team08'] para un centro EN APERTURA — el kit viaja con el team).
// `idSeg` es el segmento id usado también para las rutas de Storage.
export function useEntregasTurno(centroId, base = ['centros', centroId]) {
  const [entregas,  setEntregas]  = useState([])
  const [itemsList, setItemsList] = useState([])
  const [cargando,  setCargando]  = useState(true)
  const idSeg   = base[base.length - 1]
  const baseKey = base.join('/')

  useEffect(() => {
    if (!centroId) return
    const q = query(
      collection(db, ...base, 'entregas'),
      orderBy('creadoEn', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setEntregas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setCargando(false)
    }, (e) => { logError('useEntregasTurno/entregas', e); setCargando(false) })
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey])

  useEffect(() => {
    if (!centroId) return
    const ref = doc(db, ...base, 'config', 'inventario')
    const unsub = onSnapshot(ref, (snap) => {
      // T-10: si el doc existe pero sin `items` (o no-array), caer a ITEMS_DEFAULT
      // en vez de dejar itemsList undefined (rompía ModalEntregaTurno con .map).
      setItemsList(snap.data()?.items ?? ITEMS_DEFAULT)
    }, (e) => logError('useEntregasTurno/config', e))
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey])

  const guardarItemsList = async (items) => {
    const ref = doc(db, ...base, 'config', 'inventario')
    await setDoc(ref, { items })
  }

  const subirFoto = async (_centroId, entregaId, seccionId, file) => {
    const storageRef = ref(storage, `entregas/${idSeg}/${entregaId}/${seccionId}`)
    const uid = auth.currentUser?.uid ?? 'unknown'
    await uploadBytes(storageRef, file, { customMetadata: { uploadedBy: uid } })
    return getDownloadURL(storageRef)
  }

  const crearEntrega = async (datos) => {
    try {
      const docRef = await addDoc(
        collection(db, ...base, 'entregas'),
        { ...datos, creadoEn: new Date().toISOString() }
      )
      return docRef.id
    } catch (e) {
      logError('useEntregasTurno/crear', e)
      throw e
    }
  }

  const actualizarEntrega = async (entregaId, data) => {
    await updateDoc(doc(db, ...base, 'entregas', entregaId), data)
  }

  const eliminarEntrega = async (entregaId) => {
    await deleteDoc(doc(db, ...base, 'entregas', entregaId))
  }

  // Sube las fotos de un equipo y devuelve el array de inspección con las fotoUrl ya resueltas (sin file).
  const subirFotos = async (entregaId, equipo, inspeccionArr) => {
    const resultado = []
    for (const sec of inspeccionArr) {
      const { file, ...limpio } = sec
      if (file) {
        try {
          const storageRef = ref(storage, `entregas/${idSeg}/${entregaId}/${equipo}_${sec.id}`)
          const uid = auth.currentUser?.uid ?? 'unknown'
          await uploadBytes(storageRef, file, { customMetadata: { uploadedBy: uid } })
          limpio.fotoUrl = await getDownloadURL(storageRef)
        } catch (e) {
          logError('useEntregasTurno/subirFotos', e)
        }
      }
      resultado.push(limpio)
    }
    return resultado
  }

  // Borra las fotos de una entrega en Storage. Fire-and-forget: si Storage no está
  // habilitado, listAll puede colgarse reintentando, así que NUNCA lo esperamos.
  const borrarFotosEntrega = (entregaId) => {
    listAll(ref(storage, `entregas/${idSeg}/${entregaId}`))
      .then(({ items }) => Promise.all(items.map(it => deleteObject(it).catch(() => {}))))
      .catch(() => {})
  }

  // Borra una entrega anterior: primero el doc de Firestore (rápido, libera la UI),
  // luego sus fotos en Storage sin bloquear.
  const borrarEntregaCompleta = async (entregaId) => {
    try {
      await eliminarEntrega(entregaId)
    } catch (e) {
      logError('useEntregasTurno/borrarEntregaCompleta', e)
    }
    borrarFotosEntrega(entregaId)
  }

  // Solo se conserva UNA entrega activa por centro: crea la nueva, borra las anteriores
  // en segundo plano y sube las fotos de inspección sin bloquear el guardado.
  const guardarEntregaCompleta = async (entregaData, principalArr, backupArr) => {
    const previas = entregas.map(e => e.id)
    const id = await crearEntrega(entregaData)

    if (previas.length) {
      ;(async () => { for (const pid of previas) await borrarEntregaCompleta(pid) })()
    }

    const hayFotos = [...principalArr, ...backupArr].some(s => s.file)
    if (hayFotos) {
      ;(async () => {
        try {
          const [insp, inspBackup] = await Promise.all([
            subirFotos(id, 'principal', principalArr),
            subirFotos(id, 'backup', backupArr),
          ])
          await actualizarEntrega(id, { inspeccion: insp, inspeccionBackup: inspBackup })
        } catch (e) {
          logError('useEntregasTurno/guardarEntregaCompleta', e)
        }
      })()
    }
    return id
  }

  return {
    entregas, itemsList, cargando, crearEntrega, actualizarEntrega, eliminarEntrega,
    subirFoto, guardarItemsList, ITEMS_DEFAULT,
    guardarEntregaCompleta, borrarEntregaCompleta,
  }
}
