// Validaciones reutilizables para formularios y CSV

/**
 * Valida RUT chileno incluyendo dígito verificador.
 * Formato esperado: "12345678-K" o "12345678-9"
 */
export function validarRut(rut) {
  if (!rut || typeof rut !== 'string') return false
  const clean = rut.trim().replace(/\./g, '').toUpperCase()
  const match = clean.match(/^(\d{1,8})-([0-9K])$/)
  if (!match) return false

  const nums = match[1]
  const dvIngresado = match[2]

  let suma = 0
  let multiplicador = 2
  for (let i = nums.length - 1; i >= 0; i--) {
    suma += parseInt(nums[i]) * multiplicador
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }
  const resto = 11 - (suma % 11)
  const dvCalculado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)

  return dvIngresado === dvCalculado
}

/**
 * Valida email con RFC básico (más estricto que /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
 */
export function validarEmail(email) {
  if (!email || typeof email !== 'string') return false
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())
}

/**
 * Valida que una bitácora diaria tenga contenido mínimo antes de guardarla (LV-03).
 * Antes ambos sinks (ModalGenerarBitacora y TabBitacora) permitían guardar una
 * entrada completamente vacía, que se sumaba al historial y al reporte de WhatsApp.
 *
 * Regla mínima: al menos uno de los campos de la jornada debe tener texto real
 * (estado de puerto, jornada AM, jornada PM u observaciones). No se exige piloto
 * porque se autocompleta desde el operador en faena y no siempre es editable.
 *
 * Devuelve { ok, motivo } para poder deshabilitar el botón y explicar el porqué.
 */
export function validarBitacora(datos) {
  const d = datos ?? {}
  const txt = (v) => (typeof v === 'string' ? v.trim() : '')
  const tieneContenido = [d.estadoPuerto, d.jornadaAm, d.jornadaPm, d.observaciones]
    .some(v => txt(v).length > 0)
  if (!tieneContenido) {
    return { ok: false, motivo: 'Registra al menos estado de puerto, jornada AM/PM u observaciones.' }
  }
  return { ok: true, motivo: '' }
}
