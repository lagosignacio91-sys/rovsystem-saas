import { db } from './firebase'
import { doc, getDoc, getDocFromServer } from 'firebase/firestore'
import { logError } from './logger'
import { kitBase } from './kitScope'
import { HERRAMIENTAS_BASICAS_DEFAULT } from '../config/appDefaults'

// "Actualizar" debe traer datos FRESCOS: lee del servidor. Con persistentLocalCache
// activada y un listener vivo sobre estos mismos docs (useFaltantesGlobal en
// MainLayout), un getDoc normal se resuelve desde la caché local y devuelve el
// valor previo al restock — por eso Compras "no bajaba" hasta recargar con F5.
// getDocFromServer fuerza la red; si no hay conexión, cae a la caché para no
// quedarse sin datos.
async function leerFresco(ref) {
  try { return await getDocFromServer(ref) }
  catch { return await getDoc(ref) }
}

// Consolidado de HERRAMIENTAS faltantes de todos los centros, pensado para armar
// las compras semanales/mensuales. Lectura one-shot (getDoc) — es un reporte a
// demanda, no una suscripción como useFaltantesGlobal.
//
// Fuentes (mismas que el badge de "Centros", ya legibles por admin/supervisor):
//   {kitBase}/datos/estucheHerramientas → { principal:{[id]:'ok'|'falta'}, backup:{…} }
//   {kitBase}/datos/cajaHerramientas    → { lista:[{ id, nombre, cantidad, falta }] }
//
// Dedup por ruta de kitBase: los centros EN APERTURA comparten el kit del team
// (teams/team08), así que no hay que leerlo/contarlo dos veces.

const labelEstuche = Object.fromEntries(HERRAMIENTAS_BASICAS_DEFAULT.map(h => [h.id, h.label]))

// Clave de agrupación para ítems de la caja (nombre libre): minúsculas + espacios colapsados.
const normalizar = (s) => (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ')

export async function consolidarFaltantesHerramientas(centros) {
  const lista = centros ?? []

  // Dedup por kitBase: primer centro que "posee" cada ruta la representa.
  const vistos = new Set()
  const objetivos = []
  for (const centro of lista) {
    const ruta = kitBase(centro).join('/')
    if (vistos.has(ruta)) continue
    vistos.add(ruta)
    objetivos.push(centro)
  }

  // key → { key, label, categoria, unidades, centros: Map<centroId, { nombre, empresaNombre, sets:Set }> }
  const acc = new Map()
  const centrosConFaltantes = new Set()

  const anotar = ({ key, label, categoria, centro, set }) => {
    let item = acc.get(key)
    if (!item) { item = { key, label, categoria, unidades: 0, centros: new Map() }; acc.set(key, item) }
    item.unidades += 1
    let c = item.centros.get(centro.id)
    if (!c) { c = { nombre: centro.nombre ?? '—', empresaNombre: centro.empresaNombre ?? '', sets: new Set() }; item.centros.set(centro.id, c) }
    if (set) c.sets.add(set)
    centrosConFaltantes.add(centro.id)
  }

  await Promise.all(objetivos.map(async (centro) => {
    // Estuche (checklist fijo, principal + backup)
    try {
      const snap = await leerFresco(doc(db, ...kitBase(centro), 'datos', 'estucheHerramientas'))
      if (snap.exists()) {
        const d = snap.data()
        for (const [set, campo] of [['Principal', 'principal'], ['Backup', 'backup']]) {
          const estado = d[campo] ?? {}
          for (const [id, valor] of Object.entries(estado)) {
            if (valor !== 'falta') continue
            anotar({ key: `estuche:${id}`, label: labelEstuche[id] ?? id, categoria: 'Estuche', centro, set })
          }
        }
      }
    } catch (e) { logError('consolidarFaltantes/estuche', e) }

    // Caja de herramientas (ítems libres)
    try {
      const snap = await leerFresco(doc(db, ...kitBase(centro), 'datos', 'cajaHerramientas'))
      if (snap.exists()) {
        for (const it of (snap.data().lista ?? [])) {
          if (it?.falta !== true) continue
          const label = (it.nombre ?? '').toString().trim() || 'Sin nombre'
          anotar({ key: `caja:${normalizar(label)}`, label, categoria: 'Caja', centro })
        }
      }
    } catch (e) { logError('consolidarFaltantes/caja', e) }
  }))

  // Serializar: centros como array; orden por unidades desc, luego label.
  const items = [...acc.values()]
    .map(it => ({
      key: it.key,
      label: it.label,
      categoria: it.categoria,
      unidades: it.unidades,
      centros: [...it.centros.values()].map(c => ({
        nombre: c.nombre,
        empresaNombre: c.empresaNombre,
        sets: [...c.sets],
      })).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    }))
    .sort((a, b) => (b.unidades - a.unidades) || a.label.localeCompare(b.label))

  return { generadoEn: new Date(), totalCentrosConFaltantes: centrosConFaltantes.size, items }
}
