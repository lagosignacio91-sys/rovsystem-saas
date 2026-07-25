// Prefijo de ruta del "kit" operativo de un centro: equipos ROV, inventario
// (caja/estuche), bitácora, roster de operadores y entregas de turno.
//
// Normalmente el kit cuelga del propio centro: `centros/{id}/...`.
// Pero para un centro EN OPERACIÓN ESPECIAL (apertura o soberanía) el kit cuelga
// del TEAM — `teams/{teamEspecial}/...` — porque el equipamiento NO pertenece al
// centro: viaja con el equipo de un centro a otro. Al "cerrar" el centro queda con
// `teamAsignado=null` y solo su registro; el kit sigue en `teams/{teamEspecial}`.
//
// Hay DOS operaciones especiales gemelas (mismos derechos, kits separados, pueden
// coexistir un centro de cada una a la vez):
//   - Apertura  → team08
//   - Soberanía → team14
// La distinción apertura/soberanía es una etiqueta permanente del piloto
// (`usuarios/{uid}.especialidad`); ambos usan `rol: 'apertura'`.
//
// Criterio canónico: teamAsignado ∈ TEAMS_ESPECIALES (ver spec 2026-07-17 y 2026-07-24).
export const TEAM_APERTURA  = 'team08'
export const TEAM_SOBERANIA = 'team14'
export const TEAMS_ESPECIALES = [TEAM_APERTURA, TEAM_SOBERANIA]

// ¿El centro está en una operación especial (su kit vive en el team, no en el centro)?
export function esCentroEspecial(centro) {
  return TEAMS_ESPECIALES.includes(centro?.teamAsignado)
}

// Alias histórico: antes solo existía apertura. Se mantiene para no romper imports;
// hoy significa "centro especial" (apertura o soberanía).
export const esCentroApertura = esCentroEspecial

// Devuelve los segmentos base como array, para usar con doc()/collection() spread:
//   doc(db, ...kitBase(centro), 'equipos', 'rov')
// Un centro especial usa el kit de SU team (team08 o team14); uno normal, el suyo.
export function kitBase(centro) {
  return esCentroEspecial(centro) ? ['teams', centro.teamAsignado] : ['centros', centro.id]
}

// ¿Es un team reservado para operación especial? (para excluirlo de asignaciones normales)
export function esTeamEspecial(team) {
  return TEAMS_ESPECIALES.includes(team)
}

// Etiqueta de especialidad del piloto. Default 'apertura' (los pilotos apertura
// preexistentes no tienen el campo y deben verse como "Apertura").
export function labelEspecialidad(especialidad) {
  return especialidad === 'soberania' ? 'Soberanía' : 'Apertura'
}

// Etiqueta legible de un team especial (para no mostrar "Team 14" crudo).
export function labelTeamEspecial(team) {
  if (team === TEAM_APERTURA)  return 'Apertura'
  if (team === TEAM_SOBERANIA) return 'Soberanía'
  return null
}
