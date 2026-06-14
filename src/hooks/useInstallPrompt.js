import { useEffect, useState } from 'react'

// Detecta si la app ya está instalada (corriendo como PWA standalone).
function estaInstalada() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

// Detecta iOS (Safari iOS no dispara beforeinstallprompt: se instala manual).
function esIOS() {
  const ua = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(ua)
}

/**
 * Hook para instalar la app como PWA.
 * - `instalable`: hay un prompt nativo disponible (Chrome/Edge/Android).
 * - `instalada`: ya está corriendo instalada.
 * - `esIOS`: en iPhone/iPad hay que mostrar instrucciones manuales.
 * - `instalar()`: dispara el diálogo nativo de instalación.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred]   = useState(null)
  const [instalada, setInstalada] = useState(estaInstalada())

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => {
      setInstalada(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const instalar = async () => {
    if (!deferred) return null
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setDeferred(null)
    return outcome
  }

  return {
    instalable: !!deferred,
    instalada,
    esIOS: esIOS(),
    instalar,
  }
}
