// Prefijo de ruta del "kit" operativo de un centro: equipos ROV, inventario
// (caja/estuche), bitácora, roster de operadores y entregas de turno.
//
// Normalmente el kit cuelga del propio centro: `centros/{id}/...`.
// Pero para un centro EN APERTURA (teamAsignado === 'team08') el kit cuelga del
// team — `teams/team08/...` — porque el equipamiento de apertura NO pertenece al
// centro: viaja con el equipo de un centro a otro. Al "cerrar apertura" el centro
// queda con `teamAsignado=null` y solo su registro; el kit sigue en `teams/team08`.
//
// Criterio canónico único (ver spec 2026-07-17): teamAsignado === 'team08'.
export const TEAM_APERTURA = 'team08'

export function esCentroApertura(centro) {
  return centro?.teamAsignado === TEAM_APERTURA
}

// Devuelve los segmentos base como array, para usar con doc()/collection() spread:
//   doc(db, ...kitBase(centro), 'equipos', 'rov')
export function kitBase(centro) {
  return esCentroApertura(centro) ? ['teams', TEAM_APERTURA] : ['centros', centro.id]
}
