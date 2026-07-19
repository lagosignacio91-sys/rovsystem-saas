import { useState, useEffect, useMemo } from 'react'
import { db } from '../lib/firebase'
import { logError } from '../lib/logger'
import {
  collection, addDoc, onSnapshot,
  updateDoc, doc, getDoc, getDocs, writeBatch, setDoc
} from 'firebase/firestore'
import { TEAM_APERTURA } from '../lib/kitScope'

// Sin teamAsignado por defecto: la asignación real de team a cada centro
// la hace el admin manualmente desde la app (rota según licencias/turnos).
export const CENTROS_GL = [
  { nombre: 'auchile',          teamAsignado: null, lat: -45.06569, lng: -73.57994 },
  { nombre: 'gregoria',         teamAsignado: null, lat: -45.60891, lng: -73.52102 },
  { nombre: 'ninualac',         teamAsignado: null, lat: -44.99103, lng: -73.72147 },
  { nombre: 'nevenka',          teamAsignado: null, lat: -45.80200, lng: -73.63740 },
  { nombre: 'tangbac',          teamAsignado: null, lat: -45.04291, lng: -73.68528 },
  { nombre: 'aysen 4',          teamAsignado: null, lat: -45.33625, lng: -73.14792 },
  { nombre: 'teresa 1',         teamAsignado: null, lat: -44.92559, lng: -73.74093 },
  { nombre: 'pato',             teamAsignado: null, lat: -45.51674, lng: -74.10208 },
  { nombre: 'jorge canal goñi', teamAsignado: null, lat: -44.84563, lng: -73.95372 },
  { nombre: 'isla quemada',     teamAsignado: null, lat: -45.43502, lng: -73.85317 },
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

    // La falta de stock (estuche/caja de herramientas) ya no compite por el color base:
    // se muestra como punto amarillo independiente (ver useFaltantesGlobal.js) para que
    // no tape una falla de equipo simultánea.
    return 'OK'
  } catch (e) {
    logError('useCentros/calcularEstado', e)
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
    }, (e) => logError('useCentros/centros', e))
    // Mapa empresaId → nombre, para denormalizar empresaNombre al vuelo
    const unsubEmpresas = onSnapshot(collection(db, 'empresas'), (snap) => {
      const map = {}
      snap.docs.forEach(d => { map[d.id] = d.data().nombre })
      setEmpresasMap(map)
    }, (e) => logError('useCentros/empresas', e))
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
      logError('useCentros/agregar', e)
    }
    setCargando(false)
  }

  const actualizarCentro = async (id, datos) => {
    try {
      await updateDoc(doc(db, 'centros', id), datos)
    } catch (e) {
      logError('useCentros/actualizar', e)
    }
  }

  const eliminarCentro = async (id) => {
    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'centros', id, 'equipos', 'rov'))
      batch.delete(doc(db, 'centros', id, 'datos', 'estucheHerramientas'))
      batch.delete(doc(db, 'centros', id, 'datos', 'cajaHerramientas'))
      batch.delete(doc(db, 'centros', id, 'datos', 'operadores'))
      batch.delete(doc(db, 'centros', id))
      await batch.commit()
    } catch (e) {
      logError('useCentros/eliminar', e)
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
          batch.delete(doc(db, 'centros', d.id, 'datos', 'estucheHerramientas'))
          batch.delete(doc(db, 'centros', d.id, 'datos', 'cajaHerramientas'))
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
      logError('useCentros/inicializar', e)
      throw e
    }
    setCargando(false)
  }

  // Pobla el roster de operadores (`.../datos/operadores.lista`) desde `usuarios`:
  //  - Centros normales: `centros/{id}/datos/operadores`, operadores del team (rol 'operador').
  //  - Kit de apertura:  `teams/team08/datos/operadores`, equipo de apertura (rol 'apertura').
  //    Se sincroniza SIEMPRE, no solo cuando hay un centro de apertura asignado — el roster
  //    del kit vive en `teams/team08`, no en un centro, así que el loop de centros nunca lo
  //    tocaba y quedaban "fantasmas" (uid de gente borrada/movida) al no limpiarse jamás.
  // En ambos casos es un REEMPLAZO COMPLETO desde los usuarios vigentes: quien ya no matchea
  // (borrado, o movido de team/rol) desaparece del roster. Los rosters son espejos de
  // `usuarios` que no se limpian solos; esta función es la que los reconcilia.
  const sincronizarOperadoresCentros = async (usuarios) => {
    let operadoresAsignados = 0
    let centrosActualizados = 0

    // Escribe un roster preservando campos operativos (faena/descanso, turnos, foto) por uid
    // (fallback por rut para docs antiguos). S-03: NO se espejan datos personales sensibles
    // (`rut`, `correoPersonal`) — solo nombre + contacto corporativo + estado operativo, porque
    // este doc lo lee cualquier usuario aprovisionado (roster + popup de contacto del mapa).
    const escribirRoster = async (ref, asignados) => {
      const prevSnap  = await getDoc(ref)
      const prevLista = prevSnap.exists() ? (prevSnap.data().lista ?? []) : []
      const lista = asignados.map(u => {
        const uid = u.uid ?? u.id ?? null
        const prev = prevLista.find(p => (p?.uid && p.uid === uid) || (p?.rut && u.rut && p.rut === u.rut))
        return {
          uid,
          nombre:         u.nombre ?? '',
          telefono:       u.telefono ?? '',
          correoCorp:     u.correoCorporativo ?? '',
          foto:           u.foto ?? prev?.foto ?? null,
          esRelevo:       u.esRelevo ?? false,
          estado:         prev?.estado ?? 'descanso',
          ingresoTurno:   prev?.ingresoTurno ?? '',
          salidaTurno:    prev?.salidaTurno ?? '',
        }
      })
      await setDoc(ref, { lista })
      return lista.length
    }

    // Centros normales (rol 'operador'). Los centros de apertura (team08) se saltan aquí:
    // su roster no vive en el centro sino en `teams/team08` (se hace abajo, siempre).
    for (const centro of centros) {
      if (!centro.teamAsignado || centro.teamAsignado === TEAM_APERTURA) continue
      const asignados = usuarios.filter(u => u.rol === 'operador' && u.teamId === centro.teamAsignado)
      operadoresAsignados += await escribirRoster(doc(db, 'centros', centro.id, 'datos', 'operadores'), asignados)
      centrosActualizados += 1
    }

    // Kit de apertura (SIEMPRE): `teams/team08/datos/operadores`, equipo con rol 'apertura'.
    const apertura = usuarios.filter(u => u.rol === 'apertura' && u.teamId === TEAM_APERTURA)
    operadoresAsignados += await escribirRoster(doc(db, 'teams', TEAM_APERTURA, 'datos', 'operadores'), apertura)

    return { centrosActualizados, operadoresAsignados }
  }

  return { centros, cargando, agregarCentro, actualizarCentro, eliminarCentro, sincronizarEstado, inicializarCentrosGL, sincronizarOperadoresCentros }
}