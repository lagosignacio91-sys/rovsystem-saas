import { useState, useEffect, useRef } from 'react'
import { db, auth } from '../lib/firebase'
import {
  collection, addDoc, onSnapshot,
  updateDoc, doc, query, where, arrayUnion
} from 'firebase/firestore'
import { confirmarRecepcionItems } from '../lib/recepcion'
import { calcularEstadoDespacho, claveItem, normalizarItemsLegacy } from '../lib/despachos'
import { HERRAMIENTAS_BASICAS_DEFAULT } from '../config/appDefaults'
import { logError } from '../lib/logger'

// `teamId`: opcional. Cuando viene presente (operador con team propio), se agrega como
// filtro extra de la query — la regla de Firestore exige que el `where` lo demuestre
// para poder listar. Admin/supervisor no tienen `teamId` propio, así que no se ven afectados.
export function useDespachos(centroId, teamId) {
  const [despachos, setDespachos]       = useState([])
  const [itemsPendientes, setItemsPendientes] = useState([])
  const [cargando, setCargando]         = useState(true)
  const despachosRef = useRef([])
  const recalcRef     = useRef(null)

  // Escuchar despachos en tiempo real
  useEffect(() => {
    if (!centroId) return
    const filtros = [where('centroId', '==', centroId)]
    if (teamId) filtros.push(where('teamAsignado', '==', teamId))
    const q     = query(collection(db, 'despachos'), ...filtros)
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !d.eliminado)
      setDespachos(data.sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? '')))
      setCargando(false)
    }, (e) => { logError('useDespachos/despachos', e); setCargando(false) })
    return () => unsub()
  }, [centroId, teamId])

  // Recalcular itemsPendientes cuando cambian los despachos (sin re-suscribir los listeners de abajo)
  useEffect(() => {
    despachosRef.current = despachos
    if (recalcRef.current) recalcRef.current()
  }, [despachos])

  // Ítems marcados "falta" en estucheHerramientas/cajaHerramientas, excluyendo los ya
  // cubiertos por un despacho abierto (con al menos un ítem no recibido) de este centro.
  useEffect(() => {
    if (!centroId) return
    let estucheData = { principal: {}, backup: {} }
    let cajaLista   = []

    const recalc = () => {
      const candidatos = []
      for (const equipo of ['principal', 'backup']) {
        const estado = estucheData[equipo] ?? {}
        HERRAMIENTAS_BASICAS_DEFAULT.forEach(h => {
          if (estado[h.id] === 'falta') {
            candidatos.push({ origen: 'estuche', itemId: h.id, equipo, nombre: h.label, tipo: 'Herramienta' })
          }
        })
      }
      cajaLista.forEach(i => {
        if (i.falta) candidatos.push({ origen: 'caja', itemId: String(i.id), equipo: null, nombre: i.nombre, tipo: 'Herramienta' })
      })

      const cubiertos = new Set(
        despachosRef.current
          .flatMap(d => normalizarItemsLegacy(d))
          .filter(it => it.estadoItem !== 'recibido')
          .map(claveItem)
      )
      setItemsPendientes(candidatos.filter(c => !cubiertos.has(claveItem(c))))
    }
    recalcRef.current = recalc

    const unsubEst  = onSnapshot(doc(db, 'centros', centroId, 'datos', 'estucheHerramientas'), snap => {
      const d = snap.exists() ? snap.data() : {}
      estucheData = { principal: d.principal ?? {}, backup: d.backup ?? {} }
      recalc()
    }, (e) => logError('useDespachos/estuche', e))
    const unsubCaja = onSnapshot(doc(db, 'centros', centroId, 'datos', 'cajaHerramientas'), snap => {
      cajaLista = snap.exists() ? (snap.data().lista ?? []) : []
      recalc()
    }, (e) => logError('useDespachos/caja', e))
    return () => { unsubEst(); unsubCaja(); recalcRef.current = null }
  }, [centroId])

  const crearDespacho = async ({ centroId, centroNombre, items, teamAsignado }) => {
    const uid = auth.currentUser?.uid ?? null
    const ts  = new Date().toISOString()
    const itemsFinal = items.map(i => ({
      ...i,
      ...(i.estadoItem === 'enviado' ? { enviadoEn: ts, enviadoPor: uid } : {}),
    }))
    await addDoc(collection(db, 'despachos'), {
      centroId,
      centroNombre,
      teamAsignado: teamAsignado ?? null,
      origen:    'centro',
      items:     itemsFinal,
      estado:    calcularEstadoDespacho(itemsFinal),
      creadoEn:  ts,
      creadoPor: uid,
      historial: [{ tipo: 'creado', uid, ts }],
    })
  }

  // Pasa ítems puntuales de 'pendiente' a 'enviado' dentro del mismo despacho.
  const enviarItemsPendientes = async (id, itemKeys) => {
    const uid  = auth.currentUser?.uid ?? null
    const ts   = new Date().toISOString()
    const desp = despachosRef.current.find(d => d.id === id)
    if (!desp) return
    const items = normalizarItemsLegacy(desp).map(it =>
      itemKeys.includes(claveItem(it)) && it.estadoItem === 'pendiente'
        ? { ...it, estadoItem: 'enviado', enviadoEn: ts, enviadoPor: uid }
        : it
    )
    await updateDoc(doc(db, 'despachos', id), {
      items,
      estado:    calcularEstadoDespacho(items),
      historial: arrayUnion({ tipo: 'enviado_items', uid, ts, itemKeys }),
    })
  }

  const confirmarRecepcion = async (id, itemKeys, observacion = '') => {
    await confirmarRecepcionItems(id, itemKeys, { observacion })
  }

  // Soft-delete: conserva la evidencia para auditoría.
  const eliminarDespacho = async (id) => {
    await updateDoc(doc(db, 'despachos', id), {
      eliminado: true, eliminadoPor: auth.currentUser?.uid ?? null, eliminadoEn: new Date().toISOString(),
    })
  }

  return { despachos, itemsPendientes, cargando, crearDespacho, enviarItemsPendientes, confirmarRecepcion, eliminarDespacho }
}
