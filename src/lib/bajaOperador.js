// ============================================================
// Baja de un operador: limpia de verdad, no solo borra la ficha.
//
// Los rosters (`.../datos/operadores.lista`) son ESPEJOS de `usuarios` que no se
// limpian solos: borrar `usuarios/{uid}` dejaba al operador como "fantasma" en el
// centro y en el kit de apertura hasta que un admin corriera "Sincronizar
// operadores" a mano (ver sincronizarOperadoresCentros en hooks/useCentros.js).
//
// Además, el NOMBRE del operador queda escrito en el historial del CENTRO
// (bitácoras y entregas de turno). Ese historial NO se borra —es el registro del
// centro, no de la persona—: se anonimiza a `ETIQUETA_BAJA`.
//
// Orden deliberado: primero limpia, y recién al final borra la ficha. Si algo
// falla a mitad, el usuario sigue existiendo y la baja se puede reintentar
// (nunca queda una ficha borrada con espejos sucios).
// ============================================================
import { db } from './firebase'
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection } from 'firebase/firestore'
import { TEAM_APERTURA } from './kitScope'
import { logError } from './logger'

export const ETIQUETA_BAJA = 'Operador dado de baja'

// Una entrada de roster corresponde al operador si matchea por uid; para entradas
// antiguas sin uid se cae al nombre exacto.
function esDelOperador(entrada, uid, nombre) {
  if (!entrada) return false
  if (entrada.uid) return entrada.uid === uid
  return !!nombre && (entrada.nombre ?? '').trim() === nombre
}

export async function darDeBajaOperador(uid) {
  const refUsuario = doc(db, 'usuarios', uid)
  const snapUsuario = await getDoc(refUsuario)
  const nombre = ((snapUsuario.exists() ? snapUsuario.data().nombre : '') ?? '').trim()

  // Se barren TODOS los centros + el kit de apertura (no solo el team del operador):
  // pudo quedar en otro roster por una cobertura de turno vieja (ver lib/cobertura.js).
  const centrosSnap = await getDocs(collection(db, 'centros'))
  const bases = centrosSnap.docs.map(d => ['centros', d.id])
  bases.push(['teams', TEAM_APERTURA])

  // `problemas` evita el falso OK: si algo no se pudo limpiar (permisos, red), la UI
  // lo avisa en vez de decir "eliminado" como si hubiera quedado todo prolijo.
  const resumen = { rosters: 0, bitacoras: 0, entregas: 0, problemas: [] }

  for (const base of bases) {
    // 1) Roster: se quita la entrada (acá sí desaparece, no se anonimiza).
    try {
      const refOps = doc(db, ...base, 'datos', 'operadores')
      const snap = await getDoc(refOps)
      if (snap.exists()) {
        const lista = snap.data().lista ?? []
        const nueva = lista.filter(o => !esDelOperador(o, uid, nombre))
        if (nueva.length !== lista.length) {
          await setDoc(refOps, { lista: nueva }, { merge: true })
          resumen.rosters += 1
        }
      }
    } catch (e) { logError('bajaOperador/roster', e); resumen.problemas.push(`roster ${base.join('/')}`) }

    // 2) Bitácoras: se CONSERVAN (son el día del centro), solo se anonimiza el piloto.
    try {
      const refBit = doc(db, ...base, 'datos', 'bitacora')
      const snap = await getDoc(refBit)
      if (snap.exists()) {
        const data = snap.data()
        const patch = {}
        let cambio = false

        const lista = (data.lista ?? []).map(b => {
          if (b?.creadoPor === uid || (nombre && b?.piloto === nombre)) {
            cambio = true
            return { ...b, piloto: ETIQUETA_BAJA }
          }
          return b
        })
        if (cambio) patch.lista = lista

        const bo = data.borrador
        if (bo && (bo.guardadoPor === uid || bo.creadoPor === uid || (nombre && bo.piloto === nombre))) {
          patch.borrador = { ...bo, piloto: ETIQUETA_BAJA }
          cambio = true
        }

        if (cambio) {
          await updateDoc(refBit, patch)
          resumen.bitacoras += 1
        }
      }
    } catch (e) { logError('bajaOperador/bitacora', e); resumen.problemas.push(`bitácora ${base.join('/')}`) }

    // 3) Entregas de turno: el nombre vive en `piloto` y `relevo`.
    try {
      const snap = await getDocs(collection(db, ...base, 'entregas'))
      for (const d of snap.docs) {
        const e = d.data()
        const patch = {}
        if (nombre && e.piloto === nombre) patch.piloto = ETIQUETA_BAJA
        if (nombre && e.relevo === nombre) patch.relevo = ETIQUETA_BAJA
        if (Object.keys(patch).length > 0) {
          await updateDoc(d.ref, patch)
          resumen.entregas += 1
        }
      }
    } catch (e) { logError('bajaOperador/entregas', e); resumen.problemas.push(`entregas ${base.join('/')}`) }
  }

  // 4) Recién ahora la ficha. La Cloud Function `eliminarUsuarioAuth`
  //    (onDocumentDeleted) se encarga de borrar la cuenta de Auth.
  await deleteDoc(refUsuario)

  return resumen
}
