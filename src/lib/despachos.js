// ============================================================
// Helpers compartidos para el ciclo "falta → despacho → recepción".
// Cada ítem de un despacho tiene su propio estadoItem (pendiente/enviado/recibido);
// el `estado` global del despacho se deriva de esos estados, nunca se pisa a mano.
// ============================================================

export function claveItem({ origen, itemId, equipo }) {
  return `${origen}:${itemId}:${equipo ?? ''}`
}

export function calcularEstadoDespacho(items = []) {
  if (items.length === 0) return 'pendiente'
  const en = (v) => items.every(i => (i.estadoItem ?? 'pendiente') === v)
  const alguno = (v) => items.some(i => (i.estadoItem ?? 'pendiente') === v)
  if (en('recibido')) return 'recibido'
  if (alguno('recibido')) return 'parcial'
  if (en('pendiente')) return 'pendiente'
  return 'enviado'
}

// Compat con despachos creados antes de este cambio de modelo (sin items[].estadoItem):
// les asigna un estadoItem derivado del `estado` global que ya tenían, y origen: 'legacy'
// (sin efecto de stock al recibir, no hay forma confiable de mapearlos a un ítem real).
export function normalizarItemsLegacy(despacho) {
  return (despacho?.items ?? []).map(it => ({
    ...it,
    origen: it.origen ?? 'legacy',
    itemId: it.itemId ?? it.id ?? it.nombre,
    estadoItem: it.estadoItem ?? (
      despacho.estado === 'recibido' ? 'recibido' :
      despacho.estado === 'pendiente' ? 'pendiente' : 'enviado'
    ),
  }))
}
