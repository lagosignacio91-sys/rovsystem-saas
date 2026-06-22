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
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim())
}
