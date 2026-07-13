import { useCallback, useSyncExternalStore } from 'react'

// Devuelve true cuando el viewport es de teléfono. Útil para renderizar
// tarjetas en vez de tablas (que no caben en pantalla angosta).
// Usa useSyncExternalStore (patrón canónico para media queries): sin efecto
// ni setState, se suscribe al matchMedia y lee el valor en cada render.
export function useIsMobile(maxWidth = 599) {
  const query = `(max-width:${maxWidth}px)`

  const subscribe = useCallback((onChange) => {
    if (typeof window === 'undefined') return () => {}
    const mq = window.matchMedia(query)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  const getSnapshot = () =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
