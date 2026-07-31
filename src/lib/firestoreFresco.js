import { getDoc, getDocs, getDocFromServer, getDocsFromServer } from 'firebase/firestore'

// ============================================================
// Lecturas "a demanda" que deben traer datos FRESCOS del servidor.
//
// La app usa `persistentLocalCache`. Cuando hay un listener `onSnapshot` vivo
// sobre el mismo documento (p. ej. useFaltantesGlobal/useCentros en MainLayout),
// un `getDoc`/`getDocs` normal (Source.DEFAULT) puede resolverse desde la vista
// de caché local y devolver datos VIEJOS — el bug del consolidado de Compras que
// "no bajaba" hasta recargar con F5.
//
// Usar estos wrappers en:
//   - reportes/consolidados a demanda (Compras, Reportes, PDFs, WhatsApp),
//   - reconciliaciones que borran/recalculan (sincronizar operadores, baja, estado del centro),
//   - lecturas-antes-de-escribir donde otro usuario puede haber tocado el doc (ROV, coberturas).
//
// NO hace falta en las lecturas dentro de `runTransaction` (tx.get ya va al
// servidor). Si no hay red, cae a la caché para no quedarse sin datos.
// ============================================================

export async function getDocFresco(ref) {
  try { return await getDocFromServer(ref) }
  catch { return await getDoc(ref) }
}

export async function getDocsFresco(query) {
  try { return await getDocsFromServer(query) }
  catch { return await getDocs(query) }
}
