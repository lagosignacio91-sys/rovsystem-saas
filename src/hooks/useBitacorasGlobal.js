import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, onSnapshot, setDoc, arrayUnion, deleteField } from 'firebase/firestore'
import { logError } from '../lib/logger'
import { kitBase } from '../lib/kitScope'

// Agrega una entrada nueva a la bitácora del centro (nunca sobrescribe el historial).
// Al finalizar limpia el borrador en curso (si lo había): una vez que la entrada
// del día pasa al historial, no debe quedar un borrador huérfano precargándose.
// `centro` (no solo el id): un centro en apertura guarda su bitácora en
// teams/team08, no en centros/{id} (ver kitScope.js).
export async function guardarBitacora(centro, entrada) {
  await setDoc(doc(db, ...kitBase(centro), 'datos', 'bitacora'), { lista: arrayUnion(entrada), borrador: deleteField() }, { merge: true })
}

// Guarda/actualiza el borrador del día (trabajo a medias, ej. solo jornada AM).
// No toca el historial `lista`. Pasar deleteField() como `borrador` lo descarta.
export async function guardarBorrador(centro, borrador) {
  await setDoc(doc(db, ...kitBase(centro), 'datos', 'bitacora'), { borrador }, { merge: true })
}

// Para cada centro retorna { centro, bitacora, ultima, operadores }
// bitacora lee de centros/{id}/datos/bitacora (doc con { lista: [...] }, una entrada por día)
// ultima: la entrada más reciente de la lista (para mostrar "estado actual" sin cambiar la vista de admin/supervisor)
// operadores lee de centros/{id}/datos/operadores
export function useBitacorasGlobal(centros) {
  const [datos,    setDatos]    = useState([])
  const [cargando, setCargando] = useState(true)

  // Clave estable: re-suscribir solo cuando cambia el conjunto de ids, no en
  // cada nueva referencia del array centros.
  const idsStable = centros.map(c => c.id).join(',')

  useEffect(() => {
    if (!centros || centros.length === 0) return   // sin centros no hay nada que suscribir; el vacío se deriva abajo

    const state = {}
    const unsubs = []

    const flush = () => {
      const lista = centros.map(c => {
        const bitacora = state[c.id]?.bitacora ?? null
        const entradas = bitacora?.lista ?? []
        return {
          centro:     c,
          bitacora,
          ultima:     entradas[entradas.length - 1] ?? null,
          operadores: state[c.id]?.operadores ?? null,
        }
      })
      setDatos(lista)
      if (Object.keys(state).length >= centros.length) setCargando(false)
    }

    for (const centro of centros) {
      if (!state[centro.id]) state[centro.id] = {}

      const refBit = doc(db, ...kitBase(centro), 'datos', 'bitacora')
      unsubs.push(onSnapshot(refBit, snap => {
        state[centro.id].bitacora = snap.exists() ? snap.data() : null
        flush()
      }, (e) => { logError('useBitacorasGlobal/bitacora', e); setCargando(false) }))

      const refOps = doc(db, ...kitBase(centro), 'datos', 'operadores')
      unsubs.push(onSnapshot(refOps, snap => {
        const lista = snap.exists() ? (snap.data().lista ?? []) : []
        state[centro.id].operadores = {
          op1: lista[0] ?? null,
          op2: lista[1] ?? null,
        }
        flush()
      }, (e) => { logError('useBitacorasGlobal/operadores', e); setCargando(false) }))
    }

    return () => unsubs.forEach(u => u())
  }, [idsStable]) // eslint-disable-line react-hooks/exhaustive-deps -- re-suscribe por el conjunto de ids, no por la referencia de centros

  if (!centros || centros.length === 0) return { datos: [], cargando: false }
  return { datos, cargando }
}
