import { useState, useEffect } from 'react'

// Devuelve true cuando el viewport es de teléfono. Útil para renderizar
// tarjetas en vez de tablas (que no caben en pantalla angosta).
export function useIsMobile(maxWidth = 599) {
  const query = `(max-width:${maxWidth}px)`
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    setIsMobile(mq.matches)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return isMobile
}
