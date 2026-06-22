// En producción, loguea solo el código de error (no stack trace ni mensajes internos).
// En desarrollo, loguea todo para facilitar el debug.
const isDev = import.meta.env.DEV

export function logError(context, error) {
  if (isDev) {
    console.error(`[${context}]`, error)
  } else {
    const code = error?.code ?? error?.name ?? 'unknown'
    console.error(`[${context}] error:${code}`)
  }
}
