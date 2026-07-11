function formatFechaCompleta(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatTeam(teamAsignado) {
  if (!teamAsignado) return '—'
  return teamAsignado.replace(/\D/g, '')
}

function bloqueEquipo(titulo, eq) {
  if (!eq) return null
  const filas = [
    `Código ROV: ${eq.codigoRov || 'S/N'}`,
    `Código Control: ${eq.codigoControl || 'S/N'}`,
    `Código Umbilical: ${eq.codigoUmbilical || 'S/N'}`,
    eq.codigoCargadorRov     ? `Cargador ROV: ${eq.codigoCargadorRov}` : null,
    eq.codigoCargadorControl ? `Cargador Control: ${eq.codigoCargadorControl}` : null,
    `Observación: ${eq.observacion || 'Operativo'}`,
  ].filter(Boolean)
  return [`${titulo}: ${eq.modelo || 'S/N'}`, ...filas].join('\n')
}

// Arma el texto de la bitácora diaria para enviar por WhatsApp.
// `entrada`: una fila de centros/{id}/datos/bitacora.lista[].
// `rov`: doc actual de centros/{id}/equipos/rov ({ principal, backup }), o null.
export function generarTextoBitacora(centro, entrada, rov) {
  const lineas = [
    `Piloto: ${entrada.piloto || '—'}`,
    `Fecha: ${formatFechaCompleta(entrada.fecha)}`,
    `Centro: ${centro.nombre}`,
    `Team: ${formatTeam(centro.teamAsignado)}`,
    `Estado puerto: ${entrada.estadoPuerto || '—'}`,
    `Área: ${entrada.area || '—'}`,
    '',
    'Jornada am',
    '',
    entrada.jornadaAm || '—',
    '',
    'Jornada pm',
    '',
    entrada.jornadaPm || '—',
  ]

  if (entrada.observaciones) {
    lineas.push('', 'Observaciones', '', entrada.observaciones)
  }

  const principal = bloqueEquipo('Equipo principal', rov?.principal)
  const backup    = bloqueEquipo('Equipo backup', rov?.backup)
  if (principal) lineas.push('', principal)
  if (backup)    lineas.push('', backup)

  return lineas.join('\n')
}
