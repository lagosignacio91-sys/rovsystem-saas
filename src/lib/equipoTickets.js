// ============================================================
// Helpers compartidos para el ciclo "falla de equipo → baja → reemplazo".
// Independiente del ciclo de despachos de herramientas (src/lib/despachos.js):
// un ticket es sobre UN componente puntual, con su propio ciclo de 4 estados.
// ============================================================

export function claveFalla({ centroId, equipo, campo }) {
  return `${centroId}:${equipo}:${campo}`
}

export const TICKET_ESTADO_LABEL = {
  solicitado:         'Solicitado',
  despachado_taller:  'En taller',
  reemplazo_enviado:  'Reemplazo en camino',
  recibido:           'Recibido',
}
