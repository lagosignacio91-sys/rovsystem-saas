import { useState, useEffect, useMemo } from 'react'
import { db } from '../lib/firebase'
import {
  collection, addDoc, onSnapshot,
  updateDoc, deleteDoc, doc, getDoc, getDocs, writeBatch, setDoc
} from 'firebase/firestore'

export const CENTROS_GL = [
  { nombre: 'auchile',          teamAsignado: 'team01', lat: -45.06569, lng: -73.57994 },
  { nombre: 'gregoria',         teamAsignado: 'team02', lat: -45.60891, lng: -73.52102 },
  { nombre: 'ninualac',         teamAsignado: 'team03', lat: -44.99103, lng: -73.72147 },
  { nombre: 'nevenka',          teamAsignado: 'team04', lat: -45.80200, lng: -73.63740 },
  { nombre: 'tangbac',          teamAsignado: 'team05', lat: -45.04291, lng: -73.68528 },
  { nombre: 'aysen 4',          teamAsignado: 'team06', lat: -45.33625, lng: -73.14792 },
  { nombre: 'teresa 1',         teamAsignado: 'team07', lat: -44.92559, lng: -73.74093 },
  { nombre: 'pato',             teamAsignado: 'team09', lat: -45.51674, lng: -74.10208 },
  { nombre: 'jorge canal goñi', teamAsignado: 'team10', lat: -44.84563, lng: -73.95372 },
  { nombre: 'isla quemada',     teamAsignado: 'team11', lat: -45.43502, lng: -73.85317 },
]

// Verifica el estado real de un centro leyendo sus subcolecciones
export async function calcularEstadoCentro(centroId) {
  try {
    // 0. Verificar operadores en faena
    const opsSnap  = await getDoc(doc(db, 'centros', centroId, 'datos', 'operadores'))
    const opsLista = opsSnap.exists() ? (opsSnap.data().lista ?? []) : []
    if (!opsLista.some(op => op?.estado === 'faena')) return 'NO_OPERATOR'

    // 1. Verificar fallas ROV
    const rovSnap = await getDoc(doc(db, 'centros', centroId, 'equipos', 'rov'))
    if (rovSnap.exists()) {
      const { principal = {}, backup = {} } = rovSnap.data()
      const tieneFallaROV = (eq) => Object.values(eq.estados ?? {}).some(e => e === 'falla')
      if (tieneFallaROV(principal) || tieneFallaROV(backup)) {
        return 'EQUIPMENT_FAULT'
      }
    }

    // 2. Verificar herramientas e insumos
    const herSnap = await getDoc(doc(db, 'centros', centroId, 'datos', 'herramientas'))
    const insSnap = await getDoc(doc(db, 'centros', centroId, 'datos', 'insumos'))

    const herLista = herSnap.exists() ? (herSnap.data().lista ?? []) : []
    const insLista = insSnap.exists() ? (insSnap.data().lista ?? []) : []

    const hayPendiente = [
      ...herLista.filter(h => h.cantidad === 0 || h.solicitado),
      ...insLista.filter(i => i.cantidad === 0 || i.solicitado),
    ].length > 0

    if (hayPendiente) return 'LOW_STOCK'

    return 'OK'
  } catch (e) {
    console.error('Error calculando estado:', e)
    return 'OK'
  }
}

export function useCentros() {
  const [centrosRaw, setCentrosRaw] = useState([])
  const [empresasMap, setEmpresasMap] = useState({})
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const unsubCentros = onSnapshot(collection(db, 'centros'), (snap) => {
      setCentrosRaw(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    // Mapa empresaId → nombre, para denormalizar empresaNombre al vuelo
    const unsubEmpresas = onSnapshot(collection(db, 'empresas'), (snap) => {
      const map = {}
      snap.docs.forEach(d => { map[d.id] = d.data().nombre })
      setEmpresasMap(map)
    })
    return () => { unsubCentros(); unsubEmpresas() }
  }, [])

  // Enriquecer cada centro con el nombre de su empresa (resuelto desde empresaId).
  // Memoizado: sin esto, `centros` cambia de referencia en CADA render (p. ej. el
  // reloj de MainLayout que actualiza cada segundo), re-disparando los useEffect
  // que dependen de `centros` (ReportesPage) — causaba parpadeo y queries por segundo.
  const centros = useMemo(
    () => centrosRaw.map(c => ({
      ...c,
      empresaNombre: c.empresaNombre ?? empresasMap[c.empresaId] ?? null,
    })),
    [centrosRaw, empresasMap]
  )

  const agregarCentro = async (datos) => {
    setCargando(true)
    try {
      await addDoc(collection(db, 'centros'), {
        ...datos,
        creadoEn: new Date().toISOString(),
      })
    } catch (e) {
      console.error('Error agregando centro:', e)
    }
    setCargando(false)
  }

  const actualizarCentro = async (id, datos) => {
    try {
      await updateDoc(doc(db, 'centros', id), datos)
    } catch (e) {
      console.error('Error actualizando centro:', e)
    }
  }

  const eliminarCentro = async (id) => {
    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'centros', id, 'equipos', 'rov'))
      batch.delete(doc(db, 'centros', id, 'datos', 'herramientas'))
      batch.delete(doc(db, 'centros', id, 'datos', 'insumos'))
      batch.delete(doc(db, 'centros', id, 'datos', 'operadores'))
      batch.delete(doc(db, 'centros', id))
      await batch.commit()
    } catch (e) {
      console.error('Error eliminando centro:', e)
    }
  }

  // Recalcula y guarda el estado real del centro. Si estadoActual coincide, omite el write.
  const sincronizarEstado = async (centroId, estadoActual = null) => {
    const nuevoEstado = await calcularEstadoCentro(centroId)
    if (nuevoEstado === estadoActual) return nuevoEstado
    await updateDoc(doc(db, 'centros', centroId), { estado: nuevoEstado })
    return nuevoEstado
  }

  const inicializarCentrosGL = async (empresaId) => {
    setCargando(true)
    try {
      const snap = await getDocs(collection(db, 'centros'))
      if (snap.docs.length > 0) {
        const batch = writeBatch(db)
        for (const d of snap.docs) {
          batch.delete(doc(db, 'centros', d.id, 'equipos', 'rov'))
          batch.delete(doc(db, 'centros', d.id, 'datos', 'herramientas'))
          batch.delete(doc(db, 'centros', d.id, 'datos', 'insumos'))
          batch.delete(doc(db, 'centros', d.id, 'datos', 'operadores'))
          batch.delete(d.ref)
        }
        await batch.commit()
      }
      for (const c of CENTROS_GL) {
        await addDoc(collection(db, 'centros'), {
          nombre:       c.nombre,
          lat:          c.lat,
          lng:          c.lng,
          teamAsignado: c.teamAsignado,
          estado:       'OK',
          estadoCiclo:  'cicloProductivo',
          empresaId:    empresaId,
          empresaNombre: empresasMap[empresaId] ?? null,
          creadoEn:     new Date().toISOString(),
        })
      }
    } catch (e) {
      console.error('Error inicializando centros:', e)
      throw e
    }
    setCargando(false)
  }

  // Pobla centros/{id}/datos/operadores.lista desde usuarios (por teamAsignado).
  // Hace merge preservando campos operativos (faena/descanso, turnos, foto) por rut.
  const sincronizarOperadoresCentros = async (usuarios) => {
    let operadoresAsignados = 0
    let centrosActualizados = 0
    for (const centro of centros) {
      if (!centro.teamAsignado) continue
      const asignados = usuarios.filter(u => u.rol === 'operador' && u.teamId === centro.teamAsignado)
      const ref       = doc(db, 'centros', centro.id, 'datos', 'operadores')
      const prevSnap  = await getDoc(ref)
      const prevLista = prevSnap.exists() ? (prevSnap.data().lista ?? []) : []
      const lista = asignados.map(u => {
        const prev = prevLista.find(p => p?.rut && p.rut === u.rut)
        return {
          uid:            u.uid ?? u.id ?? null,
          nombre:         u.nombre ?? '',
          rut:            u.rut ?? '',
          telefono:       u.telefono ?? '',
          correoCorp:     u.correoCorporativo ?? '',
          correoPersonal: u.correoPersonal ?? '',
          foto:           u.foto ?? prev?.foto ?? null,
          esRelevo:       u.esRelevo ?? false,
          estado:         prev?.estado ?? 'descanso',
          ingresoTurno:   prev?.ingresoTurno ?? '',
          salidaTurno:    prev?.salidaTurno ?? '',
        }
      })
      await setDoc(ref, { lista })
      operadoresAsignados += lista.length
      centrosActualizados += 1
    }
    return { centrosActualizados, operadoresAsignados }
  }

  return { centros, cargando, agregarCentro, actualizarCentro, eliminarCentro, sincronizarEstado, inicializarCentrosGL, sincronizarOperadoresCentros }
}